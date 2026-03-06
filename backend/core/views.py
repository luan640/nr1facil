from rest_framework import status
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.permissions import BasePermission
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.http import HttpResponse
import os
import uuid
import boto3
import math
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from urllib.request import urlopen

from .models import (
    CanalDenuncia,
    CampaignStatus,
    Campanha,
    CampanhaRespostaStep1,
    CampanhaRespostaStep2,
    CampanhaRespostaStep3,
    CampanhaRespostaStep4,
    CampanhaRespostaStep5,
    CampanhaRespostaStep6,
    CampanhaRespostaStep7,
    CampanhaRespostaStep8,
    CampanhaRespostaStep9,
    Cargo,
    CampanhaQuandoPreliminar,
    CampanhaRelatorioAnexo,
    ConsultoriaConfiguracao,
    ConsultoriaResponsavelTecnico,
    Empresa,
    FrequencyChoice,
    Ghe,
    MedidaScopeType,
    CampanhaPlanoAcao,
    PedidoAjuda,
    PedidoAjudaAtualizacao,
    RegistroHumor,
    Setor,
    User,
    UserType,
)
from .serializers import CanalDenunciaAtualizacaoCreateSerializer, CanalDenunciaListSerializer, CanalDenunciaPublicSerializer, CanalDenunciaStatusUpdateSerializer, CampanhaMedidaPreliminarSerializer, CampanhaPlanoAcaoSerializer, CampanhaQuandoPreliminarSerializer, CampanhaRelatorioAnexoSerializer, CampanhaSerializer, CampanhaStep1RespostaSerializer, CampanhaStep2RespostaSerializer, CampanhaStep3RespostaSerializer, CampanhaStep4RespostaSerializer, CampanhaStep5RespostaSerializer, CampanhaStep6RespostaSerializer, CampanhaStep7RespostaSerializer, CampanhaStep8RespostaSerializer, CampanhaStep9RespostaSerializer, CargoSerializer, ConsultoriaConfiguracaoSerializer, ConsultoriaResponsavelTecnicoSerializer, ConsultorSerializer, EmpresaSerializer, GheSerializer, LoginSerializer, PedidoAjudaAtualizacaoCreateSerializer, PedidoAjudaListSerializer, PedidoAjudaPublicSerializer, PedidoAjudaStatusUpdateSerializer, RegistroHumorPublicSerializer, SetorSerializer


FREQUENCY_SCORE_POSITIVE = {
    FrequencyChoice.NUNCA: 1,
    FrequencyChoice.RARAMENTE: 2,
    FrequencyChoice.AS_VEZES: 3,
    FrequencyChoice.FREQUENTEMENTE: 4,
    FrequencyChoice.SEMPRE: 5,
}
FREQUENCY_SCORE_NEGATIVE = {
    FrequencyChoice.NUNCA: 5,
    FrequencyChoice.RARAMENTE: 4,
    FrequencyChoice.AS_VEZES: 3,
    FrequencyChoice.FREQUENTEMENTE: 2,
    FrequencyChoice.SEMPRE: 1,
}

REPORT_STEP_DEFS = [
    {
        'step': 2,
        'key': 'step2',
        'domain': 'Demandas',
        'orientation': 'negative',
        'model': CampanhaRespostaStep2,
        'question_fields': ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'],
        'questions': [
            'As diferentes áreas do meu trabalho fazem exigências difíceis de conciliar entre si?',
            'Recebo prazos que considero impossíveis de cumprir?',
            'Meu trabalho exige que eu atue com nível muito alto de intensidade?',
            'Preciso abandonar ou adiar tarefas porque a quantidade de demandas é excessiva?',
            'Não consigo realizar pausas adequadas durante a jornada de trabalho?',
            'Sinto pressão para trabalhar por longos períodos ou fazer horas extras?',
            'Preciso executar minhas atividades em ritmo muito acelerado?',
            'As pausas previstas no trabalho são difíceis ou inviáveis de cumprir?',
        ],
    },
    {
        'step': 3,
        'key': 'step3',
        'domain': 'Controle',
        'orientation': 'positive',
        'model': CampanhaRespostaStep3,
        'question_fields': ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
        'questions': [
            'Tenho autonomia para escolher quando fazer uma pausa?',
            'Posso decidir o ritmo em que realizo meu trabalho?',
            'Tenho liberdade para definir como executo minhas atividades?',
            'Tenho autonomia para decidir quais tarefas realizo no trabalho?',
            'Possuo influência sobre a forma como desempenho minhas atividades?',
            'Meu horário de trabalho permite flexibilidade?',                
        ],
    },
    {
        'step': 4,
        'key': 'step4',
        'domain': 'Apoio da Gestão',
        'orientation': 'positive',
        'model': CampanhaRespostaStep4,
        'question_fields': ['q1', 'q2', 'q3', 'q4', 'q5'],
        'questions': [
            'Recebo informações e suporte adequados para desempenhar meu trabalho?',
            'Posso contar com meu supervisor direto quando enfrento dificuldades no trabalho?',
            'Consigo conversar com meu supervisor direto sobre situações que me incomodam no trabalho?',
            'Recebo apoio quando realizo atividades emocionalmente exigentes?',
            'Meu supervisor direto me oferece incentivo e encorajamento no trabalho?',
        ],
    },
    {
        'step': 5,
        'key': 'step5',
        'domain': 'Suporte dos Colegas',
        'orientation': 'positive',
        'model': CampanhaRespostaStep5,
        'question_fields': ['q1', 'q2', 'q3', 'q4'],
        'questions': [
            'Quando o trabalho se torna difícil, posso contar com a ajuda dos meus colegas?',
            'Recebo dos meus colegas o apoio necessário para realizar meu trabalho?',
            'Sou tratado com o respeito que mereço pelos meus colegas?',
            'Meus colegas estão dispostos a ouvir quando tenho problemas relacionados ao trabalho?',
        ],
    },
    {
        'step': 6,
        'key': 'step6',
        'domain': 'Relacionamentos',
        'orientation': 'negative',
        'model': CampanhaRespostaStep6,
        'question_fields': ['q1', 'q2', 'q3', 'q4'],
        'questions': [
            'Sinto que sou alvo de perseguição no ambiente de trabalho?',
            'Existem conflitos ou desentendimentos frequentes entre colegas?',
            'Sou tratado ou abordado de forma rude ou excessivamente dura?',
            'Os relacionamentos no ambiente de trabalho estão desgastados?',
        ],
    },
    {
        'step': 7,
        'key': 'step7',
        'domain': 'Clareza de Papel | Função',
        'orientation': 'positive',
        'model': CampanhaRespostaStep7,
        'question_fields': ['q1', 'q2', 'q3', 'q4', 'q5'],
        'questions': [
            'Eu entendo claramente o que é esperado de mim no trabalho?',
            'Sei como realizar minhas atividades de forma adequada?',
            'Tenho clareza sobre minhas funções e responsabilidades?',
            'Compreendo os objetivos e metas do meu departamento?',
            'Entendo como o meu trabalho contribui para os objetivos gerais da organização?',
        ],
    },
    {
        'step': 8,
        'key': 'step8',
        'domain': 'Gerenciamento de Mudanças',
        'orientation': 'positive',
        'model': CampanhaRespostaStep8,
        'question_fields': ['q1', 'q2', 'q3'],
        'questions': [
            'Tenho oportunidades suficientes para questionar os gestores sobre mudanças no trabalho?',
            'Os funcionários são consultados sobre mudanças que afetam o trabalho?',
            'Quando ocorrem mudanças no trabalho, compreendo claramente como elas serão aplicadas na prática?',
        ],
    },
]


def _report_zone(percent):
    if percent < 40:
        return {'key': 'red', 'label': 'Crítico'}
    if percent < 75:
        return {'key': 'yellow', 'label': 'Atenção'}
    return {'key': 'green', 'label': 'Bom'}


def _build_step_report(step_def, step1_ids):
    score_map = FREQUENCY_SCORE_NEGATIVE if step_def['orientation'] == 'negative' else FREQUENCY_SCORE_POSITIVE
    rows = list(step_def['model'].objects.filter(step1_id__in=step1_ids).values(*step_def['question_fields']))
    response_count = len(rows)
    question_reports = []
    domain_scores = []

    for idx, field in enumerate(step_def['question_fields']):
        scores = [score_map.get(row.get(field), 0) for row in rows if row.get(field) in score_map]
        avg_score = (sum(scores) / len(scores)) if scores else 0.0
        percent = (avg_score / 5.0) * 100.0 if avg_score else 0.0
        zone = _report_zone(percent)
        if scores:
            domain_scores.append(avg_score)
        question_reports.append(
            {
                'question': step_def['questions'][idx],
                'field': field,
                'response_count': len(scores),
                'avg_score': round(avg_score, 2),
                'percent': round(percent, 1),
                'zone': zone,
            }
        )

    domain_avg = (sum(domain_scores) / len(domain_scores)) if domain_scores else 0.0
    domain_percent = (domain_avg / 5.0) * 100.0 if domain_avg else 0.0
    return {
        'step': step_def['step'],
        'key': step_def['key'],
        'domain': step_def['domain'],
        'orientation': step_def['orientation'],
        'response_count': response_count,
        'avg_score': round(domain_avg, 2),
        'percent': round(domain_percent, 1),
        'zone': _report_zone(domain_percent),
        'questions': question_reports,
    }


def _build_report_bundle(campanha, empresa, step1_qs):
    step1_ids = list(step1_qs.values_list('id', flat=True))
    step_reports = [_build_step_report(step_def, step1_ids) for step_def in REPORT_STEP_DEFS]
    domain_reports = [
        {
            'step': item['step'],
            'key': item['key'],
            'domain': item['domain'],
            'response_count': item['response_count'],
            'avg_score': item['avg_score'],
            'percent': item['percent'],
            'zone': item['zone'],
        }
        for item in step_reports
    ]
    domain_scores = [item['avg_score'] for item in domain_reports if item['response_count'] > 0]
    company_score = (sum(domain_scores) / len(domain_scores)) if domain_scores else 0.0
    company_percent = (company_score / 5.0) * 100.0 if company_score else 0.0
    completed = step1_qs.count()
    sample_percent = (completed / empresa.employee_count * 100.0) if empresa.employee_count else 0.0

    comments_qs = CampanhaRespostaStep9.objects.filter(step1_id__in=step1_ids).select_related('step1').order_by('-created_at')[:20]
    comments = [
        {
            'id': c.id,
            'first_name': c.step1.first_name or '',
            'comment': c.comment or '',
            'created_at': c.created_at.isoformat(),
        }
        for c in comments_qs if (c.comment or '').strip()
    ]

    return {
        'summary': {
            'completed_responses': completed,
            'company_mean_percent': round(company_percent, 1),
            'company_mean_score': round(company_score, 2),
            'company_zone': _report_zone(company_percent),
            'sample_percent': round(sample_percent, 1),
            'sample_zone': _report_zone(sample_percent),
        },
        'domains': domain_reports,
        'steps': step_reports,
        'step9_comments': comments,
    }


def _build_dashboard_overview(user, empresa_id=None, date_from=None, date_to=None):
    from datetime import datetime, timezone as dt_timezone
    def _dt_from(d):
        return datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=dt_timezone.utc)
    def _dt_to(d):
        return datetime(d.year, d.month, d.day, 23, 59, 59, 999999, tzinfo=dt_timezone.utc)

    if user.is_superuser or user.user_type == UserType.ADM:
        empresas_qs = Empresa.objects.all()
        campanhas_qs = Campanha.objects.select_related('empresa').all()
    else:
        empresas_qs = Empresa.objects.filter(consultor=user)
        campanhas_qs = Campanha.objects.select_related('empresa').filter(empresa__consultor=user)

    available_empresas = list(empresas_qs.order_by('company_name').values('id', 'company_name'))
    if empresa_id:
        campanhas_qs = campanhas_qs.filter(empresa_id=empresa_id)
        empresas_qs = empresas_qs.filter(id=empresa_id)

    campanhas = list(campanhas_qs)
    campanha_ids = [c.id for c in campanhas]
    total_empresas = empresas_qs.count()
    total_employee_capacity = sum(int(e.employee_count or 0) for e in empresas_qs.only('employee_count'))
    step1_qs = CampanhaRespostaStep1.objects.filter(campanha_id__in=campanha_ids, is_completed=True) if campanha_ids else CampanhaRespostaStep1.objects.none()
    if date_from:
        step1_qs = step1_qs.filter(created_at__gte=_dt_from(date_from))
    if date_to:
        step1_qs = step1_qs.filter(created_at__lte=_dt_to(date_to))
    completed_count = step1_qs.count()
    questionarios_em_aberto = sum(1 for c in campanhas if c.status == CampaignStatus.ATIVO)
    relatorios_salvos = sum(1 for c in campanhas if c.status == CampaignStatus.ENCERRADO)
    comentarios_count = CampanhaRespostaStep9.objects.filter(step1__campanha_id__in=campanha_ids).exclude(comment='').count() if campanha_ids else 0

    step1_ids = list(step1_qs.values_list('id', flat=True))
    domain_reports = [_build_step_report(step_def, step1_ids) for step_def in REPORT_STEP_DEFS]

    from datetime import date
    today = date.today()
    months = []
    for i in range(5, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        months.append((year, month))

    trend_counts = {f'{y:04d}-{m:02d}': 0 for y, m in months}
    for row in step1_qs.values_list('created_at', flat=True):
        key = row.strftime('%Y-%m')
        if key in trend_counts:
            trend_counts[key] += 1
    trend = [{'label': f'{m:02d}/{y}', 'value': trend_counts[f'{y:04d}-{m:02d}']} for y, m in months]

    # ── Canal de Denúncias & Totem stats ──────────────────────────────
    empresa_ids = list(empresas_qs.values_list('id', flat=True))

    den_qs = CanalDenuncia.objects.filter(empresa_id__in=empresa_ids) if empresa_ids else CanalDenuncia.objects.none()
    if date_from:
        den_qs = den_qs.filter(created_at__gte=_dt_from(date_from))
    if date_to:
        den_qs = den_qs.filter(created_at__lte=_dt_to(date_to))
    total_denuncias = den_qs.count()

    STATUS_LABEL_MAP = {'ABERTA': 'Aberta', 'EM_ANALISE': 'Em análise', 'RESOLVIDA': 'Resolvida'}
    den_status_raw = {row['status']: row['count'] for row in den_qs.values('status').annotate(count=Count('id'))}
    den_por_status = [
        {'key': s, 'label': STATUS_LABEL_MAP[s], 'value': den_status_raw.get(s, 0)}
        for s in ['ABERTA', 'EM_ANALISE', 'RESOLVIDA']
    ]

    TIPO_LABEL_MAP = {
        'ASSEDIO_MORAL': 'Assédio moral', 'ASSEDIO_SEXUAL': 'Assédio sexual',
        'DISCRIMINACAO': 'Discriminação', 'VIOLENCIA_VERBAL': 'Viol. verbal',
        'VIOLENCIA_FISICA': 'Viol. física', 'FRAUDE': 'Fraude',
        'CORRUPCAO': 'Corrupção', 'DESVIO_CONDUTA': 'Desvio conduta',
        'CONFLITO_INTERESSE': 'Conflito interesse', 'OUTROS': 'Outros',
    }
    den_por_tipo = [
        {'label': TIPO_LABEL_MAP.get(row['tipo'], row['tipo']), 'value': row['count']}
        for row in den_qs.values('tipo').annotate(count=Count('id')).order_by('-count')[:8]
    ]

    den_por_ghe = [
        {'label': row['ghe__name'] or 'Sem GHE', 'value': row['count']}
        for row in den_qs.filter(ghe__isnull=False).values('ghe__name').annotate(count=Count('id')).order_by('-count')[:8]
    ]

    # Humor
    humor_qs = RegistroHumor.objects.filter(empresa_id__in=empresa_ids) if empresa_ids else RegistroHumor.objects.none()
    if date_from:
        humor_qs = humor_qs.filter(created_at__gte=_dt_from(date_from))
    if date_to:
        humor_qs = humor_qs.filter(created_at__lte=_dt_to(date_to))
    total_humor = humor_qs.count()

    HUMOR_LABEL_MAP = {
        'feliz': 'Feliz', 'motivado': 'Motivado', 'tranquilo': 'Tranquilo',
        'cansado': 'Cansado', 'estressado': 'Estressado', 'triste': 'Triste',
        'ansioso': 'Ansioso', 'sobrecarregado': 'Sobrecarregado',
    }
    humor_por_tipo = [
        {'key': row['humor'], 'label': HUMOR_LABEL_MAP.get(row['humor'], row['humor'].capitalize()), 'value': row['count']}
        for row in humor_qs.values('humor').annotate(count=Count('id')).order_by('-count')
    ]

    humor_trend_counts = {f'{y:04d}-{m:02d}': 0 for y, m in months}
    for row in humor_qs.values_list('created_at', flat=True):
        key = row.strftime('%Y-%m')
        if key in humor_trend_counts:
            humor_trend_counts[key] += 1
    humor_trend = [{'label': f'{m:02d}/{y}', 'value': humor_trend_counts[f'{y:04d}-{m:02d}']} for y, m in months]

    # Pedidos de ajuda
    pedido_qs = PedidoAjuda.objects.filter(empresa_id__in=empresa_ids) if empresa_ids else PedidoAjuda.objects.none()
    if date_from:
        pedido_qs = pedido_qs.filter(created_at__gte=_dt_from(date_from))
    if date_to:
        pedido_qs = pedido_qs.filter(created_at__lte=_dt_to(date_to))
    total_pedidos_ajuda = pedido_qs.count()

    return {
        'selected_empresa_id': empresa_id,
        'empresas': [{'id': e['id'], 'name': e['company_name']} for e in available_empresas],
        'summary_cards': [
            {'key': 'empresas', 'label': 'Total de Empresas', 'value': total_empresas, 'color': 'blue'},
            {'key': 'questionarios_abertos', 'label': 'Questionários em aberto', 'value': questionarios_em_aberto, 'color': 'green'},
            {'key': 'relatorios', 'label': 'Relatórios Salvos', 'value': relatorios_salvos, 'color': 'yellow'},
            {'key': 'avaliacoes', 'label': 'Avaliações Encontradas', 'value': completed_count, 'color': 'purple'},
            {'key': 'denuncias', 'label': 'Denúncias (comentários)', 'value': comentarios_count, 'color': 'red'},
        ],
        'domain_distribution': [
            {'key': r['key'], 'label': r['domain'], 'percent': r['percent'], 'score': r['avg_score'], 'zone': r['zone']}
            for r in domain_reports
        ],
        'history': {
            'labels': [t['label'] for t in trend],
            'values': [t['value'] for t in trend],
            'series_name': 'Avaliacoes Realizadas',
        },
        'canal_overview': {
            'total_denuncias': total_denuncias,
            'total_humor': total_humor,
            'total_pedidos_ajuda': total_pedidos_ajuda,
            'den_por_status': den_por_status,
            'den_por_tipo': den_por_tipo,
            'den_por_ghe': den_por_ghe,
            'humor_por_tipo': humor_por_tipo,
            'humor_trend': {
                'labels': [h['label'] for h in humor_trend],
                'values': [h['value'] for h in humor_trend],
            },
        },
    }


def _supabase_s3_client():
    if not settings.SUPABASE_STORAGE_ACCESS_KEY or not settings.SUPABASE_STORAGE_SECRET_KEY:
        raise RuntimeError('Credenciais do Supabase Storage S3 nao configuradas.')
    return boto3.client(
        's3',
        region_name=settings.SUPABASE_STORAGE_REGION,
        endpoint_url=settings.SUPABASE_STORAGE_S3_ENDPOINT,
        aws_access_key_id=settings.SUPABASE_STORAGE_ACCESS_KEY,
        aws_secret_access_key=settings.SUPABASE_STORAGE_SECRET_KEY,
    )


def _upload_relatorio_anexo_to_storage(campanha, file_obj):
    ext = os.path.splitext(file_obj.name or '')[1]
    key = f'campanhas/{campanha.id}/relatorio-anexos/{uuid.uuid4().hex}{ext}'
    content_type = getattr(file_obj, 'content_type', '') or 'application/octet-stream'
    client = _supabase_s3_client()
    client.upload_fileobj(
        Fileobj=file_obj,
        Bucket=settings.SUPABASE_STORAGE_BUCKET,
        Key=key,
        ExtraArgs={'ContentType': content_type},
    )
    public_url = f"{settings.SUPABASE_STORAGE_PUBLIC_BASE_URL}/{key}"
    return key, public_url, content_type


def _delete_relatorio_anexo_from_storage(file_key):
    client = _supabase_s3_client()
    client.delete_object(Bucket=settings.SUPABASE_STORAGE_BUCKET, Key=file_key)


_PLANOS_ACAO = {
    'step2': {
        'q1': [
            "Mapear e documentar os conflitos de demandas entre áreas, definindo prioridades claras e critérios de resolução.",
            "Implantar reuniões periódicas de alinhamento interdepartamental para coordenar exigências conflitantes.",
            "Capacitar lideranças em gestão de conflitos de demanda e em técnicas de negociação de prioridades.",
            "Criar comitê de gestão de demandas com representantes de cada área para arbitrar conflitos recorrentes.",
        ],
        'q2': [
            "Revisar a metodologia de definição de prazos, adotando estimativas realistas baseadas em capacidade de trabalho.",
            "Capacitar gestores em planejamento e em técnicas de estimativa de tempo para tarefas e projetos.",
            "Criar espaço formal para negociação de prazos entre colaboradores e lideranças antes da definição final.",
            "Monitorar indicadores de cumprimento de prazos e utilizar os dados para ajustar a distribuição de demandas.",
        ],
        'q3': [
            "Realizar análise de carga de trabalho por colaborador e redistribuir tarefas para menor intensidade.",
            "Implantar pausas regulares programadas na jornada e garantir que sejam respeitadas.",
            "Avaliar necessidade de contratação ou redistribuição de pessoal para equilibrar a intensidade do trabalho.",
            "Revisar processos de trabalho para identificar e eliminar etapas desnecessárias que elevam a intensidade.",
        ],
        'q4': [
            "Realizar diagnóstico de carga de trabalho por colaborador e ajustar a distribuição de demandas.",
            "Priorizar e eliminar tarefas de baixo valor agregado, reduzindo o volume total de demandas.",
            "Avaliar contratação de apoio, terceirização ou automação de atividades para aliviar sobrecarga.",
            "Implantar gestão visual (Kanban ou similar) para tornar visível a fila de trabalho e evitar acúmulo.",
        ],
        'q5': [
            "Formalizar política de pausas programadas, incluindo horários definidos e respaldo da liderança.",
            "Sensibilizar lideranças sobre a importância legal e ergonômica das pausas para saúde e produtividade.",
            "Monitorar cumprimento das pausas obrigatórias conforme NR-17 e acionar correções quando necessário.",
            "Adequar os espaços de descanso para torná-los confortáveis e acolhedores para as pausas durante o trabalho.",
        ],
        'q6': [
            "Monitorar sistematicamente banco de horas e horas extras, com alertas para excessos recorrentes.",
            "Sensibilizar gestores sobre o impacto negativo do excesso de horas extras na saúde e na produtividade.",
            "Revisar o dimensionamento de equipe para garantir que o volume de trabalho seja compatível com o horário normal.",
            "Estabelecer política clara de horas extras, com limites, critérios de autorização e contrapartidas adequadas.",
        ],
        'q7': [
            "Realizar mapeamento e otimização de processos para eliminar gargalos que impõem ritmo acelerado.",
            "Conduzir Análise Ergonômica do Trabalho (AET) para avaliar exigências de ritmo e propor melhorias.",
            "Redistribuir tarefas e revisar metas, tornando-as compatíveis com o ritmo saudável de trabalho.",
            "Capacitar lideranças em gestão humanizada, promovendo desempenho sustentável sem ritmo acelerado excessivo.",
        ],
        'q8': [
            "Rever a organização do trabalho para viabilizar a realização efetiva das pausas previstas.",
            "Capacitar supervisores sobre as exigências da NR-17 e as consequências do descumprimento das pausas.",
            "Implantar controle de pausas nas escalas de trabalho, garantindo cumprimento operacional.",
            "Adequar a demanda ao tempo disponível, eliminando excesso de tarefas que inviabilizam as pausas.",
        ],
    },
    'step3': {
        'q1': [
            "Flexibilizar os horários de pausa, permitindo que o colaborador escolha o melhor momento dentro da jornada.",
            "Capacitar lideranças em gestão com autonomia, reduzindo o controle excessivo sobre as pausas.",
            "Revisar rotinas organizacionais que impeçam ou dificultem a realização de pausas autônomas.",
            "Implantar modelo de trabalho por entregas, dando ao colaborador mais liberdade para gerir seu tempo.",
        ],
        'q2': [
            "Revisar o nível de controle sobre o ritmo de trabalho, identificando microgestão desnecessária.",
            "Implantar gestão por objetivos e resultados (OKR/MBO) em substituição ao controle de ritmo.",
            "Mapear gargalos externos que impõem ritmo acelerado ao colaborador e eliminá-los.",
            "Capacitar gestores em liderança delegativa e em confiança no desempenho da equipe.",
        ],
        'q3': [
            "Ampliar a margem de decisão dos colaboradores nos processos de trabalho, reduzindo padronização excessiva.",
            "Revisar práticas de microgestão e reduzir o controle sobre o como as atividades são realizadas.",
            "Capacitar equipes em autogestão e em técnicas de organização pessoal do trabalho.",
            "Implantar metodologias ágeis que aumentem a autonomia das equipes na execução de tarefas.",
        ],
        'q4': [
            "Revisar processos de priorização de tarefas, transferindo mais autonomia para o colaborador.",
            "Implantar gestão por resultados, focando no que deve ser entregue e não em como cada passo é feito.",
            "Ampliar a delegação de responsabilidades, desenvolvendo a capacidade decisória das equipes.",
            "Oferecer treinamento em gestão do próprio trabalho e em técnicas de priorização pessoal.",
        ],
        'q5': [
            "Criar canais formais para sugestões e melhorias de processos, valorizando a voz do colaborador.",
            "Envolver equipes na revisão e redesenho dos fluxos de trabalho que os afetam diretamente.",
            "Capacitar gestores em liderança participativa que incorpora a contribuição dos colaboradores.",
            "Implantar grupos de melhoria contínua com participação ativa dos colaboradores nas decisões.",
        ],
        'q6': [
            "Avaliar a possibilidade de implementação de horário flexível ou banco de horas conforme perfil da função.",
            "Mapear funções com potencial de flexibilidade de horário e criar projeto-piloto de flextime.",
            "Sensibilizar gestores sobre os benefícios do trabalho flexível para engajamento e qualidade de vida.",
            "Criar política formal de flexibilidade de horário, com regras claras e critérios por cargo e área.",
        ],
    },
    'step4': {
        'q1': [
            "Melhorar o fluxo de comunicação interna, garantindo que informações essenciais cheguem a tempo a todos.",
            "Criar base de conhecimento centralizada e acessível com procedimentos, orientações e materiais de apoio.",
            "Capacitar líderes em comunicação clara e assertiva para suporte efetivo às equipes.",
            "Estabelecer rotinas regulares de briefing de equipe para garantir alinhamento e suporte contínuo.",
        ],
        'q2': [
            "Capacitar líderes em gestão de pessoas, desenvolvendo habilidades de suporte e apoio em situações difíceis.",
            "Implantar reuniões regulares de acompanhamento individual (one-on-one) entre líder e colaborador.",
            "Criar política formal de portas abertas, incentivando colaboradores a buscar a liderança quando necessário.",
            "Treinar lideranças em escuta ativa e em técnicas de apoio emocional no contexto de trabalho.",
        ],
        'q3': [
            "Promover cultura de segurança psicológica, onde colaboradores se sintam seguros para dialogar sobre problemas.",
            "Capacitar líderes em escuta ativa, empatia e em técnicas de feedback construtivo.",
            "Criar fóruns regulares de diálogo aberto entre equipes e lideranças para tratar situações incômodas.",
            "Implantar pesquisa de clima periódica e compartilhar ações derivadas com toda a equipe.",
        ],
        'q4': [
            "Implantar programa de apoio psicossocial, com acesso a profissionais capacitados para suporte emocional.",
            "Capacitar líderes a identificar sinais de sobrecarga emocional e oferecer apoio preventivo às equipes.",
            "Criar grupos de suporte entre pares para troca de experiências em atividades emocionalmente exigentes.",
            "Oferecer acesso a acompanhamento psicológico como benefício corporativo para colaboradores.",
        ],
        'q5': [
            "Capacitar líderes em técnicas de reconhecimento, feedback positivo e incentivo ao desenvolvimento.",
            "Implantar programa formal de reconhecimento que valorize conquistas individuais e coletivas.",
            "Criar cultura de valorização de conquistas com rituais regulares de celebração de resultados.",
            "Desenvolver competências de liderança motivacional por meio de treinamentos e coaching.",
        ],
    },
    'step5': {
        'q1': [
            "Promover cultura de colaboração com atividades e rituais de equipe que incentivem a ajuda mútua.",
            "Implantar programas de mentoria entre pares, conectando colaboradores experientes a novos membros.",
            "Criar dinâmicas regulares de integração de equipe para fortalecer vínculos e disposição de apoio.",
            "Capacitar equipes em comunicação colaborativa e em práticas de trabalho conjunto eficaz.",
        ],
        'q2': [
            "Promover gestão do conhecimento compartilhado, criando espaços para troca de saberes entre colegas.",
            "Criar rituais de cooperação (reuniões de apoio, revisões em par) que estimulem o suporte mútuo.",
            "Mapear gargalos de colaboração entre equipes e eliminar barreiras organizacionais à cooperação.",
            "Estabelecer indicadores de trabalho colaborativo e reconhecer equipes pelo desempenho coletivo.",
        ],
        'q3': [
            "Implantar código de conduta e convivência, com regras claras de respeito mútuo no ambiente de trabalho.",
            "Promover treinamento em respeito, diversidade e inclusão para todos os colaboradores.",
            "Criar canal seguro e sigiloso para relato de comportamentos inadequados entre colegas.",
            "Desenvolver programa de cultura organizacional positiva com foco em relações respeitosas.",
        ],
        'q4': [
            "Criar espaços formais de escuta entre pares, como rodas de conversa e grupos de apoio.",
            "Promover treinamento em comunicação empática e não violenta para toda a equipe.",
            "Implementar cultura psicologicamente segura onde é natural e esperado pedir ajuda aos colegas.",
            "Desenvolver competências de inteligência emocional nas equipes por meio de treinamentos e vivências.",
        ],
    },
    'step6': {
        'q1': [
            "Implementar canal de denúncias seguro, sigiloso e acessível para relatos de perseguição e assédio.",
            "Capacitar lideranças em prevenção ao assédio moral e em condução de investigações internas.",
            "Investigar e tratar com rigor todos os casos de perseguição relatados, com consequências claras.",
            "Promover política formal de tolerância zero ao assédio, comunicada a todos os colaboradores.",
        ],
        'q2': [
            "Implantar processo estruturado de mediação de conflitos com apoio de profissional qualificado.",
            "Capacitar lideranças em gestão e resolução de conflitos interpessoais no ambiente de trabalho.",
            "Promover dinâmicas de integração e de resolução coletiva para prevenir e tratar conflitos.",
            "Mapear causas recorrentes dos conflitos e tratar as origens estruturais e organizacionais.",
        ],
        'q3': [
            "Implantar código de conduta com regras claras e sanções proporcionais para comportamentos rudes.",
            "Capacitar gestores e colaboradores em comunicação não violenta e em relações interpessoais saudáveis.",
            "Criar mecanismo seguro de relato de condutas inadequadas com apuração transparente.",
            "Promover campanha interna de cultura de respeito, reforçando valores e comportamentos esperados.",
        ],
        'q4': [
            "Promover atividades de integração e fortalecimento de equipe para restaurar vínculos desgastados.",
            "Implantar pesquisa de clima periódica e criar ciclos de feedback para acompanhar a evolução.",
            "Contratar facilitação externa de dinâmicas de grupo para apoio em equipes com conflitos estabelecidos.",
            "Revisar carga de trabalho e outros fatores geradores de estresse que contribuem para o desgaste relacional.",
        ],
    },
    'step7': {
        'q1': [
            "Revisar, atualizar e comunicar formalmente as descrições de cargo a todos os colaboradores.",
            "Realizar reuniões regulares de alinhamento de expectativas entre líderes e suas equipes.",
            "Implantar sistema de gestão por objetivos (OKR ou MBO) para tornar expectativas mensuráveis e claras.",
            "Capacitar líderes em comunicação clara de metas, papéis e expectativas de desempenho.",
        ],
        'q2': [
            "Criar manuais e procedimentos operacionais claros e acessíveis para guiar a execução das atividades.",
            "Implantar programa estruturado de integração e onboarding com foco em capacitação prática.",
            "Oferecer treinamentos técnicos específicos para as atividades de cada função.",
            "Criar sistema de mentoria que conecte colaboradores mais experientes a quem precisa de orientação.",
        ],
        'q3': [
            "Revisar e distribuir formalmente descrições de cargo atualizadas para todos os colaboradores.",
            "Criar mapa visual de responsabilidades por função e torná-lo acessível a toda a equipe.",
            "Realizar conversas individuais de alinhamento entre líderes e cada membro da equipe.",
            "Implantar avaliação de desempenho com ciclos regulares de feedback sobre papéis e responsabilidades.",
        ],
        'q4': [
            "Realizar reuniões de desdobramento estratégico para comunicar objetivos departamentais à equipe.",
            "Tornar metas e objetivos do departamento visíveis por meio de painéis ou comunicação recorrente.",
            "Capacitar líderes em comunicação estratégica para conectar o trabalho da equipe aos objetivos maiores.",
            "Implantar indicadores de desempenho departamental compartilhados e acompanhados em equipe.",
        ],
        'q5': [
            "Promover comunicação regular sobre a estratégia organizacional e como cada área contribui para ela.",
            "Criar narrativa de propósito que conecte as funções individuais aos objetivos gerais da organização.",
            "Implantar reuniões amplas (town hall) com a liderança sênior para comunicação de estratégia e resultados.",
            "Desenvolver programa de integração estratégica que mostre a cada colaborador o impacto do seu trabalho.",
        ],
    },
    'step8': {
        'q1': [
            "Criar fóruns formais de perguntas e respostas durante processos de mudança, com lideranças disponíveis.",
            "Capacitar líderes em comunicação bidirecional, incentivando e respondendo questões da equipe.",
            "Implantar canal digital (FAQ, fórum online) para registro e resposta de perguntas sobre mudanças.",
            "Treinar gestores em gestão transparente de mudanças, compartilhando o máximo de informações possível.",
        ],
        'q2': [
            "Implantar processo participativo de gestão de mudanças, envolvendo colaboradores na concepção das soluções.",
            "Criar comitês ou grupos representativos de colaboradores para consulta antes de decisões de mudança.",
            "Realizar consultas formais com as equipes afetadas antes de implementar mudanças significativas.",
            "Desenvolver cultura de co-construção onde mudanças são projetadas com as pessoas, não apenas para elas.",
        ],
        'q3': [
            "Melhorar a comunicação de mudanças com planos detalhados, exemplos práticos e cronogramas claros.",
            "Criar materiais explicativos (guias, tutoriais, FAQ) sobre como cada mudança será aplicada na prática.",
            "Oferecer treinamentos e capacitações antes da implantação das mudanças para preparar a equipe.",
            "Designar ponto focal por equipe para esclarecer dúvidas e apoiar a transição durante as mudanças.",
        ],
    },
}


def _draw_pdf_cover_page(c, campanha, empresa_name):
    width, height = A4
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 18)
    c.drawCentredString(width / 2, height / 2, 'Relatório de Fatores de Risco Psicossociais')
    c.showPage()


