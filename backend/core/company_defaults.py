from .models import Cargo, Ghe, Setor


DEFAULT_EMPRESA_STRUCTURE = [
    ('Administrativo', 'Administrativo Geral', 'Assistente Administrativo'),
    ('Administrativo', 'Financeiro', 'Analista Financeiro'),
    ('Administrativo', 'Contábil', 'Assistente Contábil'),
    ('Administrativo', 'Fiscal', 'Analista Fiscal'),
    ('Administrativo', 'Recursos Humanos', 'Assistente de RH'),
    ('Administrativo', 'Departamento Pessoal', 'Analista de DP'),
    ('Administrativo', 'TI', 'Analista de Sistemas'),
    ('Administrativo', 'TI', 'Suporte Técnico'),
    ('Comercial', 'Vendas Internas', 'Vendedor Interno'),
    ('Comercial', 'Vendas Externas', 'Representante Comercial'),
    ('Comercial', 'Pós-Vendas', 'Analista de Garantia'),
    ('Comercial', 'SAC', 'Assistente de Atendimento'),
    ('Comercial', 'Marketing', 'Analista de Marketing'),
    ('Comercial', 'Licitações', 'Analista de Licitação'),
    ('Produção Industrial', 'Corte', 'Operador de Corte'),
    ('Produção Industrial', 'Serra', 'Operador de Serra'),
    ('Produção Industrial', 'Usinagem', 'Operador de CNC'),
    ('Produção Industrial', 'Usinagem', 'Torneiro Mecânico'),
    ('Produção Industrial', 'Solda', 'Soldador'),
    ('Produção Industrial', 'Pintura', 'Pintor Industrial'),
    ('Produção Industrial', 'Montagem', 'Montador'),
    ('Produção Industrial', 'Estamparia', 'Operador de Prensa'),
    ('Produção Industrial', 'Produção Geral', 'Auxiliar de Produção'),
    ('Logística', 'Almoxarifado', 'Almoxarife'),
    ('Logística', 'Almoxarifado', 'Auxiliar de Almoxarifado'),
    ('Logística', 'Estoque', 'Estoquista'),
    ('Logística', 'Expedição', 'Conferente'),
    ('Logística', 'Expedição', 'Auxiliar de Expedição'),
    ('Logística', 'Recebimento', 'Conferente de Recebimento'),
    ('Logística', 'Transporte', 'Motorista'),
    ('Logística', 'Transporte', 'Ajudante de Entrega'),
    ('Manutenção', 'Manutenção Mecânica', 'Mecânico de Manutenção'),
    ('Manutenção', 'Manutenção Elétrica', 'Eletricista Industrial'),
    ('Manutenção', 'Manutenção Predial', 'Auxiliar de Manutenção'),
    ('Manutenção', 'Manutenção Geral', 'Técnico de Manutenção'),
    ('Engenharia / Técnico', 'Engenharia de Produção', 'Engenheiro de Produção'),
    ('Engenharia / Técnico', 'PCP', 'Analista de PCP'),
    ('Engenharia / Técnico', 'Qualidade', 'Inspetor de Qualidade'),
    ('Engenharia / Técnico', 'Qualidade', 'Analista de Qualidade'),
    ('Engenharia / Técnico', 'Desenvolvimento', 'Projetista'),
    ('Engenharia / Técnico', 'Desenho Técnico', 'Desenhista Mecânico'),
    ('Gestão', 'Produção', 'Supervisor de Produção'),
    ('Gestão', 'Administrativo', 'Coordenador Administrativo'),
    ('Gestão', 'Comercial', 'Gerente Comercial'),
    ('Gestão', 'Industrial', 'Gerente Industrial'),
    ('Gestão', 'Diretoria', 'Diretor Operacional'),
    ('Externo / Campo', 'Assistência Técnica', 'Técnico de Campo'),
    ('Externo / Campo', 'Instalação', 'Instalador'),
    ('Externo / Campo', 'Atendimento Rural', 'Mecânico Externo'),
    ('Externo / Campo', 'Entrega Técnica', 'Técnico de Entrega'),
    ('Segurança do Trabalho', 'SESMT', 'Técnico de Segurança do Trabalho'),
    ('Segurança do Trabalho', 'SESMT', 'Engenheiro de Segurança'),
    ('Segurança do Trabalho', 'SESMT', 'Auxiliar de Segurança'),
]


def seed_empresa_default_structure(empresa):
    """Cria GHEs, setores e funções padrão para uma empresa recém-criada."""
    ghe_names = {ghe_name for ghe_name, _, _ in DEFAULT_EMPRESA_STRUCTURE}
    setor_names = {setor_name for _, setor_name, _ in DEFAULT_EMPRESA_STRUCTURE}
    cargo_names = {cargo_name for _, _, cargo_name in DEFAULT_EMPRESA_STRUCTURE}

    existing_ghes = {
        ghe.name: ghe
        for ghe in Ghe.objects.filter(empresa=empresa, name__in=ghe_names)
    }
    missing_ghes = [
        Ghe(empresa=empresa, name=name, description='', is_active=True)
        for name in ghe_names
        if name not in existing_ghes
    ]
    if missing_ghes:
        Ghe.objects.bulk_create(missing_ghes)

    existing_setores = {
        setor.name: setor
        for setor in Setor.objects.filter(empresa=empresa, name__in=setor_names)
    }
    missing_setores = [
        Setor(empresa=empresa, name=name, description='', is_active=True)
        for name in setor_names
        if name not in existing_setores
    ]
    if missing_setores:
        Setor.objects.bulk_create(missing_setores)

    existing_cargos = {
        cargo.name: cargo
        for cargo in Cargo.objects.filter(empresa=empresa, name__in=cargo_names)
    }
    missing_cargos = [
        Cargo(empresa=empresa, name=name, description='', is_active=True)
        for name in cargo_names
        if name not in existing_cargos
    ]
    if missing_cargos:
        Cargo.objects.bulk_create(missing_cargos)

    ghe_map = {ghe.name: ghe for ghe in Ghe.objects.filter(empresa=empresa, name__in=ghe_names)}
    setor_map = {setor.name: setor for setor in Setor.objects.filter(empresa=empresa, name__in=setor_names)}
    cargo_map = {cargo.name: cargo for cargo in Cargo.objects.filter(empresa=empresa, name__in=cargo_names)}

    cargo_ghe_through = Cargo.ghes.through
    cargo_setor_through = Cargo.setores.through
    ghe_setor_through = Ghe.setores.through

    cargo_ghe_links = []
    cargo_setor_links = []
    ghe_setor_links = []
    for ghe_name, setor_name, cargo_name in DEFAULT_EMPRESA_STRUCTURE:
        cargo = cargo_map[cargo_name]
        ghe = ghe_map[ghe_name]
        setor = setor_map[setor_name]
        cargo_ghe_links.append(cargo_ghe_through(cargo_id=cargo.id, ghe_id=ghe.id))
        cargo_setor_links.append(cargo_setor_through(cargo_id=cargo.id, setor_id=setor.id))
        ghe_setor_links.append(ghe_setor_through(ghe_id=ghe.id, setor_id=setor.id))

    if cargo_ghe_links:
        cargo_ghe_through.objects.bulk_create(cargo_ghe_links, ignore_conflicts=True)
    if cargo_setor_links:
        cargo_setor_through.objects.bulk_create(cargo_setor_links, ignore_conflicts=True)
    if ghe_setor_links:
        ghe_setor_through.objects.bulk_create(ghe_setor_links, ignore_conflicts=True)
