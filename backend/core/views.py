from rest_framework import status
from django.db import transaction
from django.db.models import Count, Q
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
    Setor,
    User,
    UserType,
)
from .serializers import CanalDenunciaAtualizacaoCreateSerializer, CanalDenunciaListSerializer, CanalDenunciaPublicSerializer, CanalDenunciaStatusUpdateSerializer, CampanhaMedidaPreliminarSerializer, CampanhaQuandoPreliminarSerializer, CampanhaRelatorioAnexoSerializer, CampanhaSerializer, CampanhaStep1RespostaSerializer, CampanhaStep2RespostaSerializer, CampanhaStep3RespostaSerializer, CampanhaStep4RespostaSerializer, CampanhaStep5RespostaSerializer, CampanhaStep6RespostaSerializer, CampanhaStep7RespostaSerializer, CampanhaStep8RespostaSerializer, CampanhaStep9RespostaSerializer, CargoSerializer, ConsultoriaConfiguracaoSerializer, ConsultoriaResponsavelTecnicoSerializer, ConsultorSerializer, EmpresaSerializer, GheSerializer, LoginSerializer, SetorSerializer


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
            'Diferentes setores/areas no trabalho exigem coisas de mim que sao dificeis de conciliar?',
            'Tenho prazos impossiveis de cumprir?',
            'Preciso trabalhar com muita intensidade?',
            'Preciso deixar algumas tarefas de lado porque tenho muitas demandas?',
            'Nao tenho possibilidade de fazer pausas suficientes?',
            'Sofro pressao para trabalhar longas horas?',
            'Preciso trabalhar muito rapido?',
            'Tenho pausas temporarias impossiveis de cumprir?',
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
            'Posso decidir quando fazer uma pausa?',
            'Tenho voz para decidir a velocidade do meu proprio trabalho?',
            'Tenho autonomia para decidir como faco meu trabalho?',
            'Tenho autonomia para decidir o que faco no trabalho?',
            'Tenho alguma influencia sobre a forma como realizo meu trabalho?',
            'Meu horario de trabalho pode ser flexivel?',
        ],
    },
    {
        'step': 4,
        'key': 'step4',
        'domain': 'Apoio da Gestao',
        'orientation': 'positive',
        'model': CampanhaRespostaStep4,
        'question_fields': ['q1', 'q2', 'q3', 'q4', 'q5'],
        'questions': [
            'Recebo informacoes e suporte que me ajudam no trabalho que eu faco?',
            'Posso contar com meu supervisor direto para me ajudar com problemas no trabalho?',
            'Posso conversar com meu supervisor direto sobre algo que me incomoda no trabalho?',
            'Recebo apoio em trabalhos emocionalmente exigentes?',
            'Meu supervisor direto me incentiva no trabalho?',
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
            'Se o trabalho ficar dificil, meus colegas podem me ajudar?',
            'Recebo o apoio de que preciso dos meus colegas?',
            'Recebo o respeito que mereco dos meus colegas?',
            'Meus colegas estao dispostos a ouvir meus problemas relacionados ao trabalho?',
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
            'Sou perseguido no trabalho?',
            'Ha atritos ou desentendimentos entre colegas?',
            'Falam ou se comportam comigo de forma dura?',
            'Os relacionamentos no trabalho estao desgastados?',
        ],
    },
    {
        'step': 7,
        'key': 'step7',
        'domain': 'Clareza de Papel | Funcao',
        'orientation': 'positive',
        'model': CampanhaRespostaStep7,
        'question_fields': ['q1', 'q2', 'q3', 'q4', 'q5'],
        'questions': [
            'Eu entendo claramente o que e esperado de mim no trabalho?',
            'Sei como realizar meu trabalho?',
            'Sei claramente quais sao minhas funcoes e responsabilidades?',
            'Compreendo os objetivos e metas do meu departamento?',
            'Compreendo como o meu trabalho contribui para o objetivo geral da organizacao?',
        ],
    },
    {
        'step': 8,
        'key': 'step8',
        'domain': 'Gerenciamento de Mudancas',
        'orientation': 'positive',
        'model': CampanhaRespostaStep8,
        'question_fields': ['q1', 'q2', 'q3'],
        'questions': [
            'Tenho oportunidades suficientes para questionar os gestores sobre mudancas no trabalho?',
            'Os funcionarios sao sempre consultados sobre mudancas no trabalho?',
            'Quando ha mudancas no trabalho, compreendo claramente como elas serao aplicadas na pratica?',
        ],
    },
]


def _report_zone(percent):
    if percent < 40:
        return {'key': 'red', 'label': 'Critico'}
    if percent < 75:
        return {'key': 'yellow', 'label': 'Atencao'}
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