def _draw_pdf_summary_page(c):
    width, height = A4
    margin_x = 20 * mm
    y = height - 34 * mm

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    c.setFont('Helvetica-Bold', 11)
    c.setFillColor(colors.HexColor('#111827'))
    c.drawString(margin_x, y, 'SUMÁRIO')
    y -= 10 * mm

    items = [
        'IDENTIFICAÇÃO',
        'OBJETIVO',
        'METODOLOGIA',
        'IMPORTÂNCIA DA PARTICIPAÇÃO DOS TRABALHADORES',
        'RESULTADOS GERAIS',
        'CONCLUSÕES E RECOMENDAÇÕES PRELIMINARES',
        'LIMITAÇÕES',
        'RESPONSABILIDADES',
        'ANEXOS',
    ]
    blue = colors.HexColor('#14532d')

    for i, text in enumerate(items, start=1):
        c.setFillColor(blue)
        c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(margin_x + 2, y - 0.6, str(i))

        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica', 9)
        c.drawString(margin_x + 8 * mm, y - 0.2, text)
        y -= 6.5 * mm

    c.showPage()


def _draw_pdf_general_results_page(c, campanha, empresa, report_data):
    width, height = A4
    margin_x = 18 * mm
    y = height - 18 * mm
    summary = report_data.get('overall', {}).get('summary', {})
    domains = report_data.get('overall', {}).get('domains', [])
    blue = colors.HexColor('#14532d')

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.setFillColor(blue)
    c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(margin_x + 2, y - 0.6, '5')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 10)
    c.drawString(margin_x + 8 * mm, y - 0.5, 'RESULTADOS GERAIS')
    c.setStrokeColor(blue)
    c.setLineWidth(1)
    c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
    y -= 12 * mm

    # Top summary split block
    top_x = margin_x
    top_w = width - 2 * margin_x
    top_h = 24 * mm
    c.setStrokeColor(colors.HexColor('#d1d5db'))
    c.line(top_x + top_w / 2, y, top_x + top_w / 2, y - top_h)

    company_pct = float(summary.get('company_mean_percent', 0) or 0)
    company_score = float(summary.get('company_mean_score', 0) or 0)
    company_zone = (summary.get('company_zone') or {}).get('label', 'Critico')
    sample_pct = float(summary.get('sample_percent', 0) or 0)
    completed = int(summary.get('completed_responses', 0) or 0)
    zone_color_company = colors.HexColor('#d97706') if company_pct < 75 else colors.HexColor('#16a34a')
    zone_color_sample = colors.HexColor('#ef4444') if sample_pct < 40 else colors.HexColor('#d97706') if sample_pct < 75 else colors.HexColor('#16a34a')

    c.setFont('Helvetica', 7)
    c.setFillColor(colors.HexColor('#6b7280'))
    c.drawCentredString(top_x + top_w * 0.25, y - 5 * mm, 'Média geral da empresa')
    c.setFillColor(zone_color_company)
    c.setFont('Helvetica-Bold', 16)
    c.drawCentredString(top_x + top_w * 0.25, y - 13 * mm, f'{company_pct:.1f}%')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 9)
    c.drawCentredString(top_x + top_w * 0.25, y - 18 * mm, f'{company_score:.1f} {company_zone}')

    c.setFont('Helvetica', 7)
    c.setFillColor(colors.HexColor('#6b7280'))
    c.drawCentredString(top_x + top_w * 0.75, y - 4.5 * mm, 'Amostra de Respostas')
    c.drawCentredString(top_x + top_w * 0.75, y - 8.8 * mm, f'{completed} de {empresa.employee_count} funcionarios responderam')
    c.setFillColor(zone_color_sample)
    c.setFont('Helvetica-Bold', 16)
    c.drawCentredString(top_x + top_w * 0.75, y - 16 * mm, f'{sample_pct:.1f}%')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 8)
    c.drawCentredString(top_x + top_w * 0.75, y - 21 * mm, str((summary.get('sample_zone') or {}).get('label', 'Critico')))
    y -= (top_h + 7 * mm)

    def _zone_color(zone_key):
        if zone_key == 'green':
            return colors.HexColor('#22c55e')
        if zone_key == 'yellow':
            return colors.HexColor('#f59e0b')
        return colors.HexColor('#ef4444')

    # Domain box (radar + list)
    box_x = margin_x
    box_w = width - 2 * margin_x
    box_h = 92 * mm
    c.setFont('Helvetica', 8)
    c.setFillColor(colors.HexColor('#6b7280'))
    c.drawString(box_x + 4 * mm, y - 5 * mm, 'Média por domínio')

    # Radar area (left)
    radar_left = box_x + 12 * mm
    radar_top = y - 10 * mm
    radar_w = 92 * mm
    radar_h = box_h - 16 * mm
    cx = radar_left + (radar_w * 0.50)
    cy = (radar_top - radar_h) + (radar_h * 0.52)
    radius = min(radar_w, radar_h) * 0.34
    n_domains = max(1, len(domains))

    def _radar_point(idx, pct=100.0, r_extra=0):
        angle = (math.pi / 2.0) - ((2.0 * math.pi * idx) / n_domains)
        rr = (max(0.0, min(100.0, float(pct))) / 100.0) * radius + r_extra
        return (cx + (math.cos(angle) * rr), cy + (math.sin(angle) * rr))

    def _draw_poly(points, stroke=1, fill=0):
        p = c.beginPath()
        first = True
        for px, py in points:
            if first:
                p.moveTo(px, py)
                first = False
            else:
                p.lineTo(px, py)
        p.close()
        c.drawPath(p, stroke=stroke, fill=fill)

    # Grid rings
    for lvl in (20, 40, 60, 80, 100):
        c.setStrokeColor(colors.HexColor('#cbd5e1'))
        c.setLineWidth(0.7)
        c.setDash(2, 2) if lvl < 100 else c.setDash()
        _draw_poly([_radar_point(i, lvl) for i in range(n_domains)], stroke=1, fill=0)
    c.setDash()

    # Axes
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(0.7)
    for i in range(n_domains):
        px, py = _radar_point(i, 100)
        c.line(cx, cy, px, py)

    # Data polygon
    data_points = []
    for i, d in enumerate(domains):
        pct = max(0, min(100, float(d.get('percent', 0) or 0)))
        data_points.append(_radar_point(i, pct))
    if data_points:
        c.setStrokeColor(colors.HexColor('#60a5fa'))
        c.setLineWidth(1.6)
        _draw_poly(data_points, stroke=1, fill=0)

    # Data points
    for i, d in enumerate(domains):
        pct = max(0, min(100, float(d.get('percent', 0) or 0)))
        px, py = _radar_point(i, pct)
        c.setFillColor(_zone_color((d.get('zone') or {}).get('key', 'red')))
        c.setStrokeColor(colors.white)
        c.setLineWidth(1)
        c.circle(px, py, 2.2, stroke=1, fill=1)

    # Tick labels (top axis)
    c.setFont('Helvetica', 6.5)
    c.setFillColor(colors.HexColor('#6b7280'))
    for lvl in (20, 40, 60, 80, 100):
        _, py = _radar_point(0, lvl)
        c.drawString(cx + 3, py - 1.5, f'{lvl}%')

    # Domain labels around radar
    c.setFont('Helvetica', 6.8)
    c.setFillColor(colors.HexColor('#334155'))
    for i, d in enumerate(domains):
        label = str(d.get('domain', '') or '')
        lx, ly = _radar_point(i, 100, 7 * mm)
        if lx > cx + 6:
            c.drawString(lx, ly - 2, label)
        elif lx < cx - 6:
            c.drawRightString(lx, ly - 2, label)
        else:
            c.drawCentredString(lx, ly - 2, label)

    # Legend/list area (right)
    list_x = box_x + 110 * mm
    list_right = box_x + box_w - 4 * mm
    row_h = 9 * mm
    y_rows = y - 13 * mm
    c.setFont('Helvetica-Bold', 7.5)
    c.setFillColor(colors.HexColor('#475569'))
    # c.drawString(list_x, y_rows, '')
    y_rows -= 5.5 * mm
    for d in domains:
        zone_key = (d.get('zone') or {}).get('key', 'red')
        c.setFillColor(_zone_color(zone_key))
        c.circle(list_x + 2, y_rows + 1, 1.5, stroke=0, fill=1)

        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica-Bold', 7.1)
        c.drawString(list_x + 6, y_rows, str(d.get('domain', '') or ''))

        c.setFont('Helvetica', 6.8)
        c.setFillColor(colors.HexColor('#334155'))
        c.drawRightString(list_right, y_rows, f"{float(d.get('percent', 0) or 0):.1f}% | {float(d.get('avg_score', 0) or 0):.1f}")
        y_rows -= row_h
    y -= (box_h + 6 * mm)

    # Zone legend
    zone_y = y - 12 * mm
    zone_total_w = width - 2 * margin_x
    col_w = zone_total_w / 3
    zone_specs = [
        ('Zona Vermelha (0% a 39,99%)', 'Risco elevado: ação corretiva imediata', colors.HexColor('#ef4444')),
        ('Zona Amarela (40% a 74,99%)', 'Atenção: possível risco psicossocial;', colors.HexColor('#f59e0b')),
        ('Zona Verde (75% a 100%)', 'Boa percepção: manutenção recomendada.', colors.HexColor('#22c55e')),
    ]
    for idx, (title, text, bg) in enumerate(zone_specs):
        x = margin_x + (idx * col_w)
        c.setFillColor(bg)
        c.rect(x, zone_y, col_w, 11 * mm, stroke=1, fill=1)
        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica-Bold', 6.4)
        c.drawString(x + 2 * mm, zone_y + 7.3 * mm, title)
        c.setFont('Helvetica', 6)
        c.drawString(x + 2 * mm, zone_y + 3.2 * mm, text)

    c.showPage()


def _draw_pdf_domain_detail_pages(c, report_data):
    width, height = A4
    margin_x = 15 * mm
    overall = report_data.get('overall', {}) or {}
    overall_steps = overall.get('steps', []) or []
    per_ref = report_data.get('per_ref', []) or []
    ref_label = ((report_data.get('filters') or {}).get('ref_label') or 'Setor/GHE')

    def zone_fill(zone_key):
        if zone_key == 'green':
            return colors.HexColor('#22c55e')
        if zone_key == 'yellow':
            return colors.HexColor('#facc15')
        return colors.HexColor('#ef4444')

    def zone_label(zone):
        return str((zone or {}).get('label', '')).upper() or 'CRITICO'

    def draw_legend(y):
        items = [
            (colors.HexColor('#22c55e'), 'NUNCA - POSITIVO | BOM'),
            (colors.HexColor('#facc15'), 'As vezes - ATENÇÃO'),
            (colors.HexColor('#ef4444'), 'SEMPRE - NEGATIVO | RUIM'),
        ]
        x = margin_x + 16 * mm
        c.setFont('Helvetica', 7)
        for box_color, text in items:
            c.setFillColor(box_color)
            c.roundRect(x, y - 2.3, 3.3 * mm, 3.3 * mm, 0.6, stroke=0, fill=1)
            x += 4.8 * mm
            c.setFillColor(colors.HexColor('#6b7280'))
            c.drawString(x, y, text)
            x += c.stringWidth(text, 'Helvetica', 7) + 8 * mm

    def draw_legend(y):
        items = [
            (colors.HexColor('#22c55e'), 'NUNCA - POSITIVO | BOM'),
            (colors.HexColor('#facc15'), 'As vezes - ATENÇÃO'),
            (colors.HexColor('#ef4444'), 'SEMPRE - NEGATIVO | RUIM'),
        ]
        x = margin_x + 18 * mm
        c.setFont('Helvetica', 7)
        for box_color, text in items:
            c.setFillColor(box_color)
            c.roundRect(x, y - 2.2, 3.4 * mm, 3.4 * mm, 0.6, stroke=0, fill=1)
            x += 5 * mm
            c.setFillColor(colors.HexColor('#6b7280'))
            c.drawString(x, y, text)
            x += c.stringWidth(text, 'Helvetica', 7) + 8 * mm

    def bar_row(y, label, percent, score, zone, x_label, x_bar, x_val, track_w, label_font=7):
        def wrap_label(text, max_w):
            text = str(text or '').strip()
            if not text:
                return ['']
            lines = []
            current = ''
            for word in text.split():
                candidate = f'{current} {word}'.strip()
                if c.stringWidth(candidate, 'Helvetica', label_font) <= max_w:
                    current = candidate
                else:
                    if current:
                        lines.append(current)
                    current = word
            if current:
                lines.append(current)
            return lines or ['']

        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica', label_font)
        label_max_w = max(20, x_bar - x_label - (3 * mm))
        label_lines = wrap_label(label, label_max_w)
        line_step = max(label_font + 2, 8)
        for idx, line in enumerate(label_lines):
            c.drawString(x_label, y - (idx * line_step), line)

        # Keep the bar aligned to the first line and expand row height when label wraps.
        bar_y = y - 3
        c.setStrokeColor(colors.HexColor('#d1d5db'))
        c.setFillColor(colors.HexColor('#eef2f7'))
        c.roundRect(x_bar, bar_y, track_w, 5 * mm, 2, stroke=1, fill=1)
        pct = max(0, min(100, float(percent or 0)))
        zkey = (zone or {}).get('key', 'red')
        c.setFillColor(zone_fill(zkey))
        c.roundRect(x_bar, bar_y, track_w * (pct / 100.0), 5 * mm, 2, stroke=0, fill=1)
        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica-Bold', 7)
        if pct > 10:
            c.drawString(x_bar + 2 * mm, y - 0.2, f'{pct:.1f}% | {zone_label(zone)}')
        c.drawRightString(x_val, y, f'{float(score or 0):.1f}')
        c.setFont('Helvetica', 5.5)
        c.setFillColor(colors.HexColor('#6b7280'))
        c.drawRightString(x_val, y - 4.2 * mm, 'SCORE')
        wrapped_extra = max(0, len(label_lines) - 1) * line_step
        return max(11 * mm, (5 * mm) + wrapped_extra + (2 * mm))

    for step in overall_steps:
        step_title = str(step.get('domain', '')).upper()
        q_track_w = 78 * mm
        q_x_label = margin_x
        q_x_bar = margin_x + 86 * mm
        q_x_val = width - margin_x
        x_bar = margin_x + 48 * mm
        track_w = 98 * mm
        x_val = width - margin_x

        def new_step_page(_continuation=False):
            c.setFillColor(colors.white)
            c.rect(0, 0, width, height, stroke=0, fill=1)
            y_local = height - 20 * mm
            c.setFillColor(colors.HexColor('#111827'))
            c.setFont('Helvetica-Bold', 12)
            c.drawCentredString(width / 2, y_local, 'Gráfico dos resultados')
            y_local -= 8 * mm
            c.setFont('Helvetica-Bold', 18)
            c.drawCentredString(width / 2, y_local, step_title[:90])
            return y_local - 10 * mm

        def ensure_space(y_local, needed_mm=18):
            if y_local < (needed_mm * mm):
                c.showPage()
                return new_step_page(True)
            return y_local

        y = new_step_page(False)

        # Step summary (same page start of step)
        c.setFont('Helvetica-Bold', 8)
        c.setFillColor(colors.HexColor('#111827'))
        c.drawString(margin_x + 10 * mm, y, 'Média Geral')
        bar_row(y, '', step.get('percent', 0), step.get('avg_score', 0), step.get('zone', {}), x_bar, x_bar, x_val, track_w)
        y -= 11 * mm
        c.setStrokeColor(colors.HexColor('#e5e7eb'))
        c.line(margin_x, y, width - margin_x, y)
        y -= 9 * mm

        c.setFont('Helvetica-Bold', 9)
        c.setFillColor(colors.HexColor('#111827'))
        c.drawString(margin_x + 10 * mm, y, f'Análise por {ref_label}')
        y -= 7 * mm

        step_refs = []
        for ref_item in per_ref:
            ref_step = next((s for s in (ref_item.get('steps') or []) if s.get('key') == step.get('key')), None)
            if ref_step:
                step_refs.append((ref_item, ref_step))
        for ref_item, ref_step in step_refs:
            y = ensure_space(y, 28)
            label = ref_item.get('ref', {}).get('name', '-')
            bar_row(y, label, ref_step.get('percent', 0), ref_step.get('avg_score', 0), ref_step.get('zone', {}), margin_x + 10 * mm, x_bar, x_val, track_w)
            y -= 9 * mm

        y -= 3 * mm
        c.setStrokeColor(colors.HexColor('#e5e7eb'))
        c.line(margin_x, y, width - margin_x, y)
        y -= 10 * mm
        c.setFont('Helvetica-Bold', 16)
        c.setFillColor(colors.HexColor('#111827'))
        c.drawCentredString(width / 2, y, f"{step_title} (Análise Geral)")
        y -= 8 * mm
        draw_legend(y)
        y -= 8 * mm

        for q in (step.get('questions') or []):
            y = ensure_space(y, 24)
            row_h = bar_row(y, q.get('question', ''), q.get('percent', 0), q.get('avg_score', 0), q.get('zone', {}), q_x_label, q_x_bar, q_x_val, q_track_w, label_font=7.4)
            y -= row_h

        # Per-ref analyses continue in the same step flow; only break page for overflow
        for ref_item, ref_step in step_refs:
            y = ensure_space(y, 32)
            y -= 2 * mm
            c.setStrokeColor(colors.HexColor('#e5e7eb'))
            c.line(margin_x, y, width - margin_x, y)
            y -= 9 * mm
            title = f"{step_title} ({ref_label}: {ref_item.get('ref', {}).get('name', '-')})"
            c.setFillColor(colors.HexColor('#111827'))
            c.setFont('Helvetica-Bold', 14)
            c.drawCentredString(width / 2, y, title[:90])
            y -= 8 * mm
            draw_legend(y)
            y -= 8 * mm
            for q in (ref_step.get('questions') or []):
                y = ensure_space(y, 24)
                row_h = bar_row(y, q.get('question', ''), q.get('percent', 0), q.get('avg_score', 0), q.get('zone', {}), q_x_label, q_x_bar, q_x_val, q_track_w, label_font=7.4)
                y -= row_h

        c.showPage()


def _draw_pdf_conclusoes_recomendacoes_pages(c, report_data):
    width, height = A4
    margin_x = 15 * mm
    blue = colors.HexColor('#14532d')
    measures = report_data.get('preliminary_measures', []) or []
    whens = report_data.get('preliminary_whens', []) or []
    overall_steps = (report_data.get('overall') or {}).get('steps', []) or []
    per_ref = report_data.get('per_ref', []) or []
    ref_label = ((report_data.get('filters') or {}).get('ref_label') or 'Setor/GHE')
    review_months = int(report_data.get('review_recommendation_months') or 3)
    empresa_name = ((report_data.get('empresa') or {}).get('name') or 'Empresa')

    # Lookup de score por pergunta/escopo para imprimir a pontuacao no PDF.
    score_lookup = {}
    step_domain_lookup = {}
    for step in overall_steps:
        step_domain_lookup[int(step.get('step', 0))] = step.get('domain', f"Step {step.get('step')}")
        for q in (step.get('questions') or []):
            key = (int(step.get('step', 0)), str(q.get('field', '')), 'GERAL', '', '')
            score_lookup[key] = {
                'score': q.get('avg_score', 0),
                'percent': q.get('percent', 0),
                'question': q.get('question', ''),
                'scope_label': 'Análise geral',
            }
    eval_type = ((report_data.get('filters') or {}).get('evaluation_type') or '')
    for ref_item in per_ref:
        ref = ref_item.get('ref', {}) or {}
        for step in (ref_item.get('steps') or []):
            for q in (step.get('questions') or []):
                scope_type = 'SETOR' if eval_type == 'SETOR' else 'GHE'
                key = (
                    int(step.get('step', 0)),
                    str(q.get('field', '')),
                    scope_type,
                    str(ref.get('id') if scope_type == 'SETOR' else ''),
                    str(ref.get('id') if scope_type == 'GHE' else ''),
                )
                score_lookup[key] = {
                    'score': q.get('avg_score', 0),
                    'percent': q.get('percent', 0),
                    'question': q.get('question', ''),
                    'scope_label': f"{ref_label}: {ref.get('name', '-')}",
                }

    whens_lookup = {}
    for w in whens:
        key = (
            int(w.get('step_number', 0)),
            str(w.get('question_field', '')),
            str(w.get('scope_type', 'GERAL')),
            str(w.get('setor') or ''),
            str(w.get('ghe') or ''),
        )
        whens_lookup[key] = w

    def format_when_range(months):
        vals = []
        for item in months or []:
            try:
                mm, yyyy = str(item).split('/')
                vals.append((int(yyyy), int(mm), f'{int(mm):02d}/{int(yyyy):04d}'))
            except Exception:
                continue
        vals.sort()
        if not vals:
            return ''
        if len(vals) == 1:
            return vals[0][2]
        return f'{vals[0][2]} - {vals[-1][2]}'

    def format_when_months_pt(months):
        labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        vals = []
        for item in months or []:
            try:
                mm, yyyy = str(item).split('/')
                vals.append((int(yyyy), int(mm)))
            except Exception:
                continue
        vals.sort()
        return ', '.join([f"{labels[m-1]}/{y}" for y, m in vals if 1 <= m <= 12])

    def new_page():
        c.setFillColor(colors.white)
        c.rect(0, 0, width, height, stroke=0, fill=1)
        y = height - 18 * mm
        c.setFillColor(blue)
        c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(margin_x + 2, y - 0.6, '6')
        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica-Bold', 9)
        c.drawString(margin_x + 8 * mm, y - 0.5, 'CONCLUSÕES E RECOMENDAÇÕES PRELIMINARES')
        c.setStrokeColor(blue)
        c.setLineWidth(1)
        c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
        return y - 11 * mm

    def draw_wrapped_text(x, y, text, font='Helvetica', size=8.8, max_width=None, leading=11.5):
        if max_width is None:
            max_width = width - x - margin_x
        c.setFont(font, size)
        c.setFillColor(colors.HexColor('#111827'))
        words = str(text or '').split()
        line = ''
        lines = []
        for word in words:
            test = f'{line} {word}'.strip()
            if c.stringWidth(test, font, size) <= max_width:
                line = test
            else:
                if line:
                    lines.append(line)
                line = word
        if line:
            lines.append(line)
        if not lines:
            lines = ['-']
        for i, ln in enumerate(lines):
            c.drawString(x, y - (i * leading), ln)
        return y - (len(lines) * leading)

    y = new_page()

    # Intro bullets (espelho do anexo)
    intro = [
        'Priorizar os domínios que apresentem maior nível de risco.',
        f'Realizar nova avaliação em até {review_months} meses.',
        'Implementar ações de capacitação sobre saúde mental e fatores psicossociais.',
        'Quando aplicável, conduzir Análise Ergonômica do Trabalho (AET) detalhada, conforme a NR-17.',
    ]
    c.setFont('Helvetica', 8.8)
    c.setFillColor(colors.HexColor('#111827'))
    for line in intro:
        c.drawString(margin_x + 2 * mm, y, f'-  {line}')
        y -= 5.2 * mm

    y -= 2 * mm
    c.setFillColor(colors.HexColor('#9a3412'))
    c.setFont('Helvetica-Bold', 8)
    c.drawString(margin_x, y, 'Plano de Ação Recomendado')
    y -= 8 * mm

    planos_acao = report_data.get('planos_acao', []) or []

    if not measures and not planos_acao:
        c.showPage()
        return

    measures_sorted = sorted(
        measures,
        key=lambda m: (
            int(m.get('step_number', 0)),
            str(m.get('question_field', '')),
            str(m.get('scope_type', 'GERAL')),
            str(m.get('setor') or ''),
            str(m.get('ghe') or ''),
            str(m.get('id') or ''),
        ),
    )

    for m in measures_sorted:
        key = (
            int(m.get('step_number', 0)),
            str(m.get('question_field', '')),
            str(m.get('scope_type', 'GERAL')),
            str(m.get('setor') or ''),
            str(m.get('ghe') or ''),
        )
        info = score_lookup.get(key, {})
        step_no = int(m.get('step_number', 0))
        domain_name = step_domain_lookup.get(step_no, f'Step {step_no}')
        question = info.get('question') or f"Pergunta {m.get('question_field', '')}"
        score = float(info.get('score', 0) or 0)
        scope_label = info.get('scope_label') or ('Análise geral' if m.get('scope_type') == 'GERAL' else f"{ref_label}: {m.get('setor_name') or m.get('ghe_name') or '-'}")
        when_data = whens_lookup.get(key)
        when_months = (when_data or {}).get('when_months', [])
        when_range = format_when_range(when_months)
        when_list_pt = format_when_months_pt(when_months)

        needed = 40 * mm
        if y < needed:
            c.showPage()
            y = new_page()

        # Card border
        box_x = margin_x
        box_w = width - 2 * margin_x
        box_top = y
        c.setStrokeColor(colors.HexColor('#d1d5db'))
        c.setFillColor(colors.white)
        # Temporary height, redraw not needed; calculate by advancing and drawing sections manually
        y -= 2 * mm

        # Header text lines
        c.setFillColor(colors.HexColor('#1d4ed8'))
        c.setFont('Helvetica-Bold', 8.4)
        c.drawString(box_x + 2 * mm, y, f'{domain_name} | {scope_label}')
        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica-Bold', 8.4)
        c.drawRightString(box_x + box_w - 2 * mm, y, f'Pontuacao: {score:.1f}')
        y -= 5 * mm

        y = draw_wrapped_text(box_x + 2 * mm, y, question, font='Helvetica', size=8.8, max_width=box_w - 4 * mm, leading=11.5)
        y -= 1.5 * mm

        c.setFillColor(colors.HexColor('#92400e'))
        c.setFont('Helvetica-Bold', 8.4)
        c.drawString(box_x + 2 * mm, y, 'Plano de acao:')
        c.setFillColor(colors.HexColor('#111827'))
        y = draw_wrapped_text(box_x + 28 * mm, y, m.get('action_text', '-'), font='Helvetica', size=8.8, max_width=box_w - 30 * mm, leading=11.5)
        y -= 2 * mm

        # Sempre renderiza a tabela do plano de acao.
        # Se nao houver "quando", a coluna "Data de Implantacao" permanece vazia.
        table_x = box_x + 2 * mm
        table_w = box_w - 4 * mm
        header_h = 5 * mm
        body_h = 6 * mm
        cols = [
            ('Responsavel', 0.24),
            ('Data de\nImplantacao', 0.19),
            ('A\nFazer', 0.08),
            ('Fazendo', 0.10),
            ('Adiado', 0.10),
            ('Concluido', 0.12),
            ('Concluido em', 0.17),
        ]
        widths = [table_w * p for _, p in cols]
        c.setStrokeColor(colors.HexColor('#d1d5db'))
        c.setFillColor(colors.HexColor('#f3f4f6'))
        c.rect(table_x, y - header_h, table_w, header_h, stroke=1, fill=1)
        x = table_x
        c.setFillColor(colors.HexColor('#111827'))
        for (label, _), w in zip(cols, widths):
            parts = label.split('\n')
            c.setFont('Helvetica-Bold', 6.7)
            if len(parts) == 1:
                c.drawCentredString(x + w / 2, y - 3.2 * mm, parts[0])
            else:
                c.drawCentredString(x + w / 2, y - 2.4 * mm, parts[0])
                c.drawCentredString(x + w / 2, y - 4.7 * mm, parts[1])
            x += w

        row_y = y - header_h
        c.setFillColor(colors.white)
        c.rect(table_x, row_y - body_h, table_w, body_h, stroke=1, fill=1)
        x = table_x
        values = [empresa_name, when_range or '', '', '', '', '', '__/__/____']
        for idx, w in enumerate(widths):
            c.setFillColor(colors.HexColor('#111827'))
            if 2 <= idx <= 5:
                # checkbox
                cx = x + w / 2 - 1.4 * mm
                cy = row_y - 4.6 * mm
                c.setStrokeColor(colors.HexColor('#9ca3af'))
                c.rect(cx, cy, 2.8 * mm, 2.8 * mm, stroke=1, fill=0)
            else:
                c.setFont('Helvetica', 6.8)
                c.drawCentredString(x + w / 2, row_y - 3.8 * mm, values[idx])
            x += w
        # verticals
        x = table_x
        total_h = header_h + body_h
        for w in widths[:-1]:
            x += w
            c.line(x, y, x, y - total_h)
        y = row_y - body_h - 4 * mm

        # Outline around card content (approximate)
        c.setStrokeColor(colors.HexColor('#d1d5db'))
        c.roundRect(box_x, y + 2 * mm, box_w, (box_top - (y + 2 * mm)) + 1.5 * mm, 3, stroke=1, fill=0)
        y -= 2 * mm

    # ---- Planos de Ação Selecionados (pre-defined toggles) ----
    if planos_acao:
        from collections import defaultdict
        if y < 30 * mm:
            c.showPage()
            y = new_page()
        y -= 2 * mm
        c.setFillColor(colors.HexColor('#9a3412'))
        c.setFont('Helvetica-Bold', 8)
        # c.drawString(margin_x, y, 'Planos de Ação Selecionados')
        y -= 8 * mm

        planos_by_q = defaultdict(list)
        for p in planos_acao:
            k = (p.get('step_key', ''), p.get('question_field', ''))
            planos_by_q[k].append(p)

        for (step_key, question_field), plans in sorted(planos_by_q.items()):
            try:
                step_num = int(step_key.replace('step', '')) if step_key.startswith('step') else 0
            except ValueError:
                step_num = 0
            domain_name = step_domain_lookup.get(step_num, step_key)
            q_info = score_lookup.get((step_num, question_field, 'GERAL', '', ''), {})
            question_text = q_info.get('question') or f'Pergunta {question_field}'
            when_data = whens_lookup.get((step_num, question_field, 'GERAL', '', ''))
            when_months = (when_data or {}).get('when_months', [])
            when_list_pt = format_when_months_pt(when_months)
            when_range = format_when_range(when_months)

            needed = (20 + len(plans) * 12 + (40 if when_range else 0)) * mm
            if y < needed:
                c.showPage()
                y = new_page()

            box_x = margin_x
            box_w = width - 2 * margin_x
            box_top = y
            y -= 2 * mm

            c.setFillColor(colors.HexColor('#1d4ed8'))
            c.setFont('Helvetica-Bold', 7.8)
            c.drawString(box_x + 2 * mm, y, domain_name)
            y -= 5 * mm

            y = draw_wrapped_text(box_x + 2 * mm, y, question_text, font='Helvetica', size=8.8, max_width=box_w - 4 * mm, leading=11.5)
            y -= 3 * mm

            c.setFillColor(colors.HexColor('#92400e'))
            c.setFont('Helvetica-Bold', 8.4)
            c.drawString(box_x + 2 * mm, y, 'Planos selecionados:')
            y -= 5.5 * mm

            for p in sorted(plans, key=lambda x: x.get('plano_index', 0)):
                texto = p.get('texto', '')
                if texto:
                    c.setFillColor(colors.HexColor('#111827'))
                    c.setFont('Helvetica', 8.8)
                    c.drawString(box_x + 4 * mm, y, u'\u2022')
                    y = draw_wrapped_text(box_x + 7 * mm, y, texto, font='Helvetica', size=8.8, max_width=box_w - 9 * mm, leading=11.5)
                    y -= 2 * mm

            if when_range:
                # y -= 1 * mm
                # c.setFillColor(colors.HexColor('#111827'))
                # c.setFont('Helvetica-Bold', 7)
                # c.drawString(box_x + 2 * mm, y, 'Quando')
                # y -= 4.5 * mm

                # c.setFont('Helvetica-Bold', 6.6)
                # c.drawString(box_x + 2 * mm, y, 'Aplicar em:')
                # c.setFont('Helvetica', 6.4)
                # c.drawString(box_x + 18 * mm, y, when_list_pt or '-')
                # y -= 5.5 * mm

                table_x = box_x + 2 * mm
                table_w = box_w - 4 * mm
                header_h = 5 * mm
                body_h = 6 * mm
                cols = [
                    ('Responsavel', 0.24),
                    ('Data de\nImplantacao', 0.19),
                    ('A\nFazer', 0.08),
                    ('Fazendo', 0.10),
                    ('Adiado', 0.10),
                    ('Concluido', 0.12),
                    ('Concluido em', 0.17),
                ]
                widths = [table_w * p for _, p in cols]
                c.setStrokeColor(colors.HexColor('#d1d5db'))
                c.setFillColor(colors.HexColor('#f3f4f6'))
                c.rect(table_x, y - header_h, table_w, header_h, stroke=1, fill=1)
                x = table_x
                c.setFillColor(colors.HexColor('#111827'))
                for (label, _), w in zip(cols, widths):
                    parts = label.split('\n')
                    c.setFont('Helvetica-Bold', 6.7)
                    if len(parts) == 1:
                        c.drawCentredString(x + w / 2, y - 3.2 * mm, parts[0])
                    else:
                        c.drawCentredString(x + w / 2, y - 2.4 * mm, parts[0])
                        c.drawCentredString(x + w / 2, y - 4.7 * mm, parts[1])
                    x += w

                row_y = y - header_h
                c.setFillColor(colors.white)
                c.rect(table_x, row_y - body_h, table_w, body_h, stroke=1, fill=1)
                x = table_x
                values = [empresa_name, when_range, '', '', '', '', '__/__/____']
                for idx, w in enumerate(widths):
                    c.setFillColor(colors.HexColor('#111827'))
                    if 2 <= idx <= 5:
                        cx = x + w / 2 - 1.4 * mm
                        cy = row_y - 4.6 * mm
                        c.setStrokeColor(colors.HexColor('#9ca3af'))
                        c.rect(cx, cy, 2.8 * mm, 2.8 * mm, stroke=1, fill=0)
                    else:
                        c.setFont('Helvetica', 6.8)
                        c.drawCentredString(x + w / 2, row_y - 3.8 * mm, values[idx])
                    x += w
                x = table_x
                total_h = header_h + body_h
                for w in widths[:-1]:
                    x += w
                    c.line(x, y, x, y - total_h)
                y = row_y - body_h - 4 * mm

            c.setStrokeColor(colors.HexColor('#d1d5db'))
            c.roundRect(box_x, y + 2 * mm, box_w, (box_top - (y + 2 * mm)) + 1.5 * mm, 3, stroke=1, fill=0)
            y -= 3 * mm

    c.showPage()


def _draw_pdf_limitacoes_page(c):
    width, height = A4
    margin_x = 15 * mm
    y = height - 18 * mm
    blue = colors.HexColor('#14532d')

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    c.setFillColor(blue)
    c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(margin_x + 2, y - 0.6, '7')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 9)
    c.drawString(margin_x + 8 * mm, y - 0.5, 'LIMITAÇÕES')
    c.setStrokeColor(blue)
    c.setLineWidth(1)
    c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
    y -= 11 * mm

    paragraphs = [
        'Esta Avaliação Ergonômica Preliminar (AEP) possui caráter preliminar, sendo realizada em conformidade com os requisitos da NR-17 (Portaria MTP nº 423/2021), item 17.3.2, que determina a necessidade de avaliação inicial para subsidiar o gerenciamento dos fatores de risco relacionados à ergonomia no ambiente de trabalho.',
        'A AEP tem como objetivo identificar indícios de fatores de risco, subsidiar o Programa de Gerenciamento de Riscos (PGR) e o Gerenciamento de Riscos Ocupacionais (GRO), conforme exigido pela NR-1 (Portaria SEPRT nº 6.730/2020), e auxiliar na priorização de medidas corretivas e preventivas no ambiente laboral. No entanto, este instrumento não substitui a Análise Ergonômica do Trabalho (AET), que possui caráter aprofundado e investigativo, exigindo observações diretas em campo, medições ambientais e biomecânicas, entrevistas e avaliações detalhadas das condições de trabalho.',
        'A NR-17 dispõe que "as condições de trabalho que possam afetar a saúde dos trabalhadores devem ser objeto de AET", especialmente quando forem identificados riscos significativos ou quando houver indícios de que os fatores psicossociais, físicos ou organizacionais estão impactando de forma relevante a saúde e a produtividade dos trabalhadores. Nesse sentido, a AET torna-se obrigatória em situações em que a AEP aponta a necessidade de medidas adicionais de controle ou quando os resultados indicam a presença de condições críticas que requeiram investigação aprofundada.',
        'Conforme o Guia de Fatores de Riscos Psicossociais Relacionados ao Trabalho (MTE), a avaliação preliminar deve ser parte de um processo contínuo de monitoramento, sendo considerada um ponto de partida no gerenciamento de riscos psicossociais, mas não encerrando o processo de análise de forma definitiva.',
        'Além disso, os resultados obtidos por meio desta plataforma representam a percepção dos trabalhadores sobre o ambiente de trabalho em um período específico, podendo sofrer alterações em virtude de mudanças organizacionais, tecnológicas ou de processos de trabalho. Portanto, os dados devem ser utilizados de forma crítica, sendo recomendada sua atualização periódica para manter a rastreabilidade das informações e a efetividade das ações de prevenção e controle implementadas.',
        'Por fim, destaca-se que a participação dos trabalhadores nesta avaliação é voluntária e confidencial e, embora a amostra seja representativa, podem existir limitações relacionadas a fatores como receio de exposição, interpretação subjetiva das perguntas e condições específicas do local de trabalho não observadas no momento da avaliação, reforçando a necessidade de utilização da AEP como ferramenta de triagem e priorização dentro do sistema de gestão de SST, e não como avaliação conclusiva sobre todos os aspectos ergonômicos da organização.',
    ]

    text_obj = c.beginText()
    text_obj.setTextOrigin(margin_x, y)
    body_font = 9.0
    body_leading = 12.6
    text_obj.setFont('Helvetica', body_font)
    text_obj.setLeading(body_leading)
    text_obj.setFillColor(colors.HexColor('#111827'))
    max_width = width - (2 * margin_x)
    for paragraph in paragraphs:
        line = ''
        for word in paragraph.split():
            test = f'{line} {word}'.strip()
            if c.stringWidth(test, 'Helvetica', body_font) <= max_width:
                line = test
            else:
                text_obj.textLine(line)
                line = word
        if line:
            text_obj.textLine(line)
        text_obj.textLine('')
    c.drawText(text_obj)
    c.showPage()