def _build_dashboard_overview(user, empresa_id=None):
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

    return {
        'selected_empresa_id': empresa_id,
        'empresas': [{'id': e['id'], 'name': e['company_name']} for e in available_empresas],
        'summary_cards': [
            {'key': 'empresas', 'label': 'Total de Empresas', 'value': total_empresas, 'color': 'blue'},
            {'key': 'questionarios_abertos', 'label': 'Questionarios em aberto', 'value': questionarios_em_aberto, 'color': 'green'},
            {'key': 'relatorios', 'label': 'Relatorios Salvos', 'value': relatorios_salvos, 'color': 'yellow'},
            {'key': 'avaliacoes', 'label': 'Avaliacoes Encontradas', 'value': completed_count, 'color': 'purple'},
            {'key': 'denuncias', 'label': 'Denuncias', 'value': comentarios_count, 'color': 'red'},
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


def _draw_pdf_cover_page(c, campanha, empresa_name):
    width, height = A4
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    top_y = height - 32 * mm
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 20)
    c.drawCentredString(width / 2, top_y, 'RELATORIO DE SAUDE ORGANIZACIONAL')

    c.setFont('Helvetica', 9)
    c.setFillColor(colors.HexColor('#4b5563'))
    c.drawCentredString(width / 2, top_y - 9 * mm, 'Avaliacao ergonomica preliminar dos fatores de risco psicossociais')
    c.drawCentredString(width / 2, top_y - 13 * mm, 'relacionados ao ambiente de trabalho')

    c.setFont('Helvetica-Bold', 8)
    c.setFillColor(colors.HexColor('#1d4ed8'))
    c.drawCentredString(width / 2, top_y - 20 * mm, 'AEP-FRPRT | NR-1 | NR-17 | HSE-SIT-UK')

    box_w = width - 54 * mm
    box_h = 44 * mm
    box_x = (width - box_w) / 2
    box_y = top_y - 68 * mm
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(1)
    c.rect(box_x, box_y, box_w, box_h, stroke=1, fill=0)

    c.setFillColor(colors.HexColor('#1f2937'))
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(width / 2, box_y + box_h - 11 * mm, 'RELATORIO DE FATORES DE RISCO PSICOSSOCIAIS')
    c.drawCentredString(width / 2, box_y + box_h - 16 * mm, 'RELACIONADOS AO TRABALHO (FRPRT)')
    c.setFont('Helvetica-Bold', 9)
    c.drawCentredString(width / 2, box_y + box_h - 25 * mm, 'AVALIACAO ERGONOMICA PRELIMINAR (AEP)')
    c.setFont('Helvetica', 8)
    c.setFillColor(colors.HexColor('#4b5563'))
    c.drawCentredString(width / 2, box_y + box_h - 31 * mm, f'Empresa: {empresa_name}')

    c.setFont('Helvetica', 6.8)
    c.drawCentredString(width / 2, box_y + 4 * mm, 'Base normativa: NR-1 | NR-17 | Guia de Fatores Psicossociais | HSE-SIT-UK')
    c.showPage()


def _draw_pdf_summary_page(c):
    width, height = A4
    margin_x = 20 * mm
    y = height - 34 * mm

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    c.setFont('Helvetica-Bold', 11)
    c.setFillColor(colors.HexColor('#111827'))
    c.drawString(margin_x, y, 'SUMARIO')
    y -= 10 * mm

    items = [
        'IDENTIFICACAO',
        'OBJETIVO',
        'METODOLOGIA',
        'IMPORTANCIA DA PARTICIPACAO DOS TRABALHADORES',
        'RESULTADOS GERAIS',
        'CONCLUSOES E RECOMENDACOES PRELIMINARES',
        'LIMITACOES',
        'RESPONSABILIDADES',
        'ANEXOS',
    ]
    blue = colors.HexColor('#1d4ed8')

    for i, text in enumerate(items, start=1):
        c.setFillColor(blue)
        c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(margin_x + 2, y + 0.2, str(i))

        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica', 9)
        c.drawString(margin_x + 8 * mm, y - 0.5, text)
        y -= 6.5 * mm

    c.showPage()


def _draw_pdf_general_results_page(c, campanha, empresa, report_data):
    width, height = A4
    margin_x = 18 * mm
    y = height - 18 * mm
    summary = report_data.get('overall', {}).get('summary', {})
    domains = report_data.get('overall', {}).get('domains', [])
    blue = colors.HexColor('#1d4ed8')

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.setFillColor(blue)
    c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(margin_x + 2, y + 0.2, '5')
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
    c.rect(top_x, y - top_h, top_w, top_h, stroke=1, fill=0)
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
    c.drawCentredString(top_x + top_w * 0.25, y - 5 * mm, 'Media geral da empresa')
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

    # Domain box
    box_x = margin_x
    box_w = width - 2 * margin_x
    row_h = 6.5 * mm
    box_h = 12 * mm + (len(domains) * row_h) + 4 * mm
    c.setStrokeColor(colors.HexColor('#d1d5db'))
    c.rect(box_x, y - box_h, box_w, box_h, stroke=1, fill=0)
    c.setFont('Helvetica', 8)
    c.setFillColor(colors.HexColor('#6b7280'))
    c.drawString(box_x + 4 * mm, y - 5 * mm, 'Media por dominio')
    y_rows = y - 11 * mm

    track_w = 92 * mm
    for d in domains:
        c.setFont('Helvetica-Bold', 8.6)
        c.setFillColor(colors.HexColor('#111827'))
        c.drawString(box_x + 4 * mm, y_rows, d.get('domain', ''))
        bar_x = box_x + 58 * mm
        bar_y = y_rows - 3
        c.setStrokeColor(colors.HexColor('#cbd5e1'))
        c.setFillColor(colors.HexColor('#e5e7eb'))
        c.roundRect(bar_x, bar_y, track_w, 4.5 * mm, 2, stroke=1, fill=1)
        pct = max(0, min(100, float(d.get('percent', 0) or 0)))
        zone_key = (d.get('zone') or {}).get('key', 'red')
        fill = colors.HexColor('#ef4444') if zone_key == 'red' else colors.HexColor('#f59e0b') if zone_key == 'yellow' else colors.HexColor('#22c55e')
        c.setFillColor(fill)
        c.roundRect(bar_x, bar_y, track_w * (pct / 100.0), 4.5 * mm, 2, stroke=0, fill=1)
        c.setFont('Helvetica-Bold', 8)
        c.setFillColor(colors.HexColor('#111827'))
        c.drawRightString(box_x + box_w - 4 * mm, y_rows, f"{d.get('percent', 0)}% | {d.get('avg_score', 0)}")
        y_rows -= row_h
    y -= (box_h + 6 * mm)

    # Zone legend
    zone_y = y - 12 * mm
    zone_total_w = width - 2 * margin_x
    col_w = zone_total_w / 3
    zone_specs = [
        ('Zona Vermelha (0% a 39,99%)', 'Risco elevado: acao corretiva imediata', colors.HexColor('#ef4444')),
        ('Zona Amarela (40% a 74,99%)', 'Atencao: possivel risco psicossocial;', colors.HexColor('#f59e0b')),
        ('Zona Verde (75% a 100%)', 'Boa percepcao: manutencao recomendada.', colors.HexColor('#22c55e')),
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
            (colors.HexColor('#facc15'), 'As vezes - ATENCAO'),
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
            (colors.HexColor('#facc15'), 'As vezes - ATENCAO'),
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
            c.drawCentredString(width / 2, y_local, 'Grafico dos resultados')
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
        c.drawString(margin_x + 10 * mm, y, 'Media Geral')
        bar_row(y, '', step.get('percent', 0), step.get('avg_score', 0), step.get('zone', {}), x_bar, x_bar, x_val, track_w)
        y -= 11 * mm
        c.setStrokeColor(colors.HexColor('#e5e7eb'))
        c.line(margin_x, y, width - margin_x, y)
        y -= 9 * mm

        c.setFont('Helvetica-Bold', 9)
        c.setFillColor(colors.HexColor('#111827'))
        c.drawString(margin_x + 10 * mm, y, f'Analise por {ref_label}')
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
        c.drawCentredString(width / 2, y, f"{step_title} (Analise Geral)")
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
    blue = colors.HexColor('#1d4ed8')
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
                'scope_label': 'Analise geral',
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
        c.drawCentredString(margin_x + 2, y + 0.2, '6')
        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica-Bold', 9)
        c.drawString(margin_x + 8 * mm, y - 0.5, 'CONCLUSOES E RECOMENDACOES PRELIMINARES')
        c.setStrokeColor(blue)
        c.setLineWidth(1)
        c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
        return y - 11 * mm

    def draw_wrapped_text(x, y, text, font='Helvetica', size=7, max_width=None, leading=9):
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
        'Priorizar dominios com risco elevado.',
        f'Reavaliar periodicamente: daqui {review_months} meses.',
        'Promover treinamentos sobre saude mental e fatores psicossociais.',
        'Caso necessario, realizar AET aprofundada conforme NR-17.',
    ]
    c.setFont('Helvetica', 7)
    c.setFillColor(colors.HexColor('#111827'))
    for line in intro:
        c.drawString(margin_x + 2 * mm, y, f'-  {line}')
        y -= 5.2 * mm

    y -= 2 * mm
    c.setFillColor(colors.HexColor('#9a3412'))
    c.setFont('Helvetica-Bold', 8)
    c.drawString(margin_x, y, 'Plano de Acao Recomendado')
    y -= 8 * mm

    if not measures:
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
        scope_label = info.get('scope_label') or ('Analise geral' if m.get('scope_type') == 'GERAL' else f"{ref_label}: {m.get('setor_name') or m.get('ghe_name') or '-'}")
        when_data = whens_lookup.get(key)
        when_months = (when_data or {}).get('when_months', [])
        when_range = format_when_range(when_months)
        when_list_pt = format_when_months_pt(when_months)

        needed = 40 * mm if when_range else 26 * mm
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
        c.setFont('Helvetica-Bold', 7)
        c.drawString(box_x + 2 * mm, y, f'{domain_name} | {scope_label}')
        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica-Bold', 7)
        c.drawRightString(box_x + box_w - 2 * mm, y, f'Pontuacao: {score:.1f}')
        y -= 5 * mm

        y = draw_wrapped_text(box_x + 2 * mm, y, question, font='Helvetica', size=7, max_width=box_w - 4 * mm, leading=8.5)
        y -= 1.5 * mm

        c.setFillColor(colors.HexColor('#92400e'))
        c.setFont('Helvetica-Bold', 7)
        c.drawString(box_x + 2 * mm, y, 'Plano de acao:')
        c.setFillColor(colors.HexColor('#111827'))
        y = draw_wrapped_text(box_x + 28 * mm, y, m.get('action_text', '-'), font='Helvetica', size=7, max_width=box_w - 30 * mm, leading=8.5)
        y -= 2 * mm

        if when_range:
            # "Quando" no espelho da imagem 2 (tabela pequena)
            c.setFillColor(colors.HexColor('#111827'))
            c.setFont('Helvetica-Bold', 7)
            c.drawString(box_x + 2 * mm, y, 'Quando')
            y -= 4.5 * mm

            c.setFont('Helvetica-Bold', 6.6)
            c.drawString(box_x + 2 * mm, y, 'Aplicar em:')
            c.setFont('Helvetica', 6.4)
            c.drawString(box_x + 18 * mm, y, when_list_pt or '-')
            y -= 5.5 * mm

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
                c.setFont('Helvetica-Bold', 6.1)
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
                    # checkbox
                    cx = x + w / 2 - 1.4 * mm
                    cy = row_y - 4.6 * mm
                    c.setStrokeColor(colors.HexColor('#9ca3af'))
                    c.rect(cx, cy, 2.8 * mm, 2.8 * mm, stroke=1, fill=0)
                else:
                    c.setFont('Helvetica', 6.2)
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

    c.showPage()


def _draw_pdf_limitacoes_page(c):
    width, height = A4
    margin_x = 15 * mm
    y = height - 18 * mm
    blue = colors.HexColor('#1d4ed8')

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    c.setFillColor(blue)
    c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(margin_x + 2, y + 0.2, '7')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 9)
    c.drawString(margin_x + 8 * mm, y - 0.5, 'LIMITACOES')
    c.setStrokeColor(blue)
    c.setLineWidth(1)
    c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
    y -= 11 * mm

    paragraphs = [
        'Esta Avaliacao Ergonomica Preliminar (AEP) possui carater preliminar, sendo realizada em conformidade com os requisitos da NR-17 (Portaria MTP n 423/2021), item 17.3.2, que determina a necessidade de avaliacao inicial para subsidiar o gerenciamento dos fatores de risco relacionados a ergonomia no ambiente de trabalho.',
        'A AEP tem como objetivo identificar indicios de fatores de risco, subsidiar o Programa de Gerenciamento de Riscos (PGR) e o Gerenciamento de Riscos Ocupacionais (GRO), conforme exigido pela NR-1 (Portaria SEPRT n 6.730/2020), e auxiliar na priorizacao de medidas corretivas e preventivas no ambiente laboral. No entanto, este instrumento nao substitui a Analise Ergonomica do Trabalho (AET), que possui carater aprofundado e investigativo, exigindo observacoes diretas em campo, medicoes ambientais e biomecanicas, entrevistas e avaliacoes detalhadas das condicoes de trabalho.',
        'A NR-17 dispoe que "as condicoes de trabalho que possam afetar a saude dos trabalhadores devem ser objeto de AET", especialmente quando forem identificados riscos significativos ou quando houver indicios de que os fatores psicossociais, fisicos ou organizacionais estao impactando de forma relevante a saude e a produtividade dos trabalhadores. Nesse sentido, a AET torna-se obrigatoria em situacoes em que a AEP aponta a necessidade de medidas adicionais de controle ou quando os resultados indicam a presenca de condicoes criticas que requeiram investigacao aprofundada.',
        'Conforme o Guia de Fatores de Riscos Psicossociais Relacionados ao Trabalho (MTE), a avaliacao preliminar deve ser parte de um processo continuo de monitoramento, sendo considerada um ponto de partida no gerenciamento de riscos psicossociais, mas nao encerrando o processo de analise de forma definitiva.',
        'Alem disso, os resultados obtidos por meio desta plataforma representam a percepcao dos trabalhadores sobre o ambiente de trabalho em um periodo especifico, podendo sofrer alteracoes em virtude de mudancas organizacionais, tecnologicas ou de processos de trabalho. Portanto, os dados devem ser utilizados de forma critica, sendo recomendada sua atualizacao periodica para manter a rastreabilidade das informacoes e a efetividade das acoes de prevencao e controle implementadas.',
        'Por fim, destaca-se que a participacao dos trabalhadores nesta avaliacao e voluntaria e confidencial e, embora a amostra seja representativa, podem existir limitacoes relacionadas a fatores como receio de exposicao, interpretacao subjetiva das perguntas e condicoes especificas do local de trabalho nao observadas no momento da avaliacao, reforcando a necessidade de utilizacao da AEP como ferramenta de triagem e priorizacao dentro do sistema de gestao de SST, e nao como avaliacao conclusiva sobre todos os aspectos ergonomicos da organizacao.',
    ]

    text_obj = c.beginText()
    text_obj.setTextOrigin(margin_x, y)
    body_font = 7.4
    body_leading = 10.4
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
    blue = colors.HexColor('#1d4ed8')
    gray = colors.HexColor('#6b7280')

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    c.setFillColor(blue)
    c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(margin_x + 2, y + 0.2, '8')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 9)
    c.drawString(margin_x + 8 * mm, y - 0.5, 'RESPONSABILIDADES')
    c.setStrokeColor(blue)
    c.setLineWidth(1)
    c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
    y -= 11 * mm

    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica', 7.6)
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
    c.setFont('Helvetica', 6.5)
    c.drawCentredString(left_x + col_w / 2, line_y - 8 * mm, 'Representante Legal')
    c.drawCentredString(left_x + col_w / 2, line_y - 12 * mm, left_consultoria[:58])
    c.setFillColor(blue)
    c.setFont('Helvetica-Bold', 6.5)
    c.drawCentredString(left_x + col_w / 2, line_y - 16 * mm, 'Responsavel pela avaliacao')

    # Right signer
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 8)
    empresa_obj = getattr(campanha, 'empresa', None)
    right_nome = (getattr(empresa_obj, 'responsible_name', '') or 'Representante Legal').upper()
    right_empresa = getattr(empresa_obj, 'company_name', '') or 'EMPRESA'
    c.drawCentredString(right_x + col_w / 2, line_y - 4 * mm, right_nome[:44])
    c.setFillColor(gray)
    c.setFont('Helvetica', 6.5)
    c.drawCentredString(right_x + col_w / 2, line_y - 8 * mm, 'Representante Legal')
    c.drawCentredString(right_x + col_w / 2, line_y - 12 * mm, right_empresa[:58])
    c.setFillColor(blue)
    c.setFont('Helvetica-Bold', 6.5)
    c.drawCentredString(right_x + col_w / 2, line_y - 16 * mm, 'Responsavel pela aprovacao')

    y = line_y - 28 * mm

    paragraphs = [
        'Ressalta-se que a responsabilidade pela implementacao, monitoramento e acompanhamento das acoes corretivas e preventivas recomendadas neste relatorio e integralmente da empresa, conforme estabelece a NR-1 (item 1.5.3.1) e o Programa de Gerenciamento de Riscos (PGR), cabendo a organizacao avaliar a aplicabilidade das medidas no contexto de suas operacoes, garantindo a conformidade com as normas regulamentadoras vigentes e as melhores praticas de saude, seguranca e ergonomia ocupacional.',
        'Este relatorio, elaborado com rigor tecnico e em conformidade com a NR-1, NR-17 e o Guia de Fatores de Riscos Psicossociais Relacionados ao Trabalho, visa subsidiar a gestao da empresa na tomada de decisoes informadas, mantendo rastreabilidade e evidencias tecnicas para auditorias, fiscalizacoes e processos de melhoria continua do sistema de gestao de SST.',
    ]

    text_obj = c.beginText()
    text_obj.setTextOrigin(margin_x, y)
    body_font = 7.8
    body_leading = 11.0
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
    blue = colors.HexColor('#1d4ed8')
    anexos = report_data.get('attachments', []) or []

    def new_page():
        c.setFillColor(colors.white)
        c.rect(0, 0, width, height, stroke=0, fill=1)
        y = height - 18 * mm
        c.setFillColor(blue)
        c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(margin_x + 2, y + 0.2, '9')
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

    for idx, anexo in enumerate(anexos, start=1):
        if y < 45 * mm:
            c.showPage()
            y = new_page()

        file_name = str(anexo.get('file_name', f'Anexo {idx}'))
        file_url = str(anexo.get('file_url', ''))
        content_type = str(anexo.get('content_type', ''))
        size_kb = int((anexo.get('size_bytes') or 0) / 1024) if anexo.get('size_bytes') else 0

        c.setStrokeColor(colors.HexColor('#d1d5db'))
        c.roundRect(margin_x, y - 34 * mm, width - 2 * margin_x, 34 * mm, 3, stroke=1, fill=0)
        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica-Bold', 8)
        c.drawString(margin_x + 2 * mm, y - 4 * mm, f'Anexo {idx}: {file_name}')
        c.setFont('Helvetica', 6.5)
        c.setFillColor(colors.HexColor('#6b7280'))
        c.drawString(margin_x + 2 * mm, y - 8.5 * mm, f'Tipo: {content_type or "-"} | Tamanho: {size_kb} KB')
        c.drawString(margin_x + 2 * mm, y - 13 * mm, f'URL: {file_url[:110]}')

        # Tenta desenhar miniatura se for imagem
        if content_type.startswith('image/') and file_url:
            try:
                with urlopen(file_url, timeout=5) as fp:
                    img = ImageReader(fp)
                    img_x = margin_x + 2 * mm
                    img_y = y - 31 * mm
                    img_w = 42 * mm
                    img_h = 16 * mm
                    c.drawImage(img, img_x, img_y, width=img_w, height=img_h, preserveAspectRatio=True, mask='auto', anchor='sw')
            except Exception:
                c.setFillColor(colors.HexColor('#9ca3af'))
                c.setFont('Helvetica-Oblique', 6.5)
                c.drawString(margin_x + 2 * mm, y - 20 * mm, 'Preview indisponivel no momento da geracao do PDF.')
        y -= 38 * mm

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

    blue = colors.HexColor('#1d4ed8')
    c.setFillColor(blue)
    c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(margin_x + 2, y + 0.2, '1')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 9)
    c.drawString(margin_x + 8 * mm, y - 0.5, 'IDENTIFICACAO')
    c.setStrokeColor(blue)
    c.setLineWidth(1)
    c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
    y -= 11 * mm

    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 7)
    ident_lines = [
        ('Empresa', empresa.company_name or '-'),
        ('CNPJ', (empresa.document_number or '-') if getattr(empresa, 'document_type', '') == 'CNPJ' else '-'),
        ('Endereco', f"{empresa.street or '-'}, {empresa.number or '-'} - {empresa.city or '-'} / {empresa.state or '-'}"),
        ('CNAE', '-'),
        ('Classe de risco', empresa.risk_level or '-'),
        ('Setores avaliados', '-'),
        ('Numero de trabalhadores avaliados', str(completed or 0)),
        ('Data da avaliacao', campanha.end_date.strftime('%d/%m/%Y') if campanha.end_date else '-'),
        ('Reavaliacao recomendada', f"{int(report_data.get('review_recommendation_months') or 3)} meses"),
    ]
    for label, value in ident_lines:
        c.drawString(margin_x, y, f'{label}:')
        c.setFont('Helvetica', 7)
        c.drawString(margin_x + 32 * mm, y, str(value))
        y -= 5 * mm
        c.setFont('Helvetica-Bold', 7)

    y -= 3 * mm
    c.setFillColor(blue)
    c.setFont('Helvetica-Bold', 8)
    c.drawString(margin_x, y, '1.1 Responsaveis tecnicos pela ferramenta de avaliacao FRPRT')
    y -= 8 * mm

    table_x = margin_x
    table_w = width - (2 * margin_x)
    col_w = [table_w * 0.38, table_w * 0.42, table_w * 0.20]
    row_h = 6 * mm
    headers = ['Nome', 'Formacao', 'Registro']
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
    blue = colors.HexColor('#1d4ed8')

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    c.setFillColor(blue)
    c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(margin_x + 2, y + 0.2, '2')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 9)
    c.drawString(margin_x + 8 * mm, y - 0.5, 'OBJETIVO')
    c.setStrokeColor(blue)
    c.setLineWidth(1)
    c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
    y -= 11 * mm

    text = (
        'Esta Avaliacao Ergonomica Preliminar (AEP) tem por finalidade identificar e examinar tecnicamente os fatores de '
        'risco psicossociais existentes no contexto de trabalho, que possam contribuir para o estresse ocupacional e afetar '
        'a saude, o bem-estar e o desempenho dos colaboradores. O presente relatorio encontra-se em plena conformidade com '
        'a NR-17 e a NR-1 (GRO e PGR), observando o Guia de Informacoes sobre Fatores de Riscos Psicossociais Relacionados '
        'ao Trabalho (MTE) e as diretrizes da HSE-SIT-UK, assegurando alinhamento com as melhores praticas nacionais e '
        'internacionais em saude e seguranca do trabalho. Alem de atender as exigencias legais, este AEP-FRPRT fornece '
        'fundamentos tecnicos consistentes para subsidiar decisoes quanto as necessidades de aprofundamento por meio da '
        'Analise Ergonomica do Trabalho (AET), a priorizacao de medidas de controle e a definicao de planos de acao '
        'integrados ao PGR, com o proposito de promover ambientes laborais mais seguros, saudaveis e produtivos.'
    )

    text_obj = c.beginText()
    text_obj.setTextOrigin(margin_x, y)
    body_font = 8.2
    body_leading = 11.5
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
    blue = colors.HexColor('#1d4ed8')

    def draw_header(page_num='3', title='METODOLOGIA'):
        y = top_y
        c.setFillColor(colors.white)
        c.rect(0, 0, width, height, stroke=0, fill=1)
        c.setFillColor(blue)
        c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(margin_x + 2, y + 0.2, page_num)
        c.setFillColor(colors.HexColor('#111827'))
        c.setFont('Helvetica-Bold', 9)
        c.drawString(margin_x + 8 * mm, y - 0.5, title)
        c.setStrokeColor(blue)
        c.setLineWidth(1)
        c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
        return y - 10 * mm

    def draw_paragraph(y, text, font='Helvetica', size=7.8, leading=11.2, bold=False):
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
        'Para a conducao desta Avaliacao Ergonomica Preliminar (AEP), foi empregado o Stress Indicator Tool (SIT), instrumento de avaliacao psicossocial reconhecido internacionalmente e validado pelo Health and Safety Executive (HSE) do Reino Unido (UK), devidamente adaptado a realidade organizacional brasileira, em conformidade com os principios da NR-1, da NR-17 e do Guia de Fatores Psicossociais Relacionados ao Trabalho, elaborados pelo Ministerio do Trabalho e Emprego (MTE).',
        'O instrumento e composto por 35 questoes estruturadas, organizadas nos dominios Demandas, Controle, Apoio, Relacionamentos, Papel e Mudancas, reconhecidos pela literatura cientifica e pelas normas tecnicas como fatores determinantes relevantes para a saude mental e o bem-estar dos trabalhadores.',
        'A aplicacao da metodologia permite a realizacao de uma analise tecnica detalhada dos fatores criticos presentes no ambiente laboral, contemplando os seguintes etapas:',
    ]
    for p in paragraphs_page1:
        y = draw_paragraph(y, p)
        y -= 2 * mm

    bullets = [
        'Realizacao de coleta estruturada e sigilosa das percepcoes dos trabalhadores, garantindo confidencialidade e confiabilidade das respostas;',
        'Classificacao, consolidacao e analise estatistica das informacoes obtidas, possibilitando a identificacao de areas sensiveis e pontos prioritarios de intervencao;',
        'Avaliacao tecnica dos resultados em conformidade com a legislacao vigente e com as melhores praticas nacionais e internacionais de Saude e Seguranca do Trabalho, assegurando rastreabilidade dos dados e subsidiando a elaboracao de acoes integradas ao GRO e ao PGR.',
        'A utilizacao do Stress Indicator Tool (SIT) neste processo permite a identificacao estruturada e confiavel dos riscos psicossociais existentes no ambiente laboral, proporcionando-se como base para a definicao e priorizacao de medidas preventivas e corretivas, alem de possibilitar o acompanhamento continuo da evolucao das condicoes psicossociais ao longo do tempo.',
        'Ressalta-se que o SIT e uma das ferramentas indicadas pelo Health and Safety Executive (HSE-UK), em virtude de sua efetividade na coleta estruturada e objetiva das percepcoes dos trabalhadores. Cabe destacar que os resultados obtidos refletem a percepcao dos colaboradores em um contexto e periodo especificos, o que reforca a importancia de reavaliacoes periodicas, em alinhamento com o ciclo de monitoramento previsto no GRO e no PGR.',
        'A eficacia da metodologia adotada esta diretamente vinculada ao comprometimento institucional e a participacao ativa dos trabalhadores ao longo de todo o processo, considerando que sao os proprios colaboradores que vivenciam as rotinas laborais e detem a experiencia pratica necessaria para fornecer informacoes confiaveis e relevantes sobre os fatores que influenciam sua saude, bem-estar e desempenho.',
        'Adicionalmente, a metodologia empregada favorece a promocao de ambientes laborais mais seguros, equilibrados e produtivos, permitindo que a organizacao atue de forma preventiva, estruturada e sistematizada na gestao dos fatores psicossociais relacionados ao trabalho, em conformidade com a legislacao brasileira vigente e com as referencias internacionais de gestao em saude e seguranca ocupacional.',
    ]
    c.setFont('Helvetica', 7.8)
    for b in bullets:
        y = draw_paragraph(y, f'- {b}')
        y -= 1.2 * mm
        if y < 25 * mm:
            break

    y -= 2 * mm
    c.setFont('Helvetica-Bold', 8)
    c.setFillColor(colors.HexColor('#111827'))
    c.drawString(margin_x, y, 'Selecionando uma amostra')
    y -= 5 * mm
    y = draw_paragraph(y, 'Ha varias questoes a serem consideradas na selecao de uma populacao de pesquisa:')
    for line in ['Quais listas de trabalhadores podem ser utilizadas;', 'Quantos trabalhadores devem compor a amostra; e', 'Como selecionar a amostra de trabalhadores.']:
        y = draw_paragraph(y, f'- {line}')
        y -= 1 * mm
    y -= 1 * mm
    c.setFont('Helvetica-Bold', 8)
    c.drawString(margin_x, y, 'Lista de trabalhadores')
    y -= 5 * mm
    y = draw_paragraph(y, 'Ao selecionar uma amostra de trabalhadores, ou mesmo a totalidade dos colaboradores da organizacao, e fundamental assegurar a disponibilidade de uma lista atualizada dos participantes incluidos na pesquisa. Essa relacao pode ser obtida por meio da folha de pagamento, cadastro de empregados, registros de seguranca ou outras fontes equivalentes. E imprescindivel que a lista utilizada esteja correta e atualizada, a fim de garantir que todos os integrantes da amostra recebam o questionario. Tal cuidado contribui para o aumento da taxa de resposta e para a confiabilidade dos resultados obtidos.')
    c.showPage()

    y = height - 20 * mm
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 8)
    c.drawString(margin_x, y, 'Tamanho minimo de amostra recomendado')
    y -= 5 * mm
    y = draw_paragraph(y, 'A realizacao de uma pesquisa envolvendo todos os colaboradores tende a proporcionar um retrato mais fiel da realidade organizacional do que a utilizacao de uma amostra. Por outro lado, optar pelo tamanho minimo de amostra recomendado apresenta como beneficios a reducao de custos e a diminuicao do tempo demandado pela equipe. Os quantitativos minimos foram definidos de modo a assegurar que os resultados obtidos sejam estatisticamente representativos das percepcoes do conjunto de trabalhadores da organizacao.')
    y = draw_paragraph(y, 'A adocao de uma amostra ampliada possibilita analises mais aprofundadas de subgrupos (como por categoria profissional) e amplia a oportunidade para que um numero maior de colaboradores manifeste suas percepcoes. Em contrapartida, essa escolha pode implicar maior investimento de tempo e recursos para sua execucao.')
    y = draw_paragraph(y, 'Os tamanhos de amostra recomendados sao fornecidos na tabela abaixo:')
    y -= 2 * mm

    table_x = margin_x
    table_w = width - (2 * margin_x)
    col_w = [table_w * 0.45, table_w * 0.55]
    row_h = 6 * mm
    headers = ['Numero total de trabalhadores', 'Tamanho de amostra recomendado']
    rows = [
        ['<= 500', 'Todos os funcionarios'],
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
    c.setFont('Helvetica-Bold', 7)
    for i, h in enumerate(headers):
        c.drawString(x + 2 * mm, y - 4.2 * mm, h)
        x += col_w[i]
    curr_y = y - row_h
    c.setFont('Helvetica', 6.8)
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
    c.drawString(margin_x, curr_y - 5 * mm, foot)
    c.showPage()


def _draw_pdf_importancia_participacao_page(c):
    width, height = A4
    margin_x = 15 * mm
    y = height - 18 * mm
    blue = colors.HexColor('#1d4ed8')

    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    c.setFillColor(blue)
    c.circle(margin_x + 2, y + 1, 2.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(margin_x + 2, y + 0.2, '4')
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 8.5)
    c.drawString(margin_x + 8 * mm, y - 0.5, 'IMPORTANCIA DA PARTICIPACAO DOS TRABALHADORES')
    c.setStrokeColor(blue)
    c.setLineWidth(1)
    c.line(margin_x, y - 4 * mm, width - margin_x, y - 4 * mm)
    y -= 11 * mm

    text = (
        'A participacao ativa, consciente e transparente dos trabalhadores constitui elemento fundamental para a efetividade '
        'desta Avaliacao Ergonomica Preliminar (AEP), em consonancia com os principios de participacao estabelecidos na '
        'NR-1 (item 1.5.3.1) e na NR-17, que ressaltam a relevancia do envolvimento dos colaboradores na identificacao e '
        'no gerenciamento dos riscos ocupacionais, inclusive daqueles relacionados aos fatores psicossociais do trabalho.\n\n'
        'Os trabalhadores sao aqueles que vivenciam cotidianamente os processos, as exigencias e os desafios do ambiente '
        'de trabalho, detendo conhecimento pratico e percepcoes concretas acerca dos fatores que influenciam sua saude, '
        'bem-estar, seguranca e desempenho. Nesse sentido, a participacao efetiva dos trabalhadores permite ao analista '
        'de AEP captar condicoes de trabalho que muitas vezes nao sao plenamente visiveis a observacao externa.\n\n'
        'A obtencao de percepcoes diretamente junto aos trabalhadores, de maneira anonima e confidencial, minimiza vieses '
        'de avaliacao e permite a identificacao de aspectos subjetivos que nao seriam evidenciados apenas por meio de '
        'observacoes tecnicas ou analise documental. Ademais, a participacao efetiva dos colaboradores fortalece o '
        'compromisso coletivo com a saude e a seguranca, estimulando o engajamento nas acoes de melhoria que venham a ser '
        'implementadas posteriormente.\n\n'
        'A ausencia de engajamento dos trabalhadores pode resultar em lacunas relevantes nas informacoes coletadas, '
        'tornando o diagnostico impreciso ou parcial e comprometendo a efetividade das medidas preventivas e corretivas '
        'propostas. Por essa razao, ressalta-se que a qualidade dos dados obtidos esta diretamente vinculada a consistencia '
        'de um ambiente de confianca, no qual os colaboradores se sintam seguros para manifestar suas percepcoes de forma '
        'transparente, sem receio de retaliacoes ou julgamentos.\n\n'
        'A promocao da transparencia, da escuta ativa e do dialogo permanente constitui estrategia essencial para assegurar '
        'essa participacao, em consonancia com o ciclo de melhoria continua do Gerenciamento de Risco Ocupacionais (GRO) e '
        'do Programa de Gerenciamento de Riscos (PGR). Essa abordagem participativa fortalece a cultura de saude e seguranca '
        'na organizacao, contribuindo para a construcao de um ambiente de trabalho mais seguro, saudavel, equilibrado e produtivo.\n\n'
        'Por fim, destaca-se que a participacao dos trabalhadores no processo de identificacao e avaliacao dos riscos '
        'psicossociais esta em consonancia com as melhores praticas internacionais recomendadas pela HSE-UK, configurando-se '
        'como um diferencial para organizacoes que buscam excelencia em seus sistemas de gestao de saude e seguranca do trabalho, '
        'promovendo resultados sustentaveis e valorizando o bem-estar de seus colaboradores.'
    )

    text_obj = c.beginText()
    text_obj.setTextOrigin(margin_x, y)
    body_font = 7.4
    body_leading = 10.4
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
        return bool(user and user.is_authenticated and (user.is_superuser or user.user_type == UserType.ADM))


class IsConsultorOrAdmUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.is_superuser or user.user_type in [UserType.ADM, UserType.CONSULTOR]


class DashboardOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsConsultorOrAdmUser]

    def get(self, request):
        empresa_id_raw = (request.query_params.get('empresa_id') or '').strip()
        empresa_id = None
        if empresa_id_raw:
            try:
                empresa_id = int(empresa_id_raw)
            except ValueError:
                return Response({'detail': 'Empresa invalida.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_build_dashboard_overview(request.user, empresa_id=empresa_id))


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
            return Response({'detail': 'Responsavel tecnico nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ConsultoriaResponsavelTecnicoSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(ConsultoriaResponsavelTecnicoSerializer(item).data)

    def put(self, request, tecnico_id):
        item = self._get_object(request, tecnico_id)
        if not item:
            return Response({'detail': 'Responsavel tecnico nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ConsultoriaResponsavelTecnicoSerializer(item, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(ConsultoriaResponsavelTecnicoSerializer(item).data)

    def delete(self, request, tecnico_id):
        item = self._get_object(request, tecnico_id)
        if not item:
            return Response({'detail': 'Responsavel tecnico nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
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
            return Response({'detail': 'Consultor nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ConsultorSerializer(consultor)
        return Response(serializer.data)

    def put(self, request, consultor_id):
        consultor = self.get_object(consultor_id)
        if not consultor:
            return Response({'detail': 'Consultor nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ConsultorSerializer(consultor, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        consultor = serializer.save()
        response_serializer = ConsultorSerializer(consultor)
        return Response(response_serializer.data)

    def patch(self, request, consultor_id):
        consultor = self.get_object(consultor_id)
        if not consultor:
            return Response({'detail': 'Consultor nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)

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
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = EmpresaSerializer(empresa)
        return Response(serializer.data)

    def patch(self, request, empresa_id):
        empresa = self.get_object(request, empresa_id)
        if not empresa:
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = EmpresaSerializer(empresa, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        empresa = serializer.save()
        return Response(EmpresaSerializer(empresa).data)

    def put(self, request, empresa_id):
        empresa = self.get_object(request, empresa_id)
        if not empresa:
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
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
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)

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
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
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
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
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
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
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
            return Response({'detail': 'Empresa nao encontrada.'}, status=status.HTTP_404_NOT_FOUND)
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
            return Response({'detail': 'Totem nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
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
            'ghes': ghes,
            'cargos': cargos,
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


class CanalDenunciasPublicView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def get_empresa(self, token):
        return Empresa.objects.filter(canal_denuncias_token=token, is_active=True).first()

    def get(self, request, token):
        empresa = self.get_empresa(token)
        if not empresa:
            return Response({'detail': 'Canal de denuncias nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)
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
            return Response({'detail': 'Canal de denuncias nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)

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

    def get_queryset(self, request):
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return Ghe.objects.select_related('empresa').all()
        return Ghe.objects.select_related('empresa').filter(empresa__consultor=request.user)

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
        queryset = Ghe.objects.select_related('empresa').filter(id=ghe_id)
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

    def get_queryset(self, request):
        if request.user.is_superuser or request.user.user_type == UserType.ADM:
            return Cargo.objects.select_related('empresa').all()
        return Cargo.objects.select_related('empresa').filter(empresa__consultor=request.user)

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
        queryset = Cargo.objects.select_related('empresa').filter(id=cargo_id)
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
            ref_qs = base_step1.filter(**{ref_field: ref['id']})
            per_ref.append({'ref': ref, **_build_report_bundle(campanha, empresa, ref_qs)})
        medidas = campanha.medidas_preliminares.select_related('setor', 'ghe').all()
        quandos = campanha.quandos_preliminares.select_related('setor', 'ghe').all()
        anexos = campanha.relatorio_anexos.all()
        rel_payload = {
            'empresa': {'name': empresa.company_name},
            'overall': overall_bundle,
            'filters': {'ref_label': ref_label, 'evaluation_type': empresa.evaluation_type},
            'per_ref': per_ref,
            'preliminary_measures': CampanhaMedidaPreliminarSerializer(medidas, many=True).data,
            'preliminary_whens': CampanhaQuandoPreliminarSerializer(quandos, many=True).data,
            'review_recommendation_months': campanha.review_recommendation_months,
            'attachments': CampanhaRelatorioAnexoSerializer(anexos, many=True).data,
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
                    'Diferentes setores/areas no trabalho exigem coisas de mim que sao dificeis de conciliar?',
                    'Tenho prazos impossiveis de cumprir?',
                    'Preciso trabalhar com muita intensidade?',
                    'Preciso deixar algumas tarefas de lado porque tenho muitas demandas?',
                    'Nao tenho possibilidade de fazer pausas suficientes?',
                    'Sofro pressao para trabalhar longas horas?',
                    'Preciso trabalhar muito rapido?',
                    'Tenho pausas temporarias impossiveis de cumprir?',
                ],
                'step2_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step3_questions': [
                    'Posso decidir quando fazer uma pausa?',
                    'Tenho voz para decidir a velocidade do meu proprio trabalho?',
                    'Tenho autonomia para decidir como faco meu trabalho?',
                    'Tenho autonomia para decidir o que faco no trabalho?',
                    'Tenho alguma influencia sobre a forma como realizo meu trabalho?',
                    'Meu horario de trabalho pode ser flexivel?',
                ],
                'step3_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step4_questions': [
                    'Recebo informacoes e suporte que me ajudam no trabalho que eu faco?',
                    'Posso contar com meu supervisor direto para me ajudar com problemas no trabalho?',
                    'Posso conversar com meu supervisor direto sobre algo que me incomoda no trabalho?',
                    'Recebo apoio em trabalhos emocionalmente exigentes?',
                    'Meu supervisor direto me incentiva no trabalho?',
                ],
                'step4_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step5_questions': [
                    'Se o trabalho ficar dificil, meus colegas podem me ajudar?',
                    'Recebo o apoio de que preciso dos meus colegas?',
                    'Recebo o respeito que mereco dos meus colegas?',
                    'Meus colegas estao dispostos a ouvir meus problemas relacionados ao trabalho?',
                ],
                'step5_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step6_questions': [
                    'Sou perseguido no trabalho?',
                    'Ha atritos ou desentendimentos entre colegas?',
                    'Falam ou se comportam comigo de forma dura?',
                    'Os relacionamentos no trabalho estao desgastados?',
                ],
                'step6_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step7_questions': [
                    'Eu entendo claramente o que e esperado de mim no trabalho?',
                    'Sei como realizar meu trabalho?',
                    'Sei claramente quais sao minhas funcoes e responsabilidades?',
                    'Compreendo os objetivos e metas do meu departamento?',
                    'Compreendo como o meu trabalho contribui para o objetivo geral da organizacao?',
                ],
                'step7_options': ['NUNCA', 'RARAMENTE', 'AS_VEZES', 'FREQUENTEMENTE', 'SEMPRE'],
                'step8_questions': [
                    'Tenho oportunidades suficientes para questionar os gestores sobre mudancas no trabalho?',
                    'Os funcionarios sao sempre consultados sobre mudancas no trabalho?',
                    'Quando ha mudancas no trabalho, compreendo claramente como elas serao aplicadas na pratica?',
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