def _format_date_long_pt_br(value):
    if not value:
        return ''
    meses = [
        'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ]
    try:
        return f'{value.day} de {meses[value.month - 1]} de {value.year}'
    except Exception:
        return ''


def _draw_pdf_responsabilidades_page(c, consultoria_cfg=None, campanha=None):
    width, height = A4
    margin_x = 15 * mm
    y = height - 18 * mm
    blue = colors.HexColor('#14532d')
    gray = colors.HexColor('#6b7280')

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    c.setFillColor(blue)
    c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(margin_x + 2, y - 0.6, '8')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 9)
    c.drawString(margin_x + 8 * mm, y - 0.5, 'RESPONSABILIDADES')
    c.setStrokeColor(blue)
    c.setLineWidth(1)
    c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
    y -= 11 * mm

    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica', 9.2)
    cidade = (getattr(consultoria_cfg, 'cidade', '') or 'Fortaleza').strip()
    uf = (getattr(consultoria_cfg, 'uf', '') or 'CE').strip().upper()
    data_encerramento = getattr(campanha, 'end_date', None)
    data_txt = _format_date_long_pt_br(data_encerramento) or 'data nao informada'
    c.drawString(margin_x, y, f'{cidade} - {uf}, {data_txt}')
    y -= 14 * mm

    # Assinaturas em 2 colunas
    col_w = (width - 2 * margin_x - 8 * mm) / 2
    left_x = margin_x + 2 * mm
    right_x = left_x + col_w + 8 * mm
    line_y = y

    for x in [left_x, right_x]:
        c.setStrokeColor(colors.HexColor('#cbd5e1'))
        c.line(x, line_y, x + col_w, line_y)

    # Left signer
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 8)
    left_nome = (getattr(consultoria_cfg, 'responsavel_legal', '') or getattr(consultoria_cfg, 'representante_legal_relatorio', '') or 'Responsavel Legal').upper()
    left_consultoria = getattr(consultoria_cfg, 'nome_consultoria', '') or 'CONSULTORIA'
    c.drawCentredString(left_x + col_w / 2, line_y - 4 * mm, left_nome[:44])
    c.setFillColor(gray)
    c.setFont('Helvetica', 8.0)
    c.drawCentredString(left_x + col_w / 2, line_y - 8 * mm, 'Representante Legal')
    c.drawCentredString(left_x + col_w / 2, line_y - 12 * mm, left_consultoria[:58])
    c.setFillColor(blue)
    c.setFont('Helvetica-Bold', 8.0)
    c.drawCentredString(left_x + col_w / 2, line_y - 16 * mm, 'Responsável pela avaliação')

    # Right signer
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 8)
    empresa_obj = getattr(campanha, 'empresa', None)
    right_nome = (getattr(empresa_obj, 'responsible_name', '') or 'Representante Legal').upper()
    right_empresa = getattr(empresa_obj, 'company_name', '') or 'EMPRESA'
    c.drawCentredString(right_x + col_w / 2, line_y - 4 * mm, right_nome[:44])
    c.setFillColor(gray)
    c.setFont('Helvetica', 8.0)
    c.drawCentredString(right_x + col_w / 2, line_y - 8 * mm, 'Representante Legal')
    c.drawCentredString(right_x + col_w / 2, line_y - 12 * mm, right_empresa[:58])
    c.setFillColor(blue)
    c.setFont('Helvetica-Bold', 8.0)
    c.drawCentredString(right_x + col_w / 2, line_y - 16 * mm, 'Responsável pela aprovação')

    y = line_y - 28 * mm

    paragraphs = [
        'Ressalta-se que a responsabilidade pela implementação, monitoramento e acompanhamento das ações corretivas e preventivas recomendadas neste relatório é integralmente da empresa, conforme estabelece a NR-1 (item 1.5.3.1) e o Programa de Gerenciamento de Riscos (PGR), cabendo à organização avaliar a aplicabilidade das medidas no contexto de suas operações, garantindo a conformidade com as normas regulamentadoras vigentes e as melhores práticas de saúde, segurança e ergonomia ocupacional.',
        'Este relatório, elaborado com rigor técnico e em conformidade com a NR-1, NR-17 e o Guia de Fatores de Riscos Psicossociais Relacionados ao Trabalho, visa subsidiar a gestão da empresa na tomada de decisões informadas, mantendo rastreabilidade e evidências técnicas para auditorias, fiscalizações e processos de melhoria contínua do sistema de gestão de SST.',
    ]

    text_obj = c.beginText()
    text_obj.setTextOrigin(margin_x, y)
    body_font = 9.2
    body_leading = 12.8
    text_obj.setFont('Helvetica', body_font)
    text_obj.setLeading(body_leading)
    text_obj.setFillColor(colors.HexColor('#111827'))
    max_width = width - (2 * margin_x)
    for paragraph in paragraphs:
        line = ''
        for word in paragraph.split():
            test = f'{line} {word}'.strip()
            if c.stringWidth(test, 'Helvetica', body_font) <= max_width:
                line = test
            else:
                text_obj.textLine(line)
                line = word
        if line:
            text_obj.textLine(line)
        text_obj.textLine('')
    c.drawText(text_obj)
    c.showPage()


def _draw_pdf_anexos_pages(c, report_data):
    width, height = A4
    margin_x = 15 * mm
    blue = colors.HexColor('#14532d')
    anexos = report_data.get('attachments', []) or []

    def new_page():
        c.setFillColor(colors.white)
        c.rect(0, 0, width, height, stroke=0, fill=1)
        y = height - 18 * mm
        c.setFillColor(blue)
        c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(margin_x + 2, y - 0.6, '9')
        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica-Bold', 9)
        c.drawString(margin_x + 8 * mm, y - 0.5, 'ANEXOS')
        c.setStrokeColor(blue)
        c.setLineWidth(1)
        c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
        return y - 11 * mm

    y = new_page()
    if not anexos:
        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica', 7.5)
        c.drawString(margin_x, y, 'Nenhum anexo informado.')
        c.showPage()
        return

    page_bottom = 15 * mm
    slot_gap = 4 * mm
    slot_h = (y - page_bottom - (2 * slot_gap)) / 3.0
    slot_h = max(72 * mm, slot_h)
    slot_index = 0

    for idx, anexo in enumerate(anexos, start=1):
        if slot_index >= 3 or (y - slot_h) < page_bottom:
            c.showPage()
            y = new_page()
            slot_h = (y - page_bottom - (2 * slot_gap)) / 3.0
            slot_h = max(72 * mm, slot_h)
            slot_index = 0

        file_name = str(anexo.get('file_name', f'Anexo {idx}'))
        file_url = str(anexo.get('file_url', ''))
        content_type = str(anexo.get('content_type', ''))
        size_kb = int((anexo.get('size_bytes') or 0) / 1024) if anexo.get('size_bytes') else 0

        box_x = margin_x
        box_y = y - slot_h
        box_w = width - 2 * margin_x

        c.setStrokeColor(colors.HexColor('#d1d5db'))
        c.roundRect(box_x, box_y, box_w, slot_h, 3, stroke=1, fill=0)

        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica-Bold', 8.5)
        c.drawString(box_x + 2 * mm, y - 4.5 * mm, f'Anexo {idx}: {file_name[:90]}')
        c.setFont('Helvetica', 7.2)
        c.setFillColor(colors.HexColor('#6b7280'))
        c.drawString(box_x + 2 * mm, y - 9 * mm, f'Tipo: {content_type or "-"} | Tamanho: {size_kb} KB')

        img_x = box_x + 2 * mm
        img_y = box_y + 2 * mm
        img_w = box_w - 4 * mm
        img_h = slot_h - 13 * mm

        if content_type.startswith('image/') and file_url:
            try:
                with urlopen(file_url, timeout=8) as fp:
                    img = ImageReader(fp)
                    c.drawImage(
                        img,
                        img_x,
                        img_y,
                        width=img_w,
                        height=img_h,
                        preserveAspectRatio=True,
                        mask='auto',
                        anchor='c',
                    )
            except Exception:
                c.setFillColor(colors.HexColor('#9ca3af'))
                c.setFont('Helvetica-Oblique', 7.2)
                c.drawCentredString(box_x + (box_w / 2), box_y + (slot_h / 2), 'Preview indisponivel no momento da geracao do PDF.')
        else:
            c.setFillColor(colors.HexColor('#9ca3af'))
            c.setFont('Helvetica-Oblique', 7.2)
            c.drawCentredString(box_x + (box_w / 2), box_y + (slot_h / 2), 'Anexo sem preview de imagem.')

        y -= (slot_h + slot_gap)
        slot_index += 1

    c.showPage()


def _get_consultoria_tecnicos_rows(empresa=None, consultoria_cfg=None):
    if consultoria_cfg is not None:
        qs = consultoria_cfg.responsaveis_tecnicos.all().order_by('id')
    elif empresa is not None and getattr(empresa, 'consultor_id', None):
        qs = ConsultoriaResponsavelTecnico.objects.filter(
            configuracao__consultor_id=empresa.consultor_id,
        ).order_by('id')
    else:
        qs = ConsultoriaResponsavelTecnico.objects.none()

    tecnicos = list(qs)
    if not tecnicos:
        return [['A definir', '-', '-']]
    return [[(t.nome or '-'), (t.formacao or '-'), (t.registro or '-')] for t in tecnicos]


def _draw_pdf_identificacao_page(c, campanha, empresa, report_data, consultoria_cfg=None):
    width, height = A4
    margin_x = 15 * mm
    y = height - 18 * mm
    summary = (report_data.get('overall') or {}).get('summary', {})
    completed = summary.get('completed_responses', 0)

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    blue = colors.HexColor('#14532d')
    c.setFillColor(blue)
    c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(margin_x + 2, y - 0.6, '1')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 9)
    c.drawString(margin_x + 8 * mm, y - 0.5, 'IDENTIFICAÇÃO')
    c.setStrokeColor(blue)
    c.setLineWidth(1)
    c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
    y -= 11 * mm

    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 7)
    ident_lines = [
        ('Empresa', empresa.company_name or '-'),
        ('CNPJ', (empresa.document_number or '-') if getattr(empresa, 'document_type', '') == 'CNPJ' else '-'),
        ('Endereço', f"{empresa.street or '-'}, {empresa.number or '-'} - {empresa.city or '-'} / {empresa.state or '-'}"),
        ('CNAE', '-'),
        ('Classe de risco', empresa.risk_level or '-'),
        ('Setores avaliados', '-'),
        ('Número de trabalhadores avaliados', str(completed or 0)),
        ('Data da avaliação', campanha.end_date.strftime('%d/%m/%Y') if campanha.end_date else '-'),
        ('Reavaliação recomendada', f"{int(report_data.get('review_recommendation_months') or 3)} meses"),
    ]
    for label, value in ident_lines:
        c.drawString(margin_x, y, f'{label}:')
        c.setFont('Helvetica', 7)
        c.drawString(margin_x + 65 * mm, y, str(value))
        y -= 5 * mm
        c.setFont('Helvetica-Bold', 7)

    y -= 3 * mm
    c.setFillColor(blue)
    c.setFont('Helvetica-Bold', 8)
    c.drawString(margin_x, y, '1.1 Responsáveis técnicos pela ferramenta de avaliação FRPRT')
    y -= 8 * mm

    table_x = margin_x
    table_w = width - (2 * margin_x)
    col_w = [table_w * 0.38, table_w * 0.42, table_w * 0.20]
    row_h = 6 * mm
    headers = ['Nome', 'Formação', 'Registro']
    rows = _get_consultoria_tecnicos_rows(empresa=empresa, consultoria_cfg=consultoria_cfg)

    c.setStrokeColor(colors.HexColor('#d1d5db'))
    c.setFillColor(colors.HexColor('#e5e7eb'))
    c.rect(table_x, y - row_h, table_w, row_h, stroke=1, fill=1)
    x = table_x
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 7)
    for i, h in enumerate(headers):
      c.drawString(x + 2 * mm, y - 4.2 * mm, h)
      x += col_w[i]

    curr_y = y - row_h
    c.setFont('Helvetica', 6.7)
    for row in rows:
        curr_y -= row_h
        c.setFillColor(colors.white)
        c.rect(table_x, curr_y, table_w, row_h, stroke=1, fill=1)
        x = table_x
        for i, value in enumerate(row):
            c.setFillColor(colors.HexColor('#111827'))
            c.drawString(x + 2 * mm, curr_y + 2.0 * mm, value)
            x += col_w[i]

    # Vertical separators
    x = table_x
    total_h = row_h * (1 + len(rows))
    for w in col_w[:-1]:
        x += w
        c.line(x, y, x, y - total_h)

    c.showPage()


def _draw_pdf_objetivo_page(c):
    width, height = A4
    margin_x = 15 * mm
    y = height - 18 * mm
    blue = colors.HexColor('#14532d')

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    c.setFillColor(blue)
    c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(margin_x + 2, y - 0.6, '2')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 9)
    c.drawString(margin_x + 8 * mm, y - 0.5, 'OBJETIVO')
    c.setStrokeColor(blue)
    c.setLineWidth(1)
    c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
    y -= 11 * mm

    text = (
        'Esta Avaliação Ergonômica Preliminar (AEP) tem por finalidade identificar e examinar tecnicamente os fatores de '
        'risco psicossociais existentes no contexto de trabalho, que possam contribuir para o estresse ocupacional e afetar '
        'a saúde, o bem-estar e o desempenho dos colaboradores. O presente relatório encontra-se em plena conformidade com '
        'a NR-17 e a NR-1 (GRO e PGR), observando o Guia de Informações sobre Fatores de Riscos Psicossociais Relacionados '
        'ao Trabalho (MTE) e as diretrizes da HSE-SIT-UK, assegurando alinhamento com as melhores práticas nacionais e '
        'internacionais em saúde e segurança do trabalho. Além de atender às exigências legais, esta AEP-FRPRT fornece '
        'fundamentos técnicos consistentes para subsidiar decisões quanto às necessidades de aprofundamento por meio da '
        'Análise Ergonômica do Trabalho (AET), a priorização de medidas de controle e a definição de planos de ação '
        'integrados ao PGR, com o propósito de promover ambientes laborais mais seguros, saudáveis e produtivos.'
    )

    text_obj = c.beginText()
    text_obj.setTextOrigin(margin_x, y)
    body_font = 9.3
    body_leading = 12.9
    text_obj.setFont('Helvetica', body_font)
    text_obj.setLeading(body_leading)
    text_obj.setFillColor(colors.HexColor('#111827'))

    max_width = width - (2 * margin_x)
    words = text.split()
    line = ''
    for word in words:
        test = f'{line} {word}'.strip()
        if c.stringWidth(test, 'Helvetica', body_font) <= max_width:
            line = test
        else:
            text_obj.textLine(line)
            line = word
    if line:
        text_obj.textLine(line)
    c.drawText(text_obj)
    c.showPage()


def _draw_pdf_metodologia_pages(c):
    width, height = A4
    margin_x = 15 * mm
    top_y = height - 18 * mm
    blue = colors.HexColor('#14532d')

    def draw_header(page_num='3', title='METODOLOGIA'):
        y = top_y
        c.setFillColor(colors.white)
        c.rect(0, 0, width, height, stroke=0, fill=1)
        c.setFillColor(blue)
        c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(margin_x + 2, y - 0.6, page_num)
        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica-Bold', 9)
        c.drawString(margin_x + 8 * mm, y - 0.5, title)
        c.setStrokeColor(blue)
        c.setLineWidth(1)
        c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
        return y - 10 * mm

    def draw_paragraph(y, text, font='Helvetica', size=9.1, leading=12.8, bold=False):
        c.setFont('Helvetica-Bold' if bold else font, size)
        text_obj = c.beginText()
        text_obj.setTextOrigin(margin_x, y)
        text_obj.setLeading(leading)
        text_obj.setFillColor(colors.HexColor('#111827'))
        max_width = width - (2 * margin_x)
        line_count = 0
        line = ''
        for word in text.split():
            test = f'{line} {word}'.strip()
            if c.stringWidth(test, 'Helvetica-Bold' if bold else font, size) <= max_width:
                line = test
            else:
                text_obj.textLine(line)
                line_count += 1
                line = word
        if line:
            text_obj.textLine(line)
            line_count += 1
        c.drawText(text_obj)
        return y - (max(1, line_count) * leading) - 1.5 * mm

    y = draw_header()
    paragraphs_page1 = [
        'Para a condução desta Avaliação Ergonômica Preliminar (AEP), foi empregado o Stress Indicator Tool (SIT), instrumento de avaliação psicossocial reconhecido internacionalmente e validado pelo Health and Safety Executive (HSE) do Reino Unido (UK), devidamente adaptado à realidade organizacional brasileira, em conformidade com os princípios da NR-1, da NR-17 e do Guia de Fatores Psicossociais Relacionados ao Trabalho, elaborados pelo Ministério do Trabalho e Emprego (MTE).',
        'O instrumento é composto por 35 questões estruturadas, organizadas nos domínios Demandas, Controle, Apoio, Relacionamentos, Papel e Mudanças, reconhecidos pela literatura científica e pelas normas técnicas como fatores determinantes relevantes para a saúde mental e o bem-estar dos trabalhadores.',
        'A aplicação da metodologia permite a realização de uma análise técnica detalhada dos fatores críticos presentes no ambiente laboral, contemplando as seguintes etapas:',
    ]
    for p in paragraphs_page1:
        y = draw_paragraph(y, p)
        y -= 2 * mm

    bullets = [
        'Realização de coleta estruturada e sigilosa das percepções dos trabalhadores, garantindo confidencialidade e confiabilidade das respostas;',
        'Classificação, consolidação e análise estatística das informações obtidas, possibilitando a identificação de áreas sensíveis e pontos prioritários de intervenção;',
        'Avaliação técnica dos resultados em conformidade com a legislação vigente e com as melhores práticas nacionais e internacionais de Saúde e Segurança do Trabalho, assegurando rastreabilidade dos dados e subsidiando a elaboração de ações integradas ao GRO e ao PGR;',
        'A utilização do Stress Indicator Tool (SIT) neste processo permite a identificação estruturada e confiável dos riscos psicossociais existentes no ambiente laboral, proporcionando base para a definição e priorização de medidas preventivas e corretivas, além de possibilitar o acompanhamento contínuo da evolução das condições psicossociais ao longo do tempo;',
        'Ressalta-se que o SIT é uma das ferramentas indicadas pelo Health and Safety Executive (HSE-UK), em virtude de sua efetividade na coleta estruturada e objetiva das percepções dos trabalhadores. Cabe destacar que os resultados obtidos refletem a percepção dos colaboradores em um contexto e período específicos, o que reforça a importância de reavaliações periódicas, em alinhamento com o ciclo de monitoramento previsto no GRO e no PGR;',
        'A eficácia da metodologia adotada está diretamente vinculada ao comprometimento institucional e à participação ativa dos trabalhadores ao longo de todo o processo, considerando que são os próprios colaboradores que vivenciam as rotinas laborais e detêm a experiência prática necessária para fornecer informações confiáveis e relevantes sobre os fatores que influenciam sua saúde, bem-estar e desempenho;',
        'Adicionalmente, a metodologia empregada favorece a promoção de ambientes laborais mais seguros, equilibrados e produtivos, permitindo que a organização atue de forma preventiva, estruturada e sistematizada na gestão dos fatores psicossociais relacionados ao trabalho, em conformidade com a legislação brasileira vigente e com as referências internacionais de gestão em saúde e segurança ocupacional.',
    ]
    c.setFont('Helvetica', 9.1)
    for b in bullets:
        y = draw_paragraph(y, f'- {b}')
        y -= 1.2 * mm
        if y < 25 * mm:
            break

    y -= 2 * mm
    c.setFont('Helvetica-Bold', 9.8)
    c.setFillColor(colors.HexColor('#111827'))
    c.drawString(margin_x, y, 'Selecionando uma amostra')
    y -= 5 * mm
    y = draw_paragraph(y, 'Há várias questões a serem consideradas na seleção de uma população de pesquisa:')
    for line in ['Quais listas de trabalhadores podem ser utilizadas;', 'Quantos trabalhadores devem compor a amostra; e', 'Como selecionar a amostra de trabalhadores.']:
        y = draw_paragraph(y, f'- {line}')
        y -= 1 * mm
    y -= 1 * mm
    c.setFont('Helvetica-Bold', 9.8)
    c.drawString(margin_x, y, 'Lista de trabalhadores')
    y -= 5 * mm
    y = draw_paragraph(y, 'Ao selecionar uma amostra de trabalhadores, ou mesmo a totalidade dos colaboradores da organizacao, e fundamental assegurar a disponibilidade de uma lista atualizada dos participantes incluidos na pesquisa. Essa relacao pode ser obtida por meio da folha de pagamento, cadastro de empregados, registros de seguranca ou outras fontes equivalentes. E imprescindivel que a lista utilizada esteja correta e atualizada, a fim de garantir que todos os integrantes da amostra recebam o questionario. Tal cuidado contribui para o aumento da taxa de resposta e para a confiabilidade dos resultados obtidos.')
    c.showPage()

    y = height - 20 * mm
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 9.8)
    c.drawString(margin_x, y, 'Tamanho mínimo de amostra recomendado')
    y -= 5 * mm
    y = draw_paragraph(y, 'A realização de uma pesquisa envolvendo todos os colaboradores tende a proporcionar um retrato mais fiel da realidade organizacional do que a utilização de uma amostra. Por outro lado, optar pelo tamanho mínimo de amostra recomendado apresenta como benefícios a redução de custos e a diminuição do tempo demandado pela equipe. Os quantitativos mínimos foram definidos de modo a assegurar que os resultados obtidos sejam estatisticamente representativos das percepções do conjunto de trabalhadores da organização.')
    y = draw_paragraph(y, 'A adoção de uma amostra ampliada possibilita análises mais aprofundadas de subgrupos (como por categoria profissional) e amplia a oportunidade para que um número maior de colaboradores manifeste suas percepções. Em contrapartida, essa escolha pode implicar maior investimento de tempo e recursos para sua execução.')
    y = draw_paragraph(y, 'Os tamanhos de amostra recomendados são fornecidos na tabela abaixo:')
    y -= 2 * mm

    table_x = margin_x
    table_w = width - (2 * margin_x)
    col_w = [table_w * 0.45, table_w * 0.55]
    row_h = 6 * mm
    headers = ['Número total de trabalhadores', 'Tamanho de amostra recomendado']
    rows = [
        ['<= 500', 'Todos os funcionários'],
        ['501 - 1.000', '500 respostas'],
        ['1.001 - 2.000', '650 respostas'],
        ['2.001 - 3.000', '700 respostas'],
        ['> 3.000', '800 respostas'],
    ]
    c.setStrokeColor(colors.HexColor('#d1d5db'))
    c.setFillColor(colors.HexColor('#e5e7eb'))
    c.rect(table_x, y - row_h, table_w, row_h, stroke=1, fill=1)
    x = table_x
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 7.5)
    for i, h in enumerate(headers):
        c.drawString(x + 2 * mm, y - 4.2 * mm, h)
        x += col_w[i]
    curr_y = y - row_h
    c.setFont('Helvetica', 7.2)
    for row in rows:
        curr_y -= row_h
        c.setFillColor(colors.white)
        c.rect(table_x, curr_y, table_w, row_h, stroke=1, fill=1)
        x = table_x
        for i, val in enumerate(row):
            c.setFillColor(colors.HexColor('#111827'))
            c.drawString(x + 2 * mm, curr_y + 2.0 * mm, val)
            x += col_w[i]
    x = table_x + col_w[0]
    c.line(x, y, x, y - row_h * (1 + len(rows)))

    foot = 'Referência: Northumberland, Tyne and Wear NHS Foundation Trust SeW-PGN-1 - Apêndice 7 - Manual do Usuário da FerramentaIndicadora HSE - V03. Edição 1 - Emitido em setembro de 2014. Parte da NTW(HR) 12 - Política de Estresse no Trabalho.'
    c.setFillColor(colors.HexColor('#6b7280'))
    c.setFont('Helvetica', 5.6)
    max_w = width - 2 * margin_x
    foot_words = foot.split()
    foot_lines = []
    foot_cur = ''
    for w in foot_words:
        test = (foot_cur + ' ' + w).strip() if foot_cur else w
        if c.stringWidth(test, 'Helvetica', 5.6) <= max_w:
            foot_cur = test
        else:
            if foot_cur:
                foot_lines.append(foot_cur)
            foot_cur = w
    if foot_cur:
        foot_lines.append(foot_cur)
    foot_y = curr_y - 5 * mm
    for fl in foot_lines:
        c.drawString(margin_x, foot_y, fl)
        foot_y -= 3.5 * mm
    c.showPage()


def _draw_pdf_importancia_participacao_page(c):
    width, height = A4
    margin_x = 15 * mm
    y = height - 18 * mm
    blue = colors.HexColor('#14532d')

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    c.setFillColor(blue)
    c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(margin_x + 2, y - 0.6, '4')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 8.5)
    c.drawString(margin_x + 8 * mm, y - 0.5, 'IMPORTÂNCIA DA PARTICIPAÇÃO DOS TRABALHADORES')
    c.setStrokeColor(blue)
    c.setLineWidth(1)
    c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
    y -= 11 * mm

    text = (
        'A participação ativa, consciente e transparente dos trabalhadores constitui elemento fundamental para a efetividade '
        'desta Avaliação Ergonômica Preliminar (AEP), em consonância com os princípios de participação estabelecidos na '
        'NR-1 (item 1.5.3.1) e na NR-17, que ressaltam a relevância do envolvimento dos colaboradores na identificação e '
        'no gerenciamento dos riscos ocupacionais, inclusive daqueles relacionados aos fatores psicossociais do trabalho.\n\n'
        'Os trabalhadores são aqueles que vivenciam cotidianamente os processos, as exigências e os desafios do ambiente '
        'de trabalho, detendo conhecimento prático e percepções concretas acerca dos fatores que influenciam sua saúde, '
        'bem-estar, segurança e desempenho. Nesse sentido, a participação efetiva dos trabalhadores permite ao analista '
        'de AEP captar condições de trabalho que muitas vezes não são plenamente visíveis à observação externa.\n\n'
        'A obtenção de percepções diretamente junto aos trabalhadores, de maneira anônima e confidencial, minimiza vieses '
        'de avaliação e permite a identificação de aspectos subjetivos que não seriam evidenciados apenas por meio de '
        'observações técnicas ou análise documental. Ademais, a participação efetiva dos colaboradores fortalece o '
        'compromisso coletivo com a saúde e a segurança, estimulando o engajamento nas ações de melhoria que venham a ser '
        'implementadas posteriormente.\n\n'
        'A ausência de engajamento dos trabalhadores pode resultar em lacunas relevantes nas informações coletadas, '
        'tornando o diagnóstico impreciso ou parcial e comprometendo a efetividade das medidas preventivas e corretivas '
        'propostas. Por essa razão, ressalta-se que a qualidade dos dados obtidos está diretamente vinculada à consistência '
        'de um ambiente de confiança, no qual os colaboradores se sintam seguros para manifestar suas percepções de forma '
        'transparente, sem receio de retaliações ou julgamentos.\n\n'
        'A promoção da transparência, da escuta ativa e do diálogo permanente constitui estratégia essencial para assegurar '
        'essa participação, em consonância com o ciclo de melhoria contínua do Gerenciamento de Risco Ocupacionais (GRO) e '
        'do Programa de Gerenciamento de Riscos (PGR). Essa abordagem participativa fortalece a cultura de saúde e segurança '
        'na organização, contribuindo para a construção de um ambiente de trabalho mais seguro, saudável, equilibrado e produtivo.\n\n'
        'Por fim, destaca-se que a participação dos trabalhadores no processo de identificação e avaliação dos riscos '
        'psicossociais está em consonância com as melhores práticas internacionais recomendadas pela HSE-UK, configurando-se '
        'como um diferencial para organizações que buscam excelência em seus sistemas de gestão de saúde e segurança do trabalho, '
        'promovendo resultados sustentáveis e valorizando o bem-estar de seus colaboradores.'
    )

    text_obj = c.beginText()
    text_obj.setTextOrigin(margin_x, y)
    body_font = 9.0
    body_leading = 12.6
    text_obj.setFont('Helvetica', body_font)
    text_obj.setLeading(body_leading)
    text_obj.setFillColor(colors.HexColor('#111827'))
    max_width = width - (2 * margin_x)
    for paragraph in text.split('\n\n'):
        line = ''
        for word in paragraph.split():
            test = f'{line} {word}'.strip()
            if c.stringWidth(test, 'Helvetica', body_font) <= max_width:
                line = test
            else:
                text_obj.textLine(line)
                line = word
        if line:
            text_obj.textLine(line)
        text_obj.textLine('')
    c.drawText(text_obj)
    c.showPage()


def _build_report_pdf_response(campanha, rel_payload):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    empresa_name = rel_payload.get('empresa', {}).get('name', campanha.empresa.company_name)
    consultoria_cfg = (
        ConsultoriaConfiguracao.objects
        .prefetch_related('responsaveis_tecnicos')
        .filter(consultor=campanha.empresa.consultor)
        .first()
    )
    _draw_pdf_cover_page(c, campanha, empresa_name)
    _draw_pdf_summary_page(c)
    _draw_pdf_identificacao_page(c, campanha, campanha.empresa, rel_payload, consultoria_cfg=consultoria_cfg)
    _draw_pdf_objetivo_page(c)
    _draw_pdf_metodologia_pages(c)
    _draw_pdf_importancia_participacao_page(c)
    _draw_pdf_general_results_page(c, campanha, campanha.empresa, rel_payload)
    _draw_pdf_domain_detail_pages(c, rel_payload)
    _draw_pdf_conclusoes_recomendacoes_pages(c, rel_payload)
    _draw_pdf_limitacoes_page(c)
    _draw_pdf_responsabilidades_page(c, consultoria_cfg=consultoria_cfg, campanha=campanha)
    _draw_pdf_anexos_pages(c, rel_payload)
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    response = HttpResponse(pdf, content_type='application/pdf')
    safe_name = ''.join(ch if ch.isalnum() or ch in '-_' else '_' for ch in campanha.title)[:80] or 'relatorio'
    response['Content-Disposition'] = f'attachment; filename=\"{safe_name}.pdf\"'
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def healthcheck(request):
    return Response({'status': 'ok', 'service': 'nr01-risk-api'})


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                'token': token.key,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'user_type': user.user_type,
                    'is_superuser': user.is_superuser,
                },
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if hasattr(user, 'has_system_access') and not user.has_system_access():
            return Response({'detail': 'Acesso expirado.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(
            {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'user_type': user.user_type,
                'is_superuser': user.is_superuser,
            }
        )


class IsAdmUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.user_type == UserType.ADM)
            and (not hasattr(user, 'has_system_access') or user.has_system_access())
        )


class IsConsultorOrAdmUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if hasattr(user, 'has_system_access') and not user.has_system_access():
            return False
        return user.is_superuser or user.user_type in [UserType.ADM, UserType.CONSULTOR]


class DashboardOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get(self, request):
        from datetime import date as date_cls
        empresa_id_raw = (request.query_params.get('empresa_id') or '').strip()
        empresa_id = None
        if empresa_id_raw:
            try:
                empresa_id = int(empresa_id_raw)
            except ValueError:
                return Response({'detail': 'Empresa invalida.'}, status=status.HTTP_400_BAD_REQUEST)
        date_from = date_to = None
        try:
            raw_from = (request.query_params.get('date_from') or '').strip()
            raw_to = (request.query_params.get('date_to') or '').strip()
            if raw_from:
                date_from = date_cls.fromisoformat(raw_from)
            if raw_to:
                date_to = date_cls.fromisoformat(raw_to)
        except ValueError:
            return Response({'detail': 'Formato de data inválido. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_build_dashboard_overview(request.user, empresa_id=empresa_id, date_from=date_from, date_to=date_to))


def _consultoria_owner_for_user(user):
    # A configuracao e vinculada ao proprio usuario autenticado (ADM ou CONSULTOR).
    return user


class ConsultoriaConfiguracaoView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def _serialize(self, request, obj):
        return ConsultoriaConfiguracaoSerializer(obj, context={'request': request})

    def get_object(self, request):
        owner = _consultoria_owner_for_user(request.user)
        obj, _ = ConsultoriaConfiguracao.objects.get_or_create(consultor=owner)
        return obj

    def get(self, request):
        obj = self.get_object(request)
        return Response(self._serialize(request, obj).data)

    def patch(self, request):
        obj = self.get_object(request)
        serializer = ConsultoriaConfiguracaoSerializer(obj, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(self._serialize(request, obj).data)

    def put(self, request):
        obj = self.get_object(request)
        serializer = ConsultoriaConfiguracaoSerializer(obj, data=request.data, partial=False, context={'request': request})
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(self._serialize(request, obj).data)


class ConsultoriaResponsavelTecnicoListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def _get_config(self, request):
        owner = _consultoria_owner_for_user(request.user)
        obj, _ = ConsultoriaConfiguracao.objects.get_or_create(consultor=owner)
        return obj

    def get(self, request):
        cfg = self._get_config(request)
        qs = cfg.responsaveis_tecnicos.all()
        return Response(ConsultoriaResponsavelTecnicoSerializer(qs, many=True).data)

    def post(self, request):
        cfg = self._get_config(request)
        serializer = ConsultoriaResponsavelTecnicoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(configuracao=cfg)
        return Response(ConsultoriaResponsavelTecnicoSerializer(item).data, status=status.HTTP_201_CREATED)


class ConsultoriaResponsavelTecnicoDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def _get_object(self, request, tecnico_id):
        owner = _consultoria_owner_for_user(request.user)
        return ConsultoriaResponsavelTecnico.objects.filter(
            id=tecnico_id,
            configuracao__consultor=owner,
        ).first()

    def patch(self, request, tecnico_id):
        item = self._get_object(request, tecnico_id)
        if not item:
            return Response({'detail': 'Responsável técnico não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ConsultoriaResponsavelTecnicoSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(ConsultoriaResponsavelTecnicoSerializer(item).data)

    def put(self, request, tecnico_id):
        item = self._get_object(request, tecnico_id)
        if not item:
            return Response({'detail': 'Responsável técnico não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ConsultoriaResponsavelTecnicoSerializer(item, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(ConsultoriaResponsavelTecnicoSerializer(item).data)

    def delete(self, request, tecnico_id):
        item = self._get_object(request, tecnico_id)
        if not item:
            return Response({'detail': 'Responsável técnico não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConsultorListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmUser]

    def get(self, request):
        consultores = User.objects.filter(user_type=UserType.CONSULTOR).order_by('id')
        serializer = ConsultorSerializer(consultores, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ConsultorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        consultor = serializer.save()
        response_serializer = ConsultorSerializer(consultor)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ConsultorDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmUser]

    def get_object(self, consultor_id):
        return User.objects.filter(id=consultor_id, user_type=UserType.CONSULTOR).first()

    def get(self, request, consultor_id):
        consultor = self.get_object(consultor_id)
        if not consultor:
            return Response({'detail': 'Consultor não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ConsultorSerializer(consultor)
        return Response(serializer.data)

    def put(self, request, consultor_id):
        consultor = self.get_object(consultor_id)
        if not consultor:
            return Response({'detail': 'Consultor não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ConsultorSerializer(consultor, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        consultor = serializer.save()
        response_serializer = ConsultorSerializer(consultor)
        return Response(response_serializer.data)

    def patch(self, request, consultor_id):
        consultor = self.get_object(consultor_id)
        if not consultor:
            return Response({'detail': 'Consultor não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ConsultorSerializer(consultor, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        consultor = serializer.save()
        response_serializer = ConsultorSerializer(consultor)
        return Response(response_serializer.data)

    def delete(self, request, consultor_id):
        consultor = self.get_object(consultor_id)
        if not consultor:
            return Response({'detail': 'Consultor nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        consultor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmpresaListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_queryset(self, request):
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return Empresa.objects.select_related('consultor', 'responsavel_usuario').all()
        return Empresa.objects.select_related('consultor', 'responsavel_usuario').filter(consultor=request.user)

    def get(self, request):
        queryset = self.get_queryset(request)
        serializer = EmpresaSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = EmpresaSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        empresa = serializer.save()
        return Response(EmpresaSerializer(empresa).data, status=status.HTTP_201_CREATED)


def empresa_queryset_for_user(user):
    if user.is_superuser or user.user_type == UserType.ADM:
        return Empresa.objects.select_related('consultor', 'responsavel_usuario').all()
    return Empresa.objects.select_related('consultor', 'responsavel_usuario').filter(consultor=user)


class EmpresaDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, empresa_id):
        return empresa_queryset_for_user(request.user).filter(id=empresa_id).first()

    def get(self, request, empresa_id):
        empresa = self.get_object(request, empresa_id)
        if not empresa:
            return Response({'detail': 'Empresa não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = EmpresaSerializer(empresa)
        return Response(serializer.data)

    def patch(self, request, empresa_id):
        empresa = self.get_object(request, empresa_id)
        if not empresa:
            return Response({'detail': 'Empresa não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = EmpresaSerializer(empresa, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        empresa = serializer.save()
        return Response(EmpresaSerializer(empresa).data)

    def put(self, request, empresa_id):
        empresa = self.get_object(request, empresa_id)
        if not empresa:
            return Response({'detail': 'Empresa não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = EmpresaSerializer(empresa, data=request.data, partial=False, context={'request': request})
        serializer.is_valid(raise_exception=True)
        empresa = serializer.save()
        return Response(EmpresaSerializer(empresa).data)


class EmpresaInativarView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def post(self, request, empresa_id):
        queryset = Empresa.objects.select_related('consultor').filter(id=empresa_id)
        if not (request.user.is_superuser or request.user.user_type == UserType.ADM):
            queryset = queryset.filter(consultor=request.user)
        empresa = queryset.first()

        if not empresa:
            return Response({'detail': 'Empresa não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        empresa.is_active = False
        empresa.save(update_fields=['is_active', 'updated_at'])

        responsavel = empresa.responsavel_usuario
        responsavel.is_active = False
        responsavel.save(update_fields=['is_active'])

        return Response(EmpresaSerializer(empresa).data)


class EmpresaCanalDenunciasLinkView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, empresa_id):
        return empresa_queryset_for_user(request.user).filter(id=empresa_id).first()

    def _ensure_token(self, empresa, regenerate=False):
        if regenerate or not empresa.canal_denuncias_token:
            empresa.canal_denuncias_token = uuid.uuid4()
            empresa.save(update_fields=['canal_denuncias_token', 'updated_at'])
        return empresa.canal_denuncias_token

    def _public_url(self, token):
        base = (getattr(settings, 'FRONTEND_PUBLIC_BASE_URL', '') or '').rstrip('/')
        if not base:
            base = 'http://localhost:5173'
        return f'{base}/canal-denuncias/{token}/'

    def get(self, request, empresa_id):
        empresa = self.get_object(request, empresa_id)
        if not empresa:
            return Response({'detail': 'Empresa não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        token = self._ensure_token(empresa, regenerate=False)
        return Response({
            'empresa_id': empresa.id,
            'empresa_name': empresa.company_name,
            'token': str(token),
            'url': self._public_url(token),
        })

    def post(self, request, empresa_id):
        empresa = self.get_object(request, empresa_id)
        if not empresa:
            return Response({'detail': 'Empresa não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        regenerate = bool(request.data.get('regenerate'))
        token = self._ensure_token(empresa, regenerate=regenerate)
        return Response({
            'empresa_id': empresa.id,
            'empresa_name': empresa.company_name,
            'token': str(token),
            'url': self._public_url(token),
            'regenerated': regenerate,
        })


class EmpresaTotemLinkView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, empresa_id):
        return empresa_queryset_for_user(request.user).filter(id=empresa_id).first()

    def _ensure_token(self, empresa, regenerate=False):
        if regenerate or not empresa.totem_token:
            empresa.totem_token = uuid.uuid4()
            empresa.save(update_fields=['totem_token', 'updated_at'])
        return empresa.totem_token

    def _public_url(self, token):
        base = (getattr(settings, 'FRONTEND_PUBLIC_BASE_URL', '') or '').rstrip('/')
        if not base:
            base = 'http://localhost:5173'
        return f'{base}/totem/{token}/'

    def get(self, request, empresa_id):
        empresa = self.get_object(request, empresa_id)
        if not empresa:
            return Response({'detail': 'Empresa não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        token = self._ensure_token(empresa, regenerate=False)
        return Response({
            'empresa_id': empresa.id,
            'empresa_name': empresa.company_name,
            'token': str(token),
            'url': self._public_url(token),
        })

    def post(self, request, empresa_id):
        empresa = self.get_object(request, empresa_id)
        if not empresa:
            return Response({'detail': 'Empresa não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        regenerate = bool(request.data.get('regenerate'))
        token = self._ensure_token(empresa, regenerate=regenerate)
        return Response({
            'empresa_id': empresa.id,
            'empresa_name': empresa.company_name,
            'token': str(token),
            'url': self._public_url(token),
            'regenerated': regenerate,
        })


class TotemPublicView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, FormParser]

    def get(self, request, token):
        empresa = Empresa.objects.filter(totem_token=token, is_active=True).first()
        if not empresa:
            return Response({'detail': 'Totem não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        ghes_qs = Ghe.objects.filter(empresa=empresa, is_active=True).prefetch_related('setores').order_by('name')
        ghes = [
            {'id': g.id, 'name': g.name, 'setor_ids': [s.id for s in g.setores.all()]}
            for g in ghes_qs
        ]
        setores = list(Setor.objects.filter(empresa=empresa, is_active=True).order_by('name').values('id', 'name'))
        cargos_qs = Cargo.objects.filter(empresa=empresa, is_active=True).prefetch_related('ghes').order_by('name')
        cargos = [
            {'id': c.id, 'name': c.name, 'ghe_ids': [g.id for g in c.ghes.all()]}
            for c in cargos_qs
        ]
        responsaveis_tecnicos = []
        try:
            cfg = empresa.consultor.consultoria_configuracao
            responsaveis_tecnicos = list(
                cfg.responsaveis_tecnicos.filter(responsavel_totem=True).order_by('id').values('nome', 'formacao', 'registro')
            )
        except Exception:
            pass
        return Response({
            'empresa_id': empresa.id,
            'empresa_name': empresa.company_name,
            'token': str(token),
            'ghes': ghes,
            'setores': setores,
            'cargos': cargos,
            'responsaveis_tecnicos': responsaveis_tecnicos,
        })

    def post(self, request, token):
        empresa = Empresa.objects.filter(totem_token=token, is_active=True).first()
        if not empresa:
            return Response({'detail': 'Totem nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        data = {
            'possui_vinculo': request.data.get('possui_vinculo'),
            'deseja_identificar': request.data.get('deseja_identificar'),
            'contato_identificacao': request.data.get('contato_identificacao'),
            'ghe_id': request.data.get('ghe_id') or None,
            'cargo_id': request.data.get('cargo_id') or None,
            'tipo': request.data.get('tipo'),
            'relato': request.data.get('relato'),
            'testemunhas': request.data.get('testemunhas'),
            'aceita_devolutiva': request.data.get('aceita_devolutiva'),
            'email_devolutiva': request.data.get('email_devolutiva'),
        }
        serializer = CanalDenunciaPublicSerializer(data=data, context={'empresa': empresa})
        serializer.is_valid(raise_exception=True)
        denuncia = serializer.save(empresa=empresa, origem=CanalDenuncia.Origem.TOTEM)
        return Response(
            {
                'message': 'Denuncia recebida com sucesso.',
                'denuncia_id': denuncia.id,
                'created_at': denuncia.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class RegistroHumorPublicView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, FormParser]

    def post(self, request, token):
        empresa = Empresa.objects.filter(totem_token=token, is_active=True).first()
        if not empresa:
            return Response({'detail': 'Totem não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = RegistroHumorPublicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registro = serializer.save(empresa=empresa)
        return Response(
            {
                'message': 'Humor registrado com sucesso.',
                'id': registro.id,
                'created_at': registro.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class PedidoAjudaPublicView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, FormParser]

    def post(self, request, token):
        empresa = Empresa.objects.filter(totem_token=token, is_active=True).first()
        if not empresa:
            return Response({'detail': 'Totem não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PedidoAjudaPublicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pedido = serializer.save(empresa=empresa)
        return Response(
            {
                'message': 'Pedido enviado com sucesso.',
                'id': pedido.id,
                'created_at': pedido.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class EmpresaPedidosAjudaListView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get(self, request, empresa_id):
        empresa = empresa_queryset_for_user(request.user).filter(id=empresa_id).first()
        if not empresa:
            return Response({'detail': 'Empresa não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        qs = (
            PedidoAjuda.objects
            .filter(empresa=empresa)
            .select_related('ghe', 'funcao')
            .prefetch_related('atualizacoes__criado_por')
            .order_by('-created_at')
        )
        serializer = PedidoAjudaListSerializer(qs, many=True)
        return Response({
            'empresa_id': empresa.id,
            'empresa_name': empresa.company_name,
            'count': qs.count(),
            'results': serializer.data,
        })


class EmpresaPedidoAjudaDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, empresa_id, pedido_id):
        empresa = empresa_queryset_for_user(request.user).filter(id=empresa_id).first()
        if not empresa:
            return None, None
        pedido = (
            PedidoAjuda.objects
            .filter(id=pedido_id, empresa=empresa)
            .select_related('ghe', 'funcao')
            .prefetch_related('atualizacoes__criado_por')
            .first()
        )
        return empresa, pedido

    def patch(self, request, empresa_id, pedido_id):
        empresa, pedido = self.get_object(request, empresa_id, pedido_id)
        if not empresa:
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if not pedido:
            return Response({'detail': 'Pedido de ajuda nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PedidoAjudaStatusUpdateSerializer(pedido, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        pedido = serializer.save()
        return Response(PedidoAjudaListSerializer(pedido).data)


class EmpresaPedidoAjudaAtualizacaoCreateView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_pedido(self, request, empresa_id, pedido_id):
        empresa = empresa_queryset_for_user(request.user).filter(id=empresa_id).first()
        if not empresa:
            return None, None
        pedido = PedidoAjuda.objects.filter(id=pedido_id, empresa=empresa).first()
        return empresa, pedido

    def post(self, request, empresa_id, pedido_id):
        empresa, pedido = self.get_pedido(request, empresa_id, pedido_id)
        if not empresa:
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if not pedido:
            return Response({'detail': 'Pedido de ajuda nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PedidoAjudaAtualizacaoCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(pedido=pedido, criado_por=request.user)
        pedido = (
            PedidoAjuda.objects
            .filter(id=pedido.id)
            .select_related('ghe', 'funcao')
            .prefetch_related('atualizacoes__criado_por')
            .first()
        )
        return Response(PedidoAjudaListSerializer(pedido).data, status=status.HTTP_201_CREATED)


def _build_ajuda_pdf_response(pedido):
    from datetime import datetime
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4
    mx = 20 * mm

    dark = colors.HexColor('#111827')
    gray = colors.HexColor('#6b7280')
    slate = colors.HexColor('#374151')
    blue = colors.HexColor('#1e40af')
    border_col = colors.HexColor('#e5e7eb')
    bg_light = colors.HexColor('#f8fafc')

    STATUS_COLORS = {
        'ABERTO': colors.HexColor('#dc2626'),
        'EM_ATENDIMENTO': colors.HexColor('#d97706'),
        'ATENDIDO': colors.HexColor('#16a34a'),
    }
    STATUS_LABELS = {'ABERTO': 'ABERTO', 'EM_ATENDIMENTO': 'EM ATENDIMENTO', 'ATENDIDO': 'ATENDIDO'}

    now_str = datetime.now().strftime('%d/%m/%Y %H:%M')
    created_local = pedido.created_at.astimezone()
    date_str = created_local.strftime('%d/%m/%Y às %H:%M')

    page_num = [0]

    def draw_page_frame():
        page_num[0] += 1
        c.setFillColor(colors.HexColor('#111827'))
        c.rect(0, h - 18 * mm, w, 18 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 10)
        c.drawString(mx, h - 11 * mm, 'RELATÓRIO DE AUDITORIA — PEDIDOS DE AJUDA')
        c.setFont('Helvetica', 8)
        c.drawRightString(w - mx, h - 11 * mm, f'CONFIDENCIAL  •  Pág. {page_num[0]}')
        c.setFillColor(colors.HexColor('#f1f5f9'))
        c.rect(0, 0, w, 12 * mm, stroke=0, fill=1)
        c.setFillColor(colors.HexColor('#9ca3af'))
        c.setFont('Helvetica', 7)
        c.drawString(mx, 6.5 * mm, f'Gerado em: {now_str}  •  Documento confidencial para auditoria interna')
        c.drawRightString(w - mx, 6.5 * mm, f'Pedido #{pedido.id}  •  {pedido.empresa.company_name}')

    def new_page():
        c.showPage()
        draw_page_frame()
        return h - 24 * mm

    def wrap_text(text, font_name, font_size, max_width):
        paragraphs = str(text or '').replace('\r\n', '\n').replace('\r', '\n').split('\n')
        all_lines = []
        for para in paragraphs:
            if not para.strip():
                all_lines.append('')
                continue
            words = para.split()
            current = ''
            for word in words:
                test = (current + ' ' + word).strip()
                if c.stringWidth(test, font_name, font_size) <= max_width:
                    current = test
                else:
                    if current:
                        all_lines.append(current)
                    current = word
            if current:
                all_lines.append(current)
        return all_lines or ['']

    def draw_section_title(y, title, ul_width_mm=40):
        c.setFillColor(dark)
        c.setFont('Helvetica-Bold', 11)
        c.drawString(mx, y, title)
        y -= 2 * mm
        c.setStrokeColor(blue)
        c.setLineWidth(1.5)
        c.line(mx, y, mx + ul_width_mm * mm, y)
        return y - 5 * mm

    def draw_text_block(y, lines, font_size=9, lh=5.5):
        for line in lines:
            if y < 20 * mm:
                y = new_page()
            c.setFillColor(slate)
            c.setFont('Helvetica', font_size)
            if line:
                c.drawString(mx, y, line)
            y -= lh * mm
        return y

    draw_page_frame()
    y = h - 24 * mm

    c.setFillColor(blue)
    c.setFont('Helvetica-Bold', 15)
    c.drawString(mx, y, pedido.empresa.company_name)
    y -= 6 * mm
    c.setFillColor(gray)
    c.setFont('Helvetica', 9)
    c.drawString(mx, y, 'Pedidos de Ajuda — Relatório de Auditoria')
    y -= 10 * mm

    c.setStrokeColor(border_col)
    c.setLineWidth(0.8)
    c.line(mx, y, w - mx, y)
    y -= 8 * mm

    c.setFillColor(dark)
    c.setFont('Helvetica-Bold', 20)
    c.drawString(mx, y, f'Pedido de Ajuda #{pedido.id}')

    pill_color = STATUS_COLORS.get(pedido.status, colors.HexColor('#6b7280'))
    pill_label = STATUS_LABELS.get(pedido.status, pedido.status)
    pill_w = c.stringWidth(pill_label, 'Helvetica-Bold', 9) + 10 * mm
    pill_x = w - mx - pill_w
    c.setFillColor(pill_color)
    c.roundRect(pill_x, y - 1.5 * mm, pill_w, 7 * mm, 3 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 9)
    c.drawCentredString(pill_x + pill_w / 2, y + 1.5 * mm, pill_label)
    y -= 10 * mm

    c.setFillColor(gray)
    c.setFont('Helvetica', 9)
    c.drawString(mx, y, f'Registrado em: {date_str}')
    y -= 10 * mm

    details_items = [
        ('Nome', pedido.nome or '—'),
        ('Contato', pedido.contato or '—'),
        ('GHE', pedido.ghe.name if pedido.ghe else '—'),
        ('Função / Cargo', pedido.funcao.name if pedido.funcao else '—'),
    ]

    box_rows = (len(details_items) + 1) // 2
    box_h = box_rows * 10 * mm + 4 * mm
    c.setFillColor(bg_light)
    c.rect(mx, y - box_h, w - 2 * mx, box_h, stroke=0, fill=1)
    c.setStrokeColor(border_col)
    c.setLineWidth(0.5)
    c.rect(mx, y - box_h, w - 2 * mx, box_h, stroke=1, fill=0)

    col_w = (w - 2 * mx) / 2
    ry = y - 6 * mm
    for i, (label, value) in enumerate(details_items):
        col_x = mx + (col_w if i % 2 == 1 else 0) + 4 * mm
        cell_y = ry - (i // 2) * 10 * mm
        c.setFillColor(gray)
        c.setFont('Helvetica', 7)
        c.drawString(col_x, cell_y + 3.5 * mm, label.upper())
        c.setFillColor(dark)
        c.setFont('Helvetica-Bold', 9)
        max_val_w = col_w - 8 * mm
        val_str = str(value)
        while c.stringWidth(val_str, 'Helvetica-Bold', 9) > max_val_w and len(val_str) > 4:
            val_str = val_str[:-1]
        if val_str != str(value):
            val_str = val_str[:-3] + '...'
        c.drawString(col_x, cell_y, val_str)

    y -= box_h + 8 * mm

    atualizacoes = list(pedido.atualizacoes.order_by('created_at').all())
    if atualizacoes:
        if y < 60 * mm:
            y = new_page()
        y = draw_section_title(y, f'Histórico de Atualizações ({len(atualizacoes)})', ul_width_mm=74)

        for atu in atualizacoes:
            atu_local = atu.created_at.astimezone()
            atu_date = atu_local.strftime('%d/%m/%Y %H:%M')
            por = getattr(atu.criado_por, 'email', '') if atu.criado_por_id else 'Sistema'

            text_max_w = w - 2 * mx - 10 * mm
            atu_lines = wrap_text(atu.texto, 'Helvetica', 9, text_max_w)
            header_h = 11 * mm
            body_h = len(atu_lines) * 5.2 * mm + 3 * mm
            card_h = header_h + body_h

            if y - card_h < 20 * mm:
                y = new_page()

            card_y = y - card_h

            c.setFillColor(colors.HexColor('#f8fafc'))
            c.rect(mx, card_y, w - 2 * mx, card_h, stroke=0, fill=1)
            c.setStrokeColor(colors.HexColor('#cbd5e1'))
            c.setLineWidth(0.5)
            c.rect(mx, card_y, w - 2 * mx, card_h, stroke=1, fill=0)

            c.setFillColor(blue)
            c.rect(mx, card_y, 2.5 * mm, card_h, stroke=0, fill=1)

            sep_y = y - header_h
            c.setStrokeColor(colors.HexColor('#e2e8f0'))
            c.setLineWidth(0.4)
            c.line(mx + 2.5 * mm, sep_y, w - mx, sep_y)

            text_x = mx + 5 * mm
            c.setFillColor(blue)
            c.setFont('Helvetica-Bold', 8.5)
            c.drawString(text_x, y - 4 * mm, atu_date)
            c.setFillColor(gray)
            c.setFont('Helvetica', 7.5)
            c.drawString(text_x, y - 8.5 * mm, f'Por: {por}')

            ty = sep_y - 4 * mm
            for line in atu_lines:
                c.setFillColor(slate)
                c.setFont('Helvetica', 9)
                if line:
                    c.drawString(text_x, ty, line)
                ty -= 5.2 * mm

            y = card_y - 4 * mm

    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="pedido-ajuda-{pedido.id}-auditoria.pdf"'
    return response


class EmpresaPedidoAjudaPdfView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get(self, request, empresa_id, pedido_id):
        empresa = empresa_queryset_for_user(request.user).filter(id=empresa_id).first()
        if not empresa:
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        pedido = (
            PedidoAjuda.objects
            .filter(id=pedido_id, empresa=empresa)
            .select_related('empresa', 'ghe', 'funcao')
            .prefetch_related('atualizacoes__criado_por')
            .first()
        )
        if not pedido:
            return Response({'detail': 'Pedido de ajuda nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return _build_ajuda_pdf_response(pedido)


class CanalDenunciasPublicView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def get_empresa(self, token):
        return Empresa.objects.filter(canal_denuncias_token=token, is_active=True).first()

    def get(self, request, token):
        empresa = self.get_empresa(token)
        if not empresa:
            return Response({'detail': 'Canal de denúncias não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        ghes = list(Ghe.objects.filter(empresa=empresa, is_active=True).order_by('name').values('id', 'name'))
        cargos_qs = Cargo.objects.filter(empresa=empresa, is_active=True).prefetch_related('ghes').order_by('name')
        cargos = [
            {'id': c.id, 'name': c.name, 'ghe_ids': [g.id for g in c.ghes.all()]}
            for c in cargos_qs
        ]
        return Response({
            'empresa_id': empresa.id,
            'empresa_name': empresa.company_name,
            'token': str(token),
            'accepts_file': True,
            'max_file_size_mb': 20,
            'ghes': ghes,
            'cargos': cargos,
        })

    def post(self, request, token):
        empresa = self.get_empresa(token)
        if not empresa:
            return Response({'detail': 'Canal de denúncias não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        file_obj = request.FILES.get('evidencia_arquivo')
        if file_obj and file_obj.size > 20 * 1024 * 1024:
            return Response({'detail': 'Arquivo excede 20MB.'}, status=status.HTTP_400_BAD_REQUEST)

        data = {
            'possui_vinculo': request.data.get('possui_vinculo'),
            'deseja_identificar': request.data.get('deseja_identificar'),
            'contato_identificacao': request.data.get('contato_identificacao'),
            'ghe_id': request.data.get('ghe_id') or None,
            'cargo_id': request.data.get('cargo_id') or None,
            'tipo': request.data.get('tipo'),
            'relato': request.data.get('relato'),
            'testemunhas': request.data.get('testemunhas'),
            'aceita_devolutiva': request.data.get('aceita_devolutiva'),
            'email_devolutiva': request.data.get('email_devolutiva'),
            'evidencia_arquivo': file_obj,
        }
        serializer = CanalDenunciaPublicSerializer(data=data, context={'empresa': empresa})
        serializer.is_valid(raise_exception=True)
        denuncia = serializer.save(empresa=empresa, origem=CanalDenuncia.Origem.LINK)
        return Response(
            {
                'message': 'Denuncia recebida com sucesso.',
                'denuncia_id': denuncia.id,
                'created_at': denuncia.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class EmpresaCanalDenunciasListView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_empresa(self, request, empresa_id):
        return empresa_queryset_for_user(request.user).filter(id=empresa_id).first()

    def get(self, request, empresa_id):
        empresa = self.get_empresa(request, empresa_id)
        if not empresa:
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        qs = (
            CanalDenuncia.objects
            .filter(empresa=empresa)
            .select_related('empresa', 'ghe', 'cargo_funcao')
            .prefetch_related('atualizacoes__criado_por')
            .order_by('-created_at')
        )
        serializer = CanalDenunciaListSerializer(qs, many=True, context={'request': request})
        return Response({
            'empresa_id': empresa.id,
            'empresa_name': empresa.company_name,
            'count': qs.count(),
            'results': serializer.data,
        })


class EmpresaCanalDenunciaDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, empresa_id, denuncia_id):
        empresa = empresa_queryset_for_user(request.user).filter(id=empresa_id).first()
        if not empresa:
            return None, None
        denuncia = (
            CanalDenuncia.objects
            .filter(id=denuncia_id, empresa=empresa)
            .select_related('empresa', 'ghe', 'cargo_funcao')
            .prefetch_related('atualizacoes__criado_por')
            .first()
        )
        return empresa, denuncia

    def patch(self, request, empresa_id, denuncia_id):
        empresa, denuncia = self.get_object(request, empresa_id, denuncia_id)
        if not empresa:
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if not denuncia:
            return Response({'detail': 'Denuncia nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CanalDenunciaStatusUpdateSerializer(denuncia, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        denuncia = serializer.save()
        return Response(CanalDenunciaListSerializer(denuncia, context={'request': request}).data)


class EmpresaCanalDenunciaAtualizacaoCreateView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_denuncia(self, request, empresa_id, denuncia_id):
        empresa = empresa_queryset_for_user(request.user).filter(id=empresa_id).first()
        if not empresa:
            return None, None
        denuncia = CanalDenuncia.objects.filter(id=denuncia_id, empresa=empresa).first()
        return empresa, denuncia

    def post(self, request, empresa_id, denuncia_id):
        empresa, denuncia = self.get_denuncia(request, empresa_id, denuncia_id)
        if not empresa:
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if not denuncia:
            return Response({'detail': 'Denuncia nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CanalDenunciaAtualizacaoCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(denuncia=denuncia, criado_por=request.user)
        denuncia = (
            CanalDenuncia.objects
            .filter(id=denuncia.id)
            .select_related('empresa', 'ghe', 'cargo_funcao')
            .prefetch_related('atualizacoes__criado_por')
            .first()
        )
        return Response(CanalDenunciaListSerializer(denuncia, context={'request': request}).data, status=status.HTTP_201_CREATED)


def _build_denuncia_pdf_response(denuncia):
    from datetime import datetime
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4
    mx = 20 * mm

    dark = colors.HexColor('#111827')
    gray = colors.HexColor('#6b7280')
    slate = colors.HexColor('#374151')
    blue = colors.HexColor('#1e40af')
    border_col = colors.HexColor('#e5e7eb')
    bg_light = colors.HexColor('#f8fafc')

    STATUS_COLORS = {
        'ABERTA': colors.HexColor('#dc2626'),
        'EM_ANALISE': colors.HexColor('#d97706'),
        'RESOLVIDA': colors.HexColor('#16a34a'),
    }
    STATUS_LABELS = {'ABERTA': 'ABERTA', 'EM_ANALISE': 'EM ANÁLISE', 'RESOLVIDA': 'RESOLVIDA'}

    now_str = datetime.now().strftime('%d/%m/%Y %H:%M')
    created_local = denuncia.created_at.astimezone()
    date_str = created_local.strftime('%d/%m/%Y às %H:%M')
    origem_label = {'LINK': 'Link de Denúncia', 'TOTEM': 'Totem'}.get(denuncia.origem, denuncia.origem)

    page_num = [0]

    def draw_page_frame():
        page_num[0] += 1
        c.setFillColor(colors.HexColor('#111827'))
        c.rect(0, h - 18 * mm, w, 18 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 10)
        c.drawString(mx, h - 11 * mm, 'RELATÓRIO DE AUDITORIA — CANAL DE DENÚNCIAS')
        c.setFont('Helvetica', 8)
        c.drawRightString(w - mx, h - 11 * mm, f'CONFIDENCIAL  •  Pág. {page_num[0]}')
        c.setFillColor(colors.HexColor('#f1f5f9'))
        c.rect(0, 0, w, 12 * mm, stroke=0, fill=1)
        c.setFillColor(colors.HexColor('#9ca3af'))
        c.setFont('Helvetica', 7)
        c.drawString(mx, 6.5 * mm, f'Gerado em: {now_str}  •  Documento confidencial para auditoria interna')
        c.drawRightString(w - mx, 6.5 * mm, f'Denúncia #{denuncia.id}  •  {denuncia.empresa.company_name}')

    def new_page():
        c.showPage()
        draw_page_frame()
        return h - 24 * mm

    def wrap_text(text, font_name, font_size, max_width):
        paragraphs = str(text or '').replace('\r\n', '\n').replace('\r', '\n').split('\n')
        all_lines = []
        for para in paragraphs:
            if not para.strip():
                all_lines.append('')
                continue
            words = para.split()
            current = ''
            for word in words:
                test = (current + ' ' + word).strip()
                if c.stringWidth(test, font_name, font_size) <= max_width:
                    current = test
                else:
                    if current:
                        all_lines.append(current)
                    current = word
            if current:
                all_lines.append(current)
        return all_lines or ['']

    def draw_section_title(y, title, ul_width_mm=40):
        c.setFillColor(dark)
        c.setFont('Helvetica-Bold', 11)
        c.drawString(mx, y, title)
        y -= 2 * mm
        c.setStrokeColor(blue)
        c.setLineWidth(1.5)
        c.line(mx, y, mx + ul_width_mm * mm, y)
        return y - 5 * mm

    def draw_text_block(y, lines, font_size=9, lh=5.5):
        for line in lines:
            if y < 20 * mm:
                y = new_page()
            c.setFillColor(slate)
            c.setFont('Helvetica', font_size)
            if line:
                c.drawString(mx, y, line)
            y -= lh * mm
        return y

    # ── Page 1 ──
    draw_page_frame()
    y = h - 24 * mm

    # Company name
    c.setFillColor(blue)
    c.setFont('Helvetica-Bold', 15)
    c.drawString(mx, y, denuncia.empresa.company_name)
    y -= 6 * mm
    c.setFillColor(gray)
    c.setFont('Helvetica', 9)
    c.drawString(mx, y, 'Canal de Denúncias Interno  —  Relatório de Auditoria')
    y -= 10 * mm

    c.setStrokeColor(border_col)
    c.setLineWidth(0.8)
    c.line(mx, y, w - mx, y)
    y -= 8 * mm

    # ID
    c.setFillColor(dark)
    c.setFont('Helvetica-Bold', 20)
    c.drawString(mx, y, f'Denúncia #{denuncia.id}')

    # Status pill
    pill_color = STATUS_COLORS.get(denuncia.status, colors.HexColor('#6b7280'))
    pill_label = STATUS_LABELS.get(denuncia.status, denuncia.status)
    pill_w = c.stringWidth(pill_label, 'Helvetica-Bold', 9) + 10 * mm
    pill_x = w - mx - pill_w
    c.setFillColor(pill_color)
    c.roundRect(pill_x, y - 1.5 * mm, pill_w, 7 * mm, 3 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 9)
    c.drawCentredString(pill_x + pill_w / 2, y + 1.5 * mm, pill_label)
    y -= 10 * mm

    c.setFillColor(gray)
    c.setFont('Helvetica', 9)
    c.drawString(mx, y, f'Registrada em: {date_str}   •   Origem: {origem_label}')
    y -= 10 * mm

    # ── Details box ──
    details_items = [
        ('Tipo de denúncia', denuncia.get_tipo_display() or 'Outros'),
        ('GHE', denuncia.ghe.name if denuncia.ghe else '—'),
        ('Função / Cargo', denuncia.cargo_funcao.name if denuncia.cargo_funcao else '—'),
        ('Vínculo empregatício', 'Sim' if denuncia.possui_vinculo else 'Não'),
        (
            'Denunciante identificado',
            ('Sim — ' + denuncia.contato_identificacao)
            if (denuncia.deseja_identificar and denuncia.contato_identificacao)
            else ('Sim' if denuncia.deseja_identificar else 'Não'),
        ),
        (
            'Devolutiva solicitada',
            ('Sim — ' + denuncia.email_devolutiva)
            if (denuncia.aceita_devolutiva and denuncia.email_devolutiva)
            else ('Sim' if denuncia.aceita_devolutiva else 'Não'),
        ),
    ]

    box_rows = (len(details_items) + 1) // 2
    box_h = box_rows * 10 * mm + 4 * mm
    c.setFillColor(bg_light)
    c.rect(mx, y - box_h, w - 2 * mx, box_h, stroke=0, fill=1)
    c.setStrokeColor(border_col)
    c.setLineWidth(0.5)
    c.rect(mx, y - box_h, w - 2 * mx, box_h, stroke=1, fill=0)

    col_w = (w - 2 * mx) / 2
    ry = y - 6 * mm
    for i, (label, value) in enumerate(details_items):
        col_x = mx + (col_w if i % 2 == 1 else 0) + 4 * mm
        cell_y = ry - (i // 2) * 10 * mm
        c.setFillColor(gray)
        c.setFont('Helvetica', 7)
        c.drawString(col_x, cell_y + 3.5 * mm, label.upper())
        c.setFillColor(dark)
        c.setFont('Helvetica-Bold', 9)
        max_val_w = col_w - 8 * mm
        val_str = str(value)
        while c.stringWidth(val_str, 'Helvetica-Bold', 9) > max_val_w and len(val_str) > 4:
            val_str = val_str[:-1]
        if val_str != str(value):
            val_str = val_str[:-3] + '...'
        c.drawString(col_x, cell_y, val_str)

    y -= box_h + 8 * mm

    # ── Relato ──
    if y < 50 * mm:
        y = new_page()
    y = draw_section_title(y, 'Relato', ul_width_mm=13)
    relato_lines = wrap_text(denuncia.relato, 'Helvetica', 9, w - 2 * mx)
    y = draw_text_block(y, relato_lines)

    # ── Testemunhas ──
    if denuncia.testemunhas and denuncia.testemunhas.strip():
        y -= 6 * mm
        if y < 50 * mm:
            y = new_page()
        y = draw_section_title(y, 'Testemunhas', ul_width_mm=26)
        y = draw_text_block(y, wrap_text(denuncia.testemunhas, 'Helvetica', 9, w - 2 * mx))

    # ── Histórico de Atualizações ──
    atualizacoes = list(denuncia.atualizacoes.order_by('created_at').all())
    if atualizacoes:
        y -= 8 * mm
        if y < 60 * mm:
            y = new_page()
        y = draw_section_title(y, f'Histórico de Atualizações ({len(atualizacoes)})', ul_width_mm=74)

        for atu in atualizacoes:
            atu_local = atu.created_at.astimezone()
            atu_date = atu_local.strftime('%d/%m/%Y %H:%M')
            por = getattr(atu.criado_por, 'email', '') if atu.criado_por_id else 'Sistema'

            # Pre-calculate body lines and total card height
            text_max_w = w - 2 * mx - 10 * mm
            atu_lines = wrap_text(atu.texto, 'Helvetica', 9, text_max_w)
            header_h = 11 * mm
            body_h = len(atu_lines) * 5.2 * mm + 3 * mm
            card_h = header_h + body_h

            if y - card_h < 20 * mm:
                y = new_page()

            card_y = y - card_h  # bottom edge of the full card

            # Outer card background + border
            c.setFillColor(colors.HexColor('#f8fafc'))
            c.rect(mx, card_y, w - 2 * mx, card_h, stroke=0, fill=1)
            c.setStrokeColor(colors.HexColor('#cbd5e1'))
            c.setLineWidth(0.5)
            c.rect(mx, card_y, w - 2 * mx, card_h, stroke=1, fill=0)

            # Blue left accent bar
            c.setFillColor(blue)
            c.rect(mx, card_y, 2.5 * mm, card_h, stroke=0, fill=1)

            # Separator line between header and body
            sep_y = y - header_h
            c.setStrokeColor(colors.HexColor('#e2e8f0'))
            c.setLineWidth(0.4)
            c.line(mx + 2.5 * mm, sep_y, w - mx, sep_y)

            # Header: date (bold) + author
            text_x = mx + 5 * mm
            c.setFillColor(blue)
            c.setFont('Helvetica-Bold', 8.5)
            c.drawString(text_x, y - 4 * mm, atu_date)
            c.setFillColor(gray)
            c.setFont('Helvetica', 7.5)
            c.drawString(text_x, y - 8.5 * mm, f'Por: {por}')

            # Body text
            ty = sep_y - 4 * mm
            for line in atu_lines:
                c.setFillColor(slate)
                c.setFont('Helvetica', 9)
                if line:
                    c.drawString(text_x, ty, line)
                ty -= 5.2 * mm

            y = card_y - 4 * mm  # gap between cards

    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="denuncia-{denuncia.id}-auditoria.pdf"'
    return response


class EmpresaCanalDenunciaPdfView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get(self, request, empresa_id, denuncia_id):
        empresa = empresa_queryset_for_user(request.user).filter(id=empresa_id).first()
        if not empresa:
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        denuncia = (
            CanalDenuncia.objects
            .filter(id=denuncia_id, empresa=empresa)
            .select_related('empresa', 'ghe', 'cargo_funcao')
            .prefetch_related('atualizacoes__criado_por')
            .first()
        )
        if not denuncia:
            return Response({'detail': 'Denuncia nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        return _build_denuncia_pdf_response(denuncia)


class SetorListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_queryset(self, request):
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return Setor.objects.select_related('empresa').all()
        return Setor.objects.select_related('empresa').filter(empresa__consultor=request.user)

    def get(self, request):
        serializer = SetorSerializer(self.get_queryset(request), many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SetorSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        setor = serializer.save()
        return Response(SetorSerializer(setor).data, status=status.HTTP_201_CREATED)


class SetorDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, setor_id):
        queryset = Setor.objects.select_related('empresa').filter(id=setor_id)
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return queryset.first()
        return queryset.filter(empresa__consultor=request.user).first()

    def get(self, request, setor_id):
        setor = self.get_object(request, setor_id)
        if not setor:
            return Response({'detail': 'Setor nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SetorSerializer(setor).data)

    def patch(self, request, setor_id):
        setor = self.get_object(request, setor_id)
        if not setor:
            return Response({'detail': 'Setor nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = SetorSerializer(setor, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        setor = serializer.save()
        return Response(SetorSerializer(setor).data)

    def put(self, request, setor_id):
        setor = self.get_object(request, setor_id)
        if not setor:
            return Response({'detail': 'Setor nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = SetorSerializer(setor, data=request.data, partial=False, context={'request': request})
        serializer.is_valid(raise_exception=True)
        setor = serializer.save()
        return Response(SetorSerializer(setor).data)

    def delete(self, request, setor_id):
        setor = self.get_object(request, setor_id)
        if not setor:
            return Response({'detail': 'Setor nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        setor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GheListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def _base_queryset(self):
        return Ghe.objects.select_related('empresa').prefetch_related(
            Prefetch('setores', queryset=Setor.objects.order_by('name'))
        )

    def get_queryset(self, request):
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return self._base_queryset().all()
        return self._base_queryset().filter(empresa__consultor=request.user)

    def get(self, request):
        serializer = GheSerializer(self.get_queryset(request), many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = GheSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        ghe = serializer.save()
        return Response(GheSerializer(ghe).data, status=status.HTTP_201_CREATED)


class GheDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, ghe_id):
        queryset = Ghe.objects.select_related('empresa').prefetch_related(
            Prefetch('setores', queryset=Setor.objects.order_by('name'))
        ).filter(id=ghe_id)
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return queryset.first()
        return queryset.filter(empresa__consultor=request.user).first()

    def get(self, request, ghe_id):
        ghe = self.get_object(request, ghe_id)
        if not ghe:
            return Response({'detail': 'GHE nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(GheSerializer(ghe).data)

    def patch(self, request, ghe_id):
        ghe = self.get_object(request, ghe_id)
        if not ghe:
            return Response({'detail': 'GHE nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = GheSerializer(ghe, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        ghe = serializer.save()
        return Response(GheSerializer(ghe).data)

    def put(self, request, ghe_id):
        ghe = self.get_object(request, ghe_id)
        if not ghe:
            return Response({'detail': 'GHE nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = GheSerializer(ghe, data=request.data, partial=False, context={'request': request})
        serializer.is_valid(raise_exception=True)
        ghe = serializer.save()
        return Response(GheSerializer(ghe).data)

    def delete(self, request, ghe_id):
        ghe = self.get_object(request, ghe_id)
        if not ghe:
            return Response({'detail': 'GHE nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        ghe.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CargoListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def _base_queryset(self):
        return Cargo.objects.select_related('empresa').prefetch_related(
            Prefetch('setores', queryset=Setor.objects.order_by('name')),
            Prefetch('ghes', queryset=Ghe.objects.order_by('name')),
        )

    def get_queryset(self, request):
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return self._base_queryset().all()
        return self._base_queryset().filter(empresa__consultor=request.user)

    def get(self, request):
        serializer = CargoSerializer(self.get_queryset(request), many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CargoSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        cargo = serializer.save()
        return Response(CargoSerializer(cargo).data, status=status.HTTP_201_CREATED)


class CargoDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, cargo_id):
        queryset = Cargo.objects.select_related('empresa').prefetch_related(
            Prefetch('setores', queryset=Setor.objects.order_by('name')),
            Prefetch('ghes', queryset=Ghe.objects.order_by('name')),
        ).filter(id=cargo_id)
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return queryset.first()
        return queryset.filter(empresa__consultor=request.user).first()

    def get(self, request, cargo_id):
        cargo = self.get_object(request, cargo_id)
        if not cargo:
            return Response({'detail': 'Cargo nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CargoSerializer(cargo).data)

    def patch(self, request, cargo_id):
        cargo = self.get_object(request, cargo_id)
        if not cargo:
            return Response({'detail': 'Cargo nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CargoSerializer(cargo, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        cargo = serializer.save()
        return Response(CargoSerializer(cargo).data)

    def put(self, request, cargo_id):
        cargo = self.get_object(request, cargo_id)
        if not cargo:
            return Response({'detail': 'Cargo nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CargoSerializer(cargo, data=request.data, partial=False, context={'request': request})
        serializer.is_valid(raise_exception=True)
        cargo = serializer.save()
        return Response(CargoSerializer(cargo).data)

    def delete(self, request, cargo_id):
        cargo = self.get_object(request, cargo_id)
        if not cargo:
            return Response({'detail': 'Cargo nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        cargo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CampanhaListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_queryset(self, request):
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return Campanha.objects.select_related('empresa').all()
        return Campanha.objects.select_related('empresa').filter(empresa__consultor=request.user)

    def get(self, request):
        serializer = CampanhaSerializer(self.get_queryset(request), many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CampanhaSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        campanha = serializer.save()
        return Response(CampanhaSerializer(campanha).data, status=status.HTTP_201_CREATED)


class CampanhaDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, campanha_id):
        queryset = Campanha.objects.select_related('empresa').filter(id=campanha_id)
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return queryset.first()
        return queryset.filter(empresa__consultor=request.user).first()

    def get(self, request, campanha_id):
        campanha = self.get_object(request, campanha_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CampanhaSerializer(campanha).data)

    def patch(self, request, campanha_id):
        campanha = self.get_object(request, campanha_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CampanhaSerializer(campanha, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        campanha = serializer.save()
        return Response(CampanhaSerializer(campanha).data)

    def put(self, request, campanha_id):
        campanha = self.get_object(request, campanha_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CampanhaSerializer(campanha, data=request.data, partial=False, context={'request': request})
        serializer.is_valid(raise_exception=True)
        campanha = serializer.save()
        return Response(CampanhaSerializer(campanha).data)

    def delete(self, request, campanha_id):
        campanha = self.get_object(request, campanha_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        campanha.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CampanhaRelatorioView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, campanha_id):
        queryset = Campanha.objects.select_related('empresa').filter(id=campanha_id)
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return queryset.first()
        return queryset.filter(empresa__consultor=request.user).first()

    def get(self, request, campanha_id):
        campanha = self.get_object(request, campanha_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        empresa = campanha.empresa
        ref_field = 'setor_id' if empresa.evaluation_type == 'SETOR' else 'ghe_id'
        ref_label = 'Setor' if empresa.evaluation_type == 'SETOR' else 'GHE'
        ref_id = (request.query_params.get('ref_id') or '').strip()  # compatibilidade

        base_step1 = CampanhaRespostaStep1.objects.filter(campanha=campanha, is_completed=True)
        total_completed = base_step1.count()

        if empresa.evaluation_type == 'SETOR':
            available_refs_qs = (
                Setor.objects.filter(empresa=empresa)
                .annotate(response_count=Count('campanha_step1_respostas', filter=Q(campanha_step1_respostas__campanha=campanha, campanha_step1_respostas__is_completed=True)))
                .order_by('name')
            )
        else:
            available_refs_qs = (
                Ghe.objects.filter(empresa=empresa)
                .annotate(response_count=Count('campanha_step1_respostas', filter=Q(campanha_step1_respostas__campanha=campanha, campanha_step1_respostas__is_completed=True)))
                .order_by('name')
            )

        available_refs = [{'id': x.id, 'name': x.name, 'response_count': x.response_count} for x in available_refs_qs]

        overall_bundle = _build_report_bundle(campanha, empresa, base_step1)

        per_ref = []
        for ref in available_refs:
            if not ref.get('response_count'):
                continue
            ref_qs = base_step1.filter(**{ref_field: ref['id']})
            bundle = _build_report_bundle(campanha, empresa, ref_qs)
            per_ref.append(
                {
                    'ref': ref,
                    'summary': bundle['summary'],
                    'domains': bundle['domains'],
                    'steps': bundle['steps'],
                    'step9_comments': bundle['step9_comments'],
                }
            )

        if ref_id:
            try:
                ref_id_int = int(ref_id)
            except ValueError:
                return Response({'detail': f'{ref_label} invalido.'}, status=status.HTTP_400_BAD_REQUEST)
            if not any(x['id'] == ref_id_int for x in available_refs):
                return Response({'detail': f'{ref_label} nao encontrado para esta campanha.'}, status=status.HTTP_404_NOT_FOUND)
            filtered_qs = base_step1.filter(**{ref_field: ref_id_int})
        else:
            ref_id_int = None
            filtered_qs = base_step1

        filtered_bundle = _build_report_bundle(campanha, empresa, filtered_qs)
        filtered_completed = filtered_bundle['summary']['completed_responses']
        medidas = campanha.medidas_preliminares.select_related('setor', 'ghe').all()
        medidas_data = CampanhaMedidaPreliminarSerializer(medidas, many=True).data
        quandos = campanha.quandos_preliminares.select_related('setor', 'ghe').all()
        quandos_data = CampanhaQuandoPreliminarSerializer(quandos, many=True).data
        anexos_data = CampanhaRelatorioAnexoSerializer(campanha.relatorio_anexos.all(), many=True).data

        return Response(
            {
                'campaign': CampanhaSerializer(campanha, context={'request': request}).data,
                'empresa': {
                    'id': empresa.id,
                    'name': empresa.company_name,
                    'employee_count': empresa.employee_count,
                    'evaluation_type': empresa.evaluation_type,
                },
                'filters': {
                    'evaluation_type': empresa.evaluation_type,
                    'ref_label': ref_label,
                    'selected_ref_id': ref_id_int,
                    'available_refs': available_refs,
                },
                'summary': {
                    **filtered_bundle['summary'],
                    'total_completed_all_filters': total_completed,
                },
                'domains': filtered_bundle['domains'],
                'steps': filtered_bundle['steps'],
                'step9_comments': filtered_bundle['step9_comments'],
                'overall': overall_bundle,
                'per_ref': per_ref,
                'preliminary_measures': medidas_data,
                'preliminary_whens': quandos_data,
                'attachments': anexos_data,
            }
        )


def _build_comparativo_pdf_response(camp1, camp2, bundle1, bundle2):
    from datetime import datetime as _dt
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    MARGIN = 18 * mm

    DARK = colors.HexColor('#111827')
    GREEN_H = colors.HexColor('#14532d')
    BLUE = colors.HexColor('#1d4ed8')
    BLUE_LIGHT = colors.HexColor('#eff6ff')
    NAVY = colors.HexColor('#1e3a5f')
    GRAY = colors.HexColor('#6b7280')
    GRAY_LIGHT = colors.HexColor('#f8fafc')
    BORDER = colors.HexColor('#e2e8f0')
    RED_Z = colors.HexColor('#ef4444')
    YELLOW_Z = colors.HexColor('#f59e0b')
    GREEN_Z = colors.HexColor('#22c55e')

    def zone_color(key):
        if key == 'green':
            return GREEN_Z
        if key == 'yellow':
            return YELLOW_Z
        return RED_Z

    def delta_color_fn(d):
        if d > 0.05:
            return GREEN_Z
        if d < -0.05:
            return RED_Z
        return GRAY

    def delta_str_fn(d):
        if abs(d) < 0.05:
            return '='
        return f'+{d:.1f}%' if d > 0 else f'{d:.1f}%'

    def draw_footer(c, page_num):
        c.setFont('Helvetica', 6.5)
        c.setFillColor(GRAY)
        c.drawString(MARGIN, 9 * mm, 'DOCUMENTO CONFIDENCIAL – USO RESTRITO')
        c.drawRightString(width - MARGIN, 9 * mm, f'Página {page_num}')
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.5)
        c.line(MARGIN, 13 * mm, width - MARGIN, 13 * mm)

    q_col_w = 112 * mm
    score_col_w = (width - 2 * MARGIN - q_col_w) / 3
    col_xs = [
        MARGIN,
        MARGIN + q_col_w,
        MARGIN + q_col_w + score_col_w,
        MARGIN + q_col_w + 2 * score_col_w,
    ]

    def draw_cmp_row(c, y_row, label, v1_str, v2_str, delta_val, z1_key='', z2_key='', alt=False):
        row_h = 8 * mm
        if alt:
            c.setFillColor(GRAY_LIGHT)
            c.rect(MARGIN, y_row - row_h, width - 2 * MARGIN, row_h, stroke=0, fill=1)
        c.setFont('Helvetica', 7.5)
        c.setFillColor(DARK)
        c.drawString(col_xs[0] + 2 * mm, y_row - 5.5 * mm, label)
        c.setFont('Helvetica-Bold', 7.5)
        c.setFillColor(zone_color(z1_key) if z1_key else DARK)
        c.drawString(col_xs[1] + 2 * mm, y_row - 5.5 * mm, v1_str)
        c.setFillColor(zone_color(z2_key) if z2_key else DARK)
        c.drawString(col_xs[2] + 2 * mm, y_row - 5.5 * mm, v2_str)
        c.setFillColor(delta_color_fn(delta_val))
        c.drawString(col_xs[3] + 2 * mm, y_row - 5.5 * mm, delta_str_fn(delta_val))
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.3)
        c.line(MARGIN, y_row - row_h, width - MARGIN, y_row - row_h)
        return y_row - row_h

    # ── PAGE 1: COVER ────────────────────────────────────────────────────────
    c.setFillColor(DARK)
    c.rect(0, height - 48 * mm, width, 48 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 14)
    c.drawCentredString(width / 2, height - 20 * mm, 'RELATÓRIO COMPARATIVO')
    c.setFont('Helvetica', 9)
    c.drawCentredString(width / 2, height - 29 * mm, 'AVALIAÇÃO DE FATORES DE RISCO PSICOSSOCIAIS NO TRABALHO')
    c.setFont('Helvetica', 8)
    c.setFillColor(colors.HexColor('#9ca3af'))
    c.drawCentredString(width / 2, height - 38 * mm, camp1.empresa.company_name)

    y = height - 70 * mm
    box_w = (width - 2 * MARGIN - 8 * mm) / 2
    box_h = 30 * mm
    for i, camp in enumerate([camp1, camp2]):
        bx = MARGIN + i * (box_w + 8 * mm)
        c.setFillColor(BLUE_LIGHT)
        c.setStrokeColor(BLUE)
        c.setLineWidth(0.8)
        c.roundRect(bx, y - box_h, box_w, box_h, 3 * mm, stroke=1, fill=1)
        c.setFillColor(BLUE)
        c.setFont('Helvetica-Bold', 7)
        c.drawString(bx + 4 * mm, y - 7 * mm, f'CAMPANHA {i + 1}')
        c.setFillColor(DARK)
        c.setFont('Helvetica-Bold', 8.5)
        label = str(camp.title or '')
        if len(label) > 42:
            label = label[:40] + '...'
        c.drawString(bx + 4 * mm, y - 14 * mm, label)
        c.setFillColor(GRAY)
        c.setFont('Helvetica', 7.5)
        camp_date = camp.start_date.strftime('%d/%m/%Y') if getattr(camp, 'start_date', None) else '–'
        c.drawString(bx + 4 * mm, y - 22 * mm, f'Início: {camp_date}')

    y -= (box_h + 14 * mm)
    c.setFillColor(GRAY)
    c.setFont('Helvetica', 8)
    c.drawCentredString(width / 2, y, f'Relatório gerado em {_dt.now().strftime("%d/%m/%Y às %H:%M")}')
    draw_footer(c, 1)
    c.showPage()

    # ── PAGE 2: EXECUTIVE SUMMARY + DOMAIN TABLE ─────────────────────────────
    page_num = 2
    y = height - MARGIN

    def section_header(c, y, title):
        c.setFillColor(DARK)
        c.rect(MARGIN, y - 7 * mm, width - 2 * MARGIN, 7 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 8)
        c.drawString(MARGIN + 4 * mm, y - 5 * mm, title)
        return y - 12 * mm

    def table_header(c, y, labels):
        c.setFillColor(GREEN_H)
        c.rect(MARGIN, y - 7 * mm, width - 2 * MARGIN, 7 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 7)
        for i, lbl in enumerate(labels):
            c.drawString(col_xs[i] + 2 * mm, y - 5 * mm, lbl)
        return y - 9 * mm

    y = section_header(c, y, 'RESUMO EXECUTIVO – VISÃO COMPARATIVA')
    t1 = (camp1.title or 'Campanha 1')[:24]
    t2 = (camp2.title or 'Campanha 2')[:24]
    y = table_header(c, y, ['INDICADOR', 'Camp. 1', 'Camp. 2', 'VARIAÇÃO'])

    s1 = bundle1.get('summary', {})
    s2 = bundle2.get('summary', {})
    p1 = float(s1.get('company_mean_percent', 0) or 0)
    p2 = float(s2.get('company_mean_percent', 0) or 0)
    sc1 = float(s1.get('company_mean_score', 0) or 0)
    sc2 = float(s2.get('company_mean_score', 0) or 0)
    r1 = int(s1.get('completed_responses', 0) or 0)
    r2 = int(s2.get('completed_responses', 0) or 0)
    sp1 = float(s1.get('sample_percent', 0) or 0)
    sp2 = float(s2.get('sample_percent', 0) or 0)
    z1 = (s1.get('company_zone') or {}).get('key', 'red')
    z2 = (s2.get('company_zone') or {}).get('key', 'red')
    sz1 = (s1.get('sample_zone') or {}).get('key', 'red')
    sz2 = (s2.get('sample_zone') or {}).get('key', 'red')

    exec_rows = [
        ('Média Geral (%)', f'{p1:.1f}%', f'{p2:.1f}%', p2 - p1, z1, z2),
        ('Score Médio (0–5)', f'{sc1:.2f}', f'{sc2:.2f}', sc2 - sc1, '', ''),
        ('Respostas Concluídas', str(r1), str(r2), float(r2 - r1), '', ''),
        ('Amostra da Empresa (%)', f'{sp1:.1f}%', f'{sp2:.1f}%', sp2 - sp1, sz1, sz2),
    ]
    for i, row in enumerate(exec_rows):
        y = draw_cmp_row(c, y, row[0], row[1], row[2], row[3], row[4], row[5], alt=(i % 2 == 1))

    y -= 8 * mm

    # Domain comparison on same page
    y = section_header(c, y, 'COMPARATIVO POR DOMÍNIO')
    y = table_header(c, y, ['DOMÍNIO / BLOCO', 'Camp. 1', 'Camp. 2', 'VARIAÇÃO'])

    domains1 = bundle1.get('domains', [])
    domains2 = bundle2.get('domains', [])
    d2_by_key = {d['key']: d for d in domains2}
    for idx, d1 in enumerate(domains1):
        d2 = d2_by_key.get(d1['key'], {})
        dp1 = float(d1.get('percent', 0) or 0)
        dp2 = float(d2.get('percent', 0) or 0) if d2 else 0.0
        dz1 = (d1.get('zone') or {}).get('key', 'red')
        dz2 = (d2.get('zone') or {}).get('key', 'red') if d2 else 'red'
        y = draw_cmp_row(c, y, str(d1.get('domain', '') or ''), f'{dp1:.1f}%', f'{dp2:.1f}%', dp2 - dp1, dz1, dz2, alt=(idx % 2 == 1))

    draw_footer(c, page_num)
    c.showPage()

    # ── PAGES 3+: PER-DOMAIN QUESTION COMPARISON ─────────────────────────────
    steps1 = bundle1.get('steps', [])
    steps2 = bundle2.get('steps', [])
    s2_by_key = {s['key']: s for s in steps2}
    STEP_NAMES = {
        2: 'Demandas', 3: 'Controle', 4: 'Apoio da Gestão',
        5: 'Suporte dos Colegas', 6: 'Relacionamentos',
        7: 'Clareza de Papel | Função', 8: 'Gerenciamento de Mudanças',
    }
    page_num += 1

    for step in steps1:
        step2 = s2_by_key.get(step['key'], {})
        domain_name = str(step.get('domain', '') or STEP_NAMES.get(step.get('step', 0), 'Bloco'))
        qs1 = step.get('questions', [])
        qs2 = step2.get('questions', []) if step2 else []
        q2_by_field = {q['field']: q for q in qs2}

        y = height - MARGIN

        # Block header bar
        c.setFillColor(DARK)
        c.rect(MARGIN, y - 8 * mm, width - 2 * MARGIN, 8 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 9)
        c.drawString(MARGIN + 4 * mm, y - 5.5 * mm, domain_name.upper())
        y -= 13 * mm

        # Domain average row
        dp1 = float(step.get('percent', 0) or 0)
        dp2 = float(step2.get('percent', 0) or 0) if step2 else 0.0
        dz1 = (step.get('zone') or {}).get('key', 'red')
        dz2 = (step2.get('zone') or {}).get('key', 'red') if step2 else 'red'
        c.setFillColor(NAVY)
        c.rect(MARGIN, y - 8 * mm, width - 2 * MARGIN, 8 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 7.5)
        c.drawString(MARGIN + 2 * mm, y - 5.5 * mm, 'MÉDIA DO DOMÍNIO')
        c.setFillColor(zone_color(dz1))
        c.drawString(col_xs[1] + 2 * mm, y - 5.5 * mm, f'{dp1:.1f}%')
        c.setFillColor(zone_color(dz2))
        c.drawString(col_xs[2] + 2 * mm, y - 5.5 * mm, f'{dp2:.1f}%')
        c.setFillColor(delta_color_fn(dp2 - dp1))
        c.drawString(col_xs[3] + 2 * mm, y - 5.5 * mm, delta_str_fn(dp2 - dp1))
        y -= 12 * mm

        # Question table header
        y = table_header(c, y, ['QUESTÃO', f'Camp. 1 (%)', f'Camp. 2 (%)', 'VAR.'])

        for qi, q1 in enumerate(qs1):
            q2 = q2_by_field.get(q1.get('field', ''), {})
            qp1 = float(q1.get('percent', 0) or 0)
            qp2 = float(q2.get('percent', 0) or 0) if q2 else 0.0
            qz1 = (q1.get('zone') or {}).get('key', 'red')
            qz2 = (q2.get('zone') or {}).get('key', 'red') if q2 else 'red'
            question_text = str(q1.get('question', '') or '')

            # Word-wrap question
            max_chars = 72
            q_lines = []
            words = question_text.split()
            cur = ''
            for w in words:
                if len(cur) + len(w) + (1 if cur else 0) <= max_chars:
                    cur = (cur + ' ' + w).strip() if cur else w
                else:
                    if cur:
                        q_lines.append(cur)
                    cur = w
            if cur:
                q_lines.append(cur)
            if not q_lines:
                q_lines = ['']

            row_h = max(8 * mm, len(q_lines) * 4.2 * mm + 2 * mm)

            # New page if needed
            if y - row_h < 20 * mm:
                draw_footer(c, page_num)
                c.showPage()
                page_num += 1
                y = height - MARGIN
                c.setFillColor(colors.HexColor('#334155'))
                c.rect(MARGIN, y - 6 * mm, width - 2 * MARGIN, 6 * mm, stroke=0, fill=1)
                c.setFillColor(colors.white)
                c.setFont('Helvetica-Bold', 7)
                c.drawString(MARGIN + 2 * mm, y - 4.5 * mm, f'(continuação) {domain_name.upper()}')
                y -= 9 * mm
                y = table_header(c, y, ['QUESTÃO', 'Camp. 1 (%)', 'Camp. 2 (%)', 'VAR.'])

            if qi % 2 == 1:
                c.setFillColor(GRAY_LIGHT)
                c.rect(MARGIN, y - row_h, width - 2 * MARGIN, row_h, stroke=0, fill=1)

            # Question text
            c.setFont('Helvetica', 7)
            c.setFillColor(DARK)
            txt_y = y - 4.8 * mm
            for line in q_lines:
                c.drawString(MARGIN + 2 * mm, txt_y, line)
                txt_y -= 4.2 * mm

            # Scores
            c.setFont('Helvetica-Bold', 7.5)
            c.setFillColor(zone_color(qz1))
            c.drawString(col_xs[1] + 2 * mm, y - 5 * mm, f'{qp1:.1f}%')
            c.setFillColor(zone_color(qz2))
            c.drawString(col_xs[2] + 2 * mm, y - 5 * mm, f'{qp2:.1f}%')
            c.setFillColor(delta_color_fn(qp2 - qp1))
            c.drawString(col_xs[3] + 2 * mm, y - 5 * mm, delta_str_fn(qp2 - qp1))

            c.setStrokeColor(BORDER)
            c.setLineWidth(0.3)
            c.line(MARGIN, y - row_h, width - MARGIN, y - row_h)
            y -= row_h

        draw_footer(c, page_num)
        c.showPage()
        page_num += 1

    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    response = HttpResponse(pdf, content_type='application/pdf')
    safe1 = ''.join(ch if ch.isalnum() or ch in '-_' else '_' for ch in (camp1.title or 'c1'))[:30]
    safe2 = ''.join(ch if ch.isalnum() or ch in '-_' else '_' for ch in (camp2.title or 'c2'))[:30]
    response['Content-Disposition'] = f'attachment; filename="comparativo_{safe1}_vs_{safe2}.pdf"'
    return response


class CampanhaComparativoPdfView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def _get_campanha(self, request, campanha_id):
        qs = Campanha.objects.select_related('empresa').filter(id=campanha_id)
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return qs.first()
        return qs.filter(empresa__consultor=request.user).first()

    def get(self, request):
        c1_id_raw = (request.query_params.get('camp1_id') or '').strip()
        c2_id_raw = (request.query_params.get('camp2_id') or '').strip()
        if not c1_id_raw or not c2_id_raw:
            return Response({'detail': 'Informe camp1_id e camp2_id.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            c1_id = int(c1_id_raw)
            c2_id = int(c2_id_raw)
        except ValueError:
            return Response({'detail': 'IDs de campanha inválidos.'}, status=status.HTTP_400_BAD_REQUEST)
        camp1 = self._get_campanha(request, c1_id)
        camp2 = self._get_campanha(request, c2_id)
        if not camp1 or not camp2:
            return Response({'detail': 'Uma ou mais campanhas não encontradas.'}, status=status.HTTP_404_NOT_FOUND)
        base1 = CampanhaRespostaStep1.objects.filter(campanha=camp1, is_completed=True)
        base2 = CampanhaRespostaStep1.objects.filter(campanha=camp2, is_completed=True)
        bundle1 = _build_report_bundle(camp1, camp1.empresa, base1)
        bundle2 = _build_report_bundle(camp2, camp2.empresa, base2)
        return _build_comparativo_pdf_response(camp1, camp2, bundle1, bundle2)


class CampanhaRelatorioPdfView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, campanha_id):
        queryset = Campanha.objects.select_related('empresa').filter(id=campanha_id)
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return queryset.first()
        return queryset.filter(empresa__consultor=request.user).first()

    def get(self, request, campanha_id):
        campanha = self.get_object(request, campanha_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        empresa = campanha.empresa
        base_step1 = CampanhaRespostaStep1.objects.filter(campanha=campanha, is_completed=True)
        overall_bundle = _build_report_bundle(campanha, empresa, base_step1)
        ref_field = 'setor_id' if empresa.evaluation_type == 'SETOR' else 'ghe_id'
        ref_label = 'Setor' if empresa.evaluation_type == 'SETOR' else 'GHE'
        if empresa.evaluation_type == 'SETOR':
            available_refs_qs = (
                Setor.objects.filter(empresa=empresa)
                .annotate(response_count=Count('campanha_step1_respostas', filter=Q(campanha_step1_respostas__campanha=campanha, campanha_step1_respostas__is_completed=True)))
                .order_by('name')
            )
        else:
            available_refs_qs = (
                Ghe.objects.filter(empresa=empresa)
                .annotate(response_count=Count('campanha_step1_respostas', filter=Q(campanha_step1_respostas__campanha=campanha, campanha_step1_respostas__is_completed=True)))
                .order_by('name')
            )
        available_refs = [{'id': x.id, 'name': x.name, 'response_count': x.response_count} for x in available_refs_qs]
        per_ref = []
        for ref in available_refs:
            if not ref.get('response_count'):
                continue
            ref_qs = base_step1.filter(**{ref_field: ref['id']})
            per_ref.append({'ref': ref, **_build_report_bundle(campanha, empresa, ref_qs)})
        medidas = campanha.medidas_preliminares.select_related('setor', 'ghe').all()
        quandos = campanha.quandos_preliminares.select_related('setor', 'ghe').all()
        anexos = campanha.relatorio_anexos.all()
        planos_ativos = CampanhaPlanoAcao.objects.filter(campanha=campanha, ativo=True)
        medidas_data = CampanhaMedidaPreliminarSerializer(medidas, many=True).data
        for p in planos_ativos:
            step_plans = _PLANOS_ACAO.get(p.step_key, {})
            q_plans = step_plans.get(p.question_field, [])
            texto = q_plans[p.plano_index] if 0 <= p.plano_index < len(q_plans) else ''
            if texto:
                try:
                    step_number = int(str(p.step_key).replace('step', ''))
                except Exception:
                    step_number = 0
                if step_number not in [2, 3, 4, 5, 6, 7, 8]:
                    continue
                # Toggles selecionados entram no PDF no mesmo formato das medidas preenchidas manualmente.
                medidas_data.append(
                    {
                        'id': f'plan-{p.id}',
                        'step_number': step_number,
                        'question_field': p.question_field,
                        'scope_type': 'GERAL',
                        'setor': None,
                        'setor_name': '',
                        'ghe': None,
                        'ghe_name': '',
                        'action_text': texto,
                        'when_months': [],
                        'created_at': None,
                    }
                )
        rel_payload = {
            'empresa': {'name': empresa.company_name},
            'overall': overall_bundle,
            'filters': {'ref_label': ref_label, 'evaluation_type': empresa.evaluation_type},
            'per_ref': per_ref,
            'preliminary_measures': medidas_data,
            'preliminary_whens': CampanhaQuandoPreliminarSerializer(quandos, many=True).data,
            'review_recommendation_months': campanha.review_recommendation_months,
            'attachments': CampanhaRelatorioAnexoSerializer(anexos, many=True).data,
            'planos_acao': [],
        }
        return _build_report_pdf_response(campanha, rel_payload)


class CampanhaMedidaPreliminarListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_campanha(self, request, campanha_id):
        queryset = Campanha.objects.select_related('empresa').filter(id=campanha_id)
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return queryset.first()
        return queryset.filter(empresa__consultor=request.user).first()

    def get(self, request, campanha_id):
        campanha = self.get_campanha(request, campanha_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CampanhaMedidaPreliminarSerializer(campanha.medidas_preliminares.select_related('setor', 'ghe').all(), many=True)
        return Response(serializer.data)

    def post(self, request, campanha_id):
        campanha = self.get_campanha(request, campanha_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CampanhaMedidaPreliminarSerializer(data=request.data, context={'request': request, 'campanha': campanha})
        serializer.is_valid(raise_exception=True)
        medida = serializer.save()
        return Response(CampanhaMedidaPreliminarSerializer(medida).data, status=status.HTTP_201_CREATED)


class CampanhaMedidaPreliminarDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, campanha_id, medida_id):
        queryset = Campanha.objects.filter(id=campanha_id)
        if not (request.user.is_superuser or request.user.user_type == UserType.ADM):
            queryset = queryset.filter(empresa__consultor=request.user)
        campanha = queryset.first()
        if not campanha:
            return None, None
        medida = campanha.medidas_preliminares.filter(id=medida_id).first()
        return campanha, medida

    def delete(self, request, campanha_id, medida_id):
        campanha, medida = self.get_object(request, campanha_id, medida_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if not medida:
            return Response({'detail': 'Medida nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        medida.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CampanhaQuandoPreliminarUpsertView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_campanha(self, request, campanha_id):
        queryset = Campanha.objects.select_related('empresa').filter(id=campanha_id)
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return queryset.first()
        return queryset.filter(empresa__consultor=request.user).first()

    def post(self, request, campanha_id):
        campanha = self.get_campanha(request, campanha_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CampanhaQuandoPreliminarSerializer(data=request.data, context={'request': request, 'campanha': campanha})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        obj, _created = CampanhaQuandoPreliminar.objects.update_or_create(
            campanha=campanha,
            step_number=data['step_number'],
            question_field=data['question_field'],
            scope_type=data['scope_type'],
            setor=data.get('setor'),
            ghe=data.get('ghe'),
            defaults={
                'when_months': data.get('when_months', []),
                'created_by': request.user,
            },
        )
        return Response(CampanhaQuandoPreliminarSerializer(obj).data, status=status.HTTP_200_OK)


class CampanhaQuandoPreliminarDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, campanha_id, quando_id):
        queryset = Campanha.objects.filter(id=campanha_id)
        if not (request.user.is_superuser or request.user.user_type == UserType.ADM):
            queryset = queryset.filter(empresa__consultor=request.user)
        campanha = queryset.first()
        if not campanha:
            return None, None
        return campanha, campanha.quandos_preliminares.filter(id=quando_id).first()

    def delete(self, request, campanha_id, quando_id):
        campanha, quando = self.get_object(request, campanha_id, quando_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if not quando:
            return Response({'detail': 'Quando nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        quando.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CampanhaRelatorioAnexoListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]
    parser_classes = [MultiPartParser, FormParser]

    def get_campanha(self, request, campanha_id):
        queryset = Campanha.objects.select_related('empresa').filter(id=campanha_id)
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return queryset.first()
        return queryset.filter(empresa__consultor=request.user).first()

    def get(self, request, campanha_id):
        campanha = self.get_campanha(request, campanha_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CampanhaRelatorioAnexoSerializer(campanha.relatorio_anexos.all(), many=True)
        return Response(serializer.data)

    def post(self, request, campanha_id):
        campanha = self.get_campanha(request, campanha_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'Arquivo e obrigatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        if file_obj.size > 10 * 1024 * 1024:
            return Response({'detail': 'Arquivo excede 10MB.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            file_key, file_url, content_type = _upload_relatorio_anexo_to_storage(campanha, file_obj)
        except Exception as exc:
            return Response({'detail': f'Falha no upload para storage: {exc}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        anexo = CampanhaRelatorioAnexo.objects.create(
            campanha=campanha,
            file_name=file_obj.name,
            file_key=file_key,
            file_url=file_url,
            content_type=content_type,
            size_bytes=file_obj.size,
            uploaded_by=request.user,
        )
        return Response(CampanhaRelatorioAnexoSerializer(anexo).data, status=status.HTTP_201_CREATED)


class CampanhaRelatorioAnexoDetailView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get_object(self, request, campanha_id, anexo_id):
        queryset = Campanha.objects.filter(id=campanha_id)
        if not (request.user.is_superuser or request.user.user_type == UserType.ADM):
            queryset = queryset.filter(empresa__consultor=request.user)
        campanha = queryset.first()
        if not campanha:
            return None, None
        return campanha, campanha.relatorio_anexos.filter(id=anexo_id).first()

    def delete(self, request, campanha_id, anexo_id):
        campanha, anexo = self.get_object(request, campanha_id, anexo_id)
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if not anexo:
            return Response({'detail': 'Anexo nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            _delete_relatorio_anexo_from_storage(anexo.file_key)
        except Exception:
            # Se o arquivo ja tiver sido removido no bucket, ainda removemos metadado local.
            pass
        anexo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CampanhaPublicView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, share_token):
        campanha = Campanha.objects.select_related('empresa').filter(share_token=share_token).first()
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if campanha.status != CampaignStatus.ATIVO:
            return Response({'detail': 'Este link de campanha nao esta ativo.'}, status=status.HTTP_403_FORBIDDEN)
        empresa = campanha.empresa
        setores = []
        ghes = []

        if empresa.evaluation_type == 'SETOR':
            setores = [{'id': s.id, 'name': s.name} for s in Setor.objects.filter(empresa=empresa, is_active=True).order_by('name')]
        else:
            ghes = [{'id': g.id, 'name': g.name} for g in Ghe.objects.filter(empresa=empresa, is_active=True).order_by('name')]

        cargos = Cargo.objects.filter(empresa=empresa, is_active=True).prefetch_related('setores', 'ghes').order_by('name')
        cargos_data = [
            {
                'id': c.id,
                'name': c.name,
                'setor_ids': [s.id for s in c.setores.all()],
                'ghe_ids': [g.id for g in c.ghes.all()],
            }
            for c in cargos
        ]

        serializer = CampanhaSerializer(campanha, context={'request': request})
        return Response(
            {
                'campaign': serializer.data,
                'empresa_name': empresa.company_name,
                'evaluation_type': empresa.evaluation_type,
                'setores': setores,
                'ghes': ghes,
                'cargos': cargos_data,
                'step2_questions': [
                    'As diferentes áreas do meu trabalho fazem exigências difíceis de conciliar entre si?',
                    'Recebo prazos que considero impossíveis de cumprir?',
                    'Meu trabalho exige que eu atue com nível muito alto de intensidade?',
                    'Preciso abandonar ou adiar tarefas porque a quantidade de demandas é excessiva?',
                    'Não consigo realizar pausas adequadas durante a jornada de trabalho?',
                    'Sinto pressão para trabalhar por longos períodos ou fazer horas extras?',
                    'Preciso executar minhas atividades em ritmo muito acelerado?',
                    'As pausas previstas no trabalho são difíceis ou inviáveis de cumprir?',
                ],
                'step2_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step3_questions': [
                    'Tenho autonomia para escolher quando fazer uma pausa?',
                    'Posso decidir o ritmo em que realizo meu trabalho?',
                    'Tenho liberdade para definir como executo minhas atividades?',
                    'Tenho autonomia para decidir quais tarefas realizo no trabalho?',
                    'Possuo influência sobre a forma como desempenho minhas atividades?',
                    'Meu horário de trabalho permite flexibilidade?',                
                ],
                'step3_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step4_questions': [
                    'Recebo informações e suporte adequados para desempenhar meu trabalho?',
                    'Posso contar com meu supervisor direto quando enfrento dificuldades no trabalho?',
                    'Consigo conversar com meu supervisor direto sobre situações que me incomodam no trabalho?',
                    'Recebo apoio quando realizo atividades emocionalmente exigentes?',
                    'Meu supervisor direto me oferece incentivo e encorajamento no trabalho?',
                ],
                'step4_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step5_questions': [
                    'Quando o trabalho se torna difícil, posso contar com a ajuda dos meus colegas?',
                    'Recebo dos meus colegas o apoio necessário para realizar meu trabalho?',
                    'Sou tratado com o respeito que mereço pelos meus colegas?',
                    'Meus colegas estão dispostos a ouvir quando tenho problemas relacionados ao trabalho?',
                ],
                'step5_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step6_questions': [
                    'Sinto que sou alvo de perseguição no ambiente de trabalho?',
                    'Existem conflitos ou desentendimentos frequentes entre colegas?',
                    'Sou tratado ou abordado de forma rude ou excessivamente dura?',
                    'Os relacionamentos no ambiente de trabalho estão desgastados?',
                ],
                'step6_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step7_questions': [
                    'Eu entendo claramente o que é esperado de mim no trabalho?',
                    'Sei como realizar minhas atividades de forma adequada?',
                    'Tenho clareza sobre minhas funções e responsabilidades?',
                    'Compreendo os objetivos e metas do meu departamento?',
                    'Entendo como o meu trabalho contribui para os objetivos gerais da organização?',
                ],
                'step7_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step8_questions': [
                    'Tenho oportunidades suficientes para questionar os gestores sobre mudanças no trabalho?',
                    'Os funcionários são consultados sobre mudanças que afetam o trabalho?',
                    'Quando ocorrem mudanças no trabalho, compreendo claramente como elas serão aplicadas na prática?',
                ],
                'step8_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step9_prompt': 'Se desejar, deixe um comentario adicional:',
            }
        )


class CampanhaPublicStep1SubmitView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, share_token):
        campanha = Campanha.objects.select_related('empresa').filter(share_token=share_token).first()
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if campanha.status != CampaignStatus.ATIVO:
            return Response({'detail': 'Este link de campanha nao esta ativo.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = CampanhaStep1RespostaSerializer(data=request.data, context={'campanha': campanha})
        serializer.is_valid(raise_exception=True)
        resposta = serializer.save()
        return Response(
            {
                'message': 'Step 1 registrado com sucesso.',
                'response_id': resposta.id,
            },
            status=status.HTTP_201_CREATED,
        )


class CampanhaPublicStep2SubmitView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, share_token):
        campanha = Campanha.objects.select_related('empresa').filter(share_token=share_token).first()
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if campanha.status != CampaignStatus.ATIVO:
            return Response({'detail': 'Este link de campanha nao esta ativo.'}, status=status.HTTP_403_FORBIDDEN)

        step1_id = request.data.get('step1_response_id')
        existing = None
        if step1_id:
            step1 = campanha.step1_respostas.filter(id=step1_id).first()
            existing = getattr(step1, 'step2', None) if step1 else None
        serializer = CampanhaStep2RespostaSerializer(existing, data=request.data, context={'campanha': campanha})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Step 2 registrado com sucesso.'}, status=status.HTTP_201_CREATED)


class CampanhaPublicStep3SubmitView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, share_token):
        campanha = Campanha.objects.select_related('empresa').filter(share_token=share_token).first()
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if campanha.status != CampaignStatus.ATIVO:
            return Response({'detail': 'Este link de campanha nao esta ativo.'}, status=status.HTTP_403_FORBIDDEN)

        step1_id = request.data.get('step1_response_id')
        existing = None
        if step1_id:
            step1 = campanha.step1_respostas.filter(id=step1_id).first()
            existing = getattr(step1, 'step3', None) if step1 else None
        serializer = CampanhaStep3RespostaSerializer(existing, data=request.data, context={'campanha': campanha})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Step 3 registrado com sucesso.'}, status=status.HTTP_201_CREATED)


class CampanhaPublicStep4SubmitView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, share_token):
        campanha = Campanha.objects.select_related('empresa').filter(share_token=share_token).first()
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if campanha.status != CampaignStatus.ATIVO:
            return Response({'detail': 'Este link de campanha nao esta ativo.'}, status=status.HTTP_403_FORBIDDEN)

        step1_id = request.data.get('step1_response_id')
        existing = None
        if step1_id:
            step1 = campanha.step1_respostas.filter(id=step1_id).first()
            existing = getattr(step1, 'step4', None) if step1 else None
        serializer = CampanhaStep4RespostaSerializer(existing, data=request.data, context={'campanha': campanha})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Step 4 registrado com sucesso.'}, status=status.HTTP_201_CREATED)


class CampanhaPublicStep5SubmitView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, share_token):
        campanha = Campanha.objects.select_related('empresa').filter(share_token=share_token).first()
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if campanha.status != CampaignStatus.ATIVO:
            return Response({'detail': 'Este link de campanha nao esta ativo.'}, status=status.HTTP_403_FORBIDDEN)

        step1_id = request.data.get('step1_response_id')
        existing = None
        if step1_id:
            step1 = campanha.step1_respostas.filter(id=step1_id).first()
            existing = getattr(step1, 'step5', None) if step1 else None
        serializer = CampanhaStep5RespostaSerializer(existing, data=request.data, context={'campanha': campanha})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Step 5 registrado com sucesso.'}, status=status.HTTP_201_CREATED)


class CampanhaPublicStep6SubmitView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, share_token):
        campanha = Campanha.objects.select_related('empresa').filter(share_token=share_token).first()
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if campanha.status != CampaignStatus.ATIVO:
            return Response({'detail': 'Este link de campanha nao esta ativo.'}, status=status.HTTP_403_FORBIDDEN)

        step1_id = request.data.get('step1_response_id')
        existing = None
        if step1_id:
            step1 = campanha.step1_respostas.filter(id=step1_id).first()
            existing = getattr(step1, 'step6', None) if step1 else None
        serializer = CampanhaStep6RespostaSerializer(existing, data=request.data, context={'campanha': campanha})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Step 6 registrado com sucesso.'}, status=status.HTTP_201_CREATED)


class CampanhaPublicStep7SubmitView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, share_token):
        campanha = Campanha.objects.select_related('empresa').filter(share_token=share_token).first()
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if campanha.status != CampaignStatus.ATIVO:
            return Response({'detail': 'Este link de campanha nao esta ativo.'}, status=status.HTTP_403_FORBIDDEN)

        step1_id = request.data.get('step1_response_id')
        existing = None
        if step1_id:
            step1 = campanha.step1_respostas.filter(id=step1_id).first()
            existing = getattr(step1, 'step7', None) if step1 else None
        serializer = CampanhaStep7RespostaSerializer(existing, data=request.data, context={'campanha': campanha})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Step 7 registrado com sucesso.'}, status=status.HTTP_201_CREATED)


class CampanhaPublicStep8SubmitView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, share_token):
        campanha = Campanha.objects.select_related('empresa').filter(share_token=share_token).first()
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if campanha.status != CampaignStatus.ATIVO:
            return Response({'detail': 'Este link de campanha nao esta ativo.'}, status=status.HTTP_403_FORBIDDEN)
        step1_id = request.data.get('step1_response_id')
        existing = None
        if step1_id:
            step1 = campanha.step1_respostas.filter(id=step1_id).first()
            existing = getattr(step1, 'step8', None) if step1 else None
        serializer = CampanhaStep8RespostaSerializer(existing, data=request.data, context={'campanha': campanha})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Step 8 registrado com sucesso.'}, status=status.HTTP_201_CREATED)


class CampanhaPublicStep9SubmitView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, share_token):
        campanha = Campanha.objects.select_related('empresa').filter(share_token=share_token).first()
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if campanha.status != CampaignStatus.ATIVO:
            return Response({'detail': 'Este link de campanha nao esta ativo.'}, status=status.HTTP_403_FORBIDDEN)
        step1_id = request.data.get('step1_response_id')
        existing = None
        if step1_id:
            step1 = campanha.step1_respostas.filter(id=step1_id).first()
            existing = getattr(step1, 'step9', None) if step1 else None
        serializer = CampanhaStep9RespostaSerializer(existing, data=request.data, context={'campanha': campanha})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            step9 = serializer.save()
            step1 = step9.step1
            if not step1.is_completed:
                step1.is_completed = True
                step1.save(update_fields=['is_completed'])
        return Response({'message': 'Step 9 registrado com sucesso.'}, status=status.HTTP_201_CREATED)


class CampanhaPlanoAcaoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, campanha_id):
        campanha = Campanha.objects.filter(id=campanha_id).first()
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        planos = CampanhaPlanoAcao.objects.filter(campanha=campanha)
        return Response(CampanhaPlanoAcaoSerializer(planos, many=True).data)

    def post(self, request, campanha_id):
        campanha = Campanha.objects.filter(id=campanha_id).first()
        if not campanha:
            return Response({'detail': 'Campanha nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        items = request.data if isinstance(request.data, list) else []
        with transaction.atomic():
            for item in items:
                step_key = str(item.get('step_key', '')).strip()
                question_field = str(item.get('question_field', '')).strip()
                plano_index = item.get('plano_index')
                ativo = bool(item.get('ativo', False))
                if not step_key or not question_field or plano_index is None:
                    continue
                CampanhaPlanoAcao.objects.update_or_create(
                    campanha=campanha,
                    step_key=step_key,
                    question_field=question_field,
                    plano_index=int(plano_index),
                    defaults={'ativo': ativo},
                )
        planos = CampanhaPlanoAcao.objects.filter(campanha=campanha)
        return Response(CampanhaPlanoAcaoSerializer(planos, many=True).data)
