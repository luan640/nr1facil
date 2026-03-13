from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.db.models import Q
from django.utils import timezone
import uuid


class UserType(models.TextChoices):
    ADM = 'ADM', 'Administrador'
    CONSULTOR = 'CONSULTOR', 'Consultor'
    EMPRESA = 'EMPRESA', 'Empresa'


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('O e-mail e obrigatorio.')

        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        extra_fields.setdefault('user_type', UserType.EMPRESA)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields['user_type'] = UserType.ADM

        user = self.create_user(email=email, password=password, **extra_fields)
        if user.user_type != UserType.ADM:
            user.user_type = UserType.ADM
            user.save(update_fields=['user_type'])

        return user


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    user_type = models.CharField(
        max_length=20,
        choices=UserType.choices,
        default=UserType.EMPRESA,
    )
    is_active = models.BooleanField(default=True)
    access_expires_on = models.DateField(blank=True, null=True)
    consultoria_master = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        related_name='consultoria_usuarios',
        blank=True,
        null=True,
    )
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        if self.is_superuser and self.user_type != UserType.ADM:
            self.user_type = UserType.ADM
        if self.user_type != UserType.CONSULTOR:
            self.consultoria_master = None
        super().save(*args, **kwargs)

    def get_consultoria_owner(self):
        if self.user_type != UserType.CONSULTOR:
            return None
        return self.consultoria_master or self

    def is_consultoria_owner(self):
        return self.user_type == UserType.CONSULTOR and self.consultoria_master_id is None

    def has_system_access(self):
        if not self.is_active:
            return False
        if self.access_expires_on and self.access_expires_on < timezone.localdate():
            return False
        consultoria_owner = self.get_consultoria_owner()
        if consultoria_owner and consultoria_owner.id != self.id:
            if not consultoria_owner.is_active:
                return False
            if consultoria_owner.access_expires_on and consultoria_owner.access_expires_on < timezone.localdate():
                return False
        return True


class DocumentType(models.TextChoices):
    CPF = 'CPF', 'CPF'
    CNPJ = 'CNPJ', 'CNPJ'


class EstablishmentType(models.TextChoices):
    FILIAL = 'FILIAL', 'Filial'
    UNIDADE = 'UNIDADE', 'Unidade'
    MATRIZ = 'MATRIZ', 'Matriz'
    OUTRO = 'OUTRO', 'Outro'


class EvaluationType(models.TextChoices):
    SETOR = 'SETOR', 'Setor'
    GHE = 'GHE', 'GHE'


class Empresa(models.Model):
    consultor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='empresas_consultoria',
    )
    responsavel_usuario = models.OneToOneField(
        User,
        on_delete=models.PROTECT,
        related_name='empresa_responsavel',
    )
    document_type = models.CharField(max_length=4, choices=DocumentType.choices)
    document_number = models.CharField(max_length=20)
    company_name = models.CharField(max_length=255)
    establishment_type = models.CharField(max_length=10, choices=EstablishmentType.choices)
    establishment_custom_name = models.CharField(max_length=120, blank=True)
    establishment_name = models.CharField(max_length=255)
    evaluation_type = models.CharField(max_length=8, choices=EvaluationType.choices, default=EvaluationType.SETOR)
    cnae = models.CharField(max_length=120, blank=True)
    canal_denuncias_token = models.UUIDField(blank=True, null=True, unique=True, db_index=True)
    totem_token = models.UUIDField(blank=True, null=True, unique=True, db_index=True)
    responsible_name = models.CharField(max_length=255)
    risk_level = models.CharField(max_length=20)
    employee_count = models.PositiveIntegerField(default=0)
    logo = models.FileField(upload_to='empresa_logos/', blank=True, null=True)
    postal_code = models.CharField(max_length=12, blank=True)
    state = models.CharField(max_length=2, blank=True)
    city = models.CharField(max_length=120, blank=True)
    neighborhood = models.CharField(max_length=120, blank=True)
    street = models.CharField(max_length=180, blank=True)
    number = models.CharField(max_length=20, blank=True)
    complement = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['consultor', 'document_number'],
                name='uniq_empresa_documento_por_consultoria',
            ),
        ]

    def __str__(self):
        return self.company_name


class CanalDenuncia(models.Model):
    class Status(models.TextChoices):
        ABERTA = 'ABERTA', 'Aberta'
        EM_ANALISE = 'EM_ANALISE', 'Em analise'
        RESOLVIDA = 'RESOLVIDA', 'Resolvida'

    class Origem(models.TextChoices):
        LINK = 'LINK', 'Link de denúncia'
        TOTEM = 'TOTEM', 'Totem'

    class Tipo(models.TextChoices):
        ASSEDIO_MORAL = 'ASSEDIO_MORAL', 'Assédio moral'
        ASSEDIO_SEXUAL = 'ASSEDIO_SEXUAL', 'Assédio sexual'
        DISCRIMINACAO = 'DISCRIMINACAO', 'Discriminação'
        VIOLENCIA_VERBAL = 'VIOLENCIA_VERBAL', 'Violência verbal'
        VIOLENCIA_FISICA = 'VIOLENCIA_FISICA', 'Violência física'
        FRAUDE = 'FRAUDE', 'Fraude'
        CORRUPCAO = 'CORRUPCAO', 'Corrupção'
        DESVIO_CONDUTA = 'DESVIO_CONDUTA', 'Desvio de conduta'
        CONFLITO_INTERESSE = 'CONFLITO_INTERESSE', 'Conflito de interesse'
        OUTROS = 'OUTROS', 'Outros'

    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='canal_denuncias',
    )
    possui_vinculo = models.BooleanField()
    deseja_identificar = models.BooleanField(default=False)
    contato_identificacao = models.CharField(max_length=255, blank=True)
    setor = models.ForeignKey('Setor', on_delete=models.SET_NULL, null=True, blank=True, related_name='canal_denuncias')
    ghe = models.ForeignKey('Ghe', on_delete=models.SET_NULL, null=True, blank=True, related_name='canal_denuncias')
    cargo_funcao = models.ForeignKey('Cargo', on_delete=models.SET_NULL, null=True, blank=True, related_name='canal_denuncias')
    tipo = models.CharField(max_length=40, choices=Tipo.choices, default=Tipo.OUTROS)
    relato = models.TextField()
    testemunhas = models.TextField(blank=True)
    aceita_devolutiva = models.BooleanField(default=False)
    email_devolutiva = models.EmailField(blank=True)
    evidencia_arquivo = models.FileField(upload_to='canal_denuncias_evidencias/', blank=True, null=True)
    origem = models.CharField(max_length=20, choices=Origem.choices, default=Origem.LINK)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ABERTA)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Canal de Denuncia'
        verbose_name_plural = 'Canal de Denuncias'
        ordering = ['-created_at']

    def __str__(self):
        return f'Denuncia #{self.id} - {self.empresa.company_name}'


class CanalDenunciaAtualizacao(models.Model):
    denuncia = models.ForeignKey(
        CanalDenuncia,
        on_delete=models.CASCADE,
        related_name='atualizacoes',
    )
    texto = models.TextField()
    criado_por = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='atualizacoes_denuncias')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Atualizacao de Denuncia'
        verbose_name_plural = 'Atualizacoes de Denuncias'
        ordering = ['-created_at']

    def __str__(self):
        return f'Atualizacao #{self.id} da denuncia #{self.denuncia_id}'


class Setor(models.Model):
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='setores',
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Setor'
        verbose_name_plural = 'Setores'
        ordering = ['name']
        unique_together = ('empresa', 'name')

    def __str__(self):
        return f'{self.name} - {self.empresa.company_name}'


class Ghe(models.Model):
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='ghes',
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    setores = models.ManyToManyField(Setor, related_name='ghes', blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'GHE'
        verbose_name_plural = 'GHEs'
        ordering = ['name']
        unique_together = ('empresa', 'name')

    def __str__(self):
        return f'{self.name} - {self.empresa.company_name}'


class Cargo(models.Model):
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='cargos',
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    setores = models.ManyToManyField(Setor, related_name='cargos', blank=True)
    ghes = models.ManyToManyField(Ghe, related_name='cargos', blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cargo'
        verbose_name_plural = 'Cargos'
        ordering = ['name']
        unique_together = ('empresa', 'name')

    def __str__(self):
        return f'{self.name} - {self.empresa.company_name}'


class CampaignStatus(models.TextChoices):
    ATIVO = 'ATIVO', 'Ativo'
    ENCERRADO = 'ENCERRADO', 'Encerrado'


class Campanha(models.Model):
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='campanhas',
    )
    title = models.CharField(max_length=180)
    start_date = models.DateField()
    end_date = models.DateField()
    review_recommendation_months = models.PositiveSmallIntegerField(default=3)
    status = models.CharField(max_length=10, choices=CampaignStatus.choices, default=CampaignStatus.ATIVO)
    share_token = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    qr_code_data = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Campanha'
        verbose_name_plural = 'Campanhas'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} - {self.empresa.company_name}'

    def save(self, *args, **kwargs):
        if not self.share_token:
            self.share_token = uuid.uuid4()

        # Garante token unico sem depender de constraint no banco.
        while Campanha.objects.exclude(pk=self.pk).filter(share_token=self.share_token).exists():
            self.share_token = uuid.uuid4()

        super().save(*args, **kwargs)


class ConsultoriaConfiguracao(models.Model):
    consultor = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='consultoria_configuracao',
    )
    cnpj = models.CharField(max_length=20, blank=True)
    nome_consultoria = models.CharField(max_length=255, blank=True)
    responsavel_legal = models.CharField(max_length=255, blank=True)
    representante_legal_relatorio = models.CharField(max_length=255, blank=True)
    cidade = models.CharField(max_length=120, blank=True)
    uf = models.CharField(max_length=2, blank=True)
    logo = models.FileField(upload_to='consultoria_logos/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuracao da Consultoria'
        verbose_name_plural = 'Configuracoes da Consultoria'

    def __str__(self):
        return self.nome_consultoria or f'Consultoria {self.consultor.email}'


class ConsultoriaResponsavelTecnico(models.Model):
    configuracao = models.ForeignKey(
        ConsultoriaConfiguracao,
        on_delete=models.CASCADE,
        related_name='responsaveis_tecnicos',
    )
    nome = models.CharField(max_length=255)
    formacao = models.CharField(max_length=255)
    registro = models.CharField(max_length=120)
    responsavel_totem = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Responsavel Tecnico da Consultoria'
        verbose_name_plural = 'Responsaveis Tecnicos da Consultoria'
        ordering = ['id']

    def __str__(self):
        return self.nome


class SexChoice(models.TextChoices):
    MASCULINO = 'M', 'Masculino'
    FEMININO = 'F', 'Feminino'
    OUTRO = 'O', 'Outro'
    NAO_INFORMAR = 'N', 'Prefiro não informar'


class CampanhaRespostaStep1(models.Model):
    campanha = models.ForeignKey(
        Campanha,
        on_delete=models.CASCADE,
        related_name='step1_respostas',
    )
    cpf = models.CharField(max_length=11)
    cpf_hash = models.CharField(max_length=64, blank=True, default='', db_index=True)
    first_name = models.CharField(max_length=120, blank=True)
    age = models.PositiveIntegerField()
    sex = models.CharField(max_length=1, choices=SexChoice.choices, blank=True)
    setor = models.ForeignKey(Setor, on_delete=models.SET_NULL, null=True, blank=True, related_name='campanha_step1_respostas')
    ghe = models.ForeignKey(Ghe, on_delete=models.SET_NULL, null=True, blank=True, related_name='campanha_step1_respostas')
    cargo = models.ForeignKey(Cargo, on_delete=models.SET_NULL, null=True, blank=True, related_name='campanha_step1_respostas')
    is_completed = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Resposta Step 1'
        verbose_name_plural = 'Respostas Step 1'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['campanha', 'cpf'])]
        constraints = [
            models.UniqueConstraint(
                fields=['campanha', 'cpf_hash'],
                condition=(~Q(cpf_hash='') & Q(is_completed=True)),
                name='uniq_campanha_cpf_hash_step1',
            )
        ]

    def __str__(self):
        return f'{self.cpf} - {self.campanha.title}'


class FrequencyChoice(models.TextChoices):
    NUNCA = 'NUNCA', 'Nunca'
    RARAMENTE = 'RARAMENTE', 'Raramente'
    AS_VEZES = 'AS_VEZES', 'As vezes'
    FREQUENTEMENTE = 'FREQUENTEMENTE', 'Frequentemente'
    SEMPRE = 'SEMPRE', 'Sempre'


class CampanhaRespostaStep2(models.Model):
    step1 = models.OneToOneField(
        CampanhaRespostaStep1,
        on_delete=models.CASCADE,
        related_name='step2',
    )
    q1 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q2 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q3 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q4 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q5 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q6 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q7 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q8 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Resposta Step 2'
        verbose_name_plural = 'Respostas Step 2'
        ordering = ['-created_at']

    def __str__(self):
        return f'Step 2 - {self.step1.campanha.title} - {self.step1.id}'


class CampanhaRespostaStep3(models.Model):
    step1 = models.OneToOneField(
        CampanhaRespostaStep1,
        on_delete=models.CASCADE,
        related_name='step3',
    )
    q1 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q2 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q3 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q4 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q5 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q6 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Resposta Step 3'
        verbose_name_plural = 'Respostas Step 3'
        ordering = ['-created_at']

    def __str__(self):
        return f'Step 3 - {self.step1.campanha.title} - {self.step1.id}'


class CampanhaRespostaStep4(models.Model):
    step1 = models.OneToOneField(
        CampanhaRespostaStep1,
        on_delete=models.CASCADE,
        related_name='step4',
    )
    q1 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q2 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q3 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q4 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q5 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Resposta Step 4'
        verbose_name_plural = 'Respostas Step 4'
        ordering = ['-created_at']

    def __str__(self):
        return f'Step 4 - {self.step1.campanha.title} - {self.step1.id}'


class CampanhaRespostaStep5(models.Model):
    step1 = models.OneToOneField(
        CampanhaRespostaStep1,
        on_delete=models.CASCADE,
        related_name='step5',
    )
    q1 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q2 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q3 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q4 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Resposta Step 5'
        verbose_name_plural = 'Respostas Step 5'
        ordering = ['-created_at']

    def __str__(self):
        return f'Step 5 - {self.step1.campanha.title} - {self.step1.id}'


class CampanhaRespostaStep6(models.Model):
    step1 = models.OneToOneField(
        CampanhaRespostaStep1,
        on_delete=models.CASCADE,
        related_name='step6',
    )
    q1 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q2 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q3 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q4 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Resposta Step 6'
        verbose_name_plural = 'Respostas Step 6'
        ordering = ['-created_at']

    def __str__(self):
        return f'Step 6 - {self.step1.campanha.title} - {self.step1.id}'


class CampanhaRespostaStep7(models.Model):
    step1 = models.OneToOneField(
        CampanhaRespostaStep1,
        on_delete=models.CASCADE,
        related_name='step7',
    )
    q1 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q2 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q3 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q4 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q5 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Resposta Step 7'
        verbose_name_plural = 'Respostas Step 7'
        ordering = ['-created_at']

    def __str__(self):
        return f'Step 7 - {self.step1.campanha.title} - {self.step1.id}'


class CampanhaRespostaStep8(models.Model):
    step1 = models.OneToOneField(
        CampanhaRespostaStep1,
        on_delete=models.CASCADE,
        related_name='step8',
    )
    q1 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q2 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    q3 = models.CharField(max_length=20, choices=FrequencyChoice.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Resposta Step 8'
        verbose_name_plural = 'Respostas Step 8'
        ordering = ['-created_at']

    def __str__(self):
        return f'Step 8 - {self.step1.campanha.title} - {self.step1.id}'


class CampanhaRespostaStep9(models.Model):
    step1 = models.OneToOneField(
        CampanhaRespostaStep1,
        on_delete=models.CASCADE,
        related_name='step9',
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Resposta Step 9'
        verbose_name_plural = 'Respostas Step 9'
        ordering = ['-created_at']

    def __str__(self):
        return f'Step 9 - {self.step1.campanha.title} - {self.step1.id}'


class MedidaScopeType(models.TextChoices):
    GERAL = 'GERAL', 'Geral'
    SETOR = 'SETOR', 'Setor'
    GHE = 'GHE', 'GHE'


class CampanhaMedidaPreliminar(models.Model):
    campanha = models.ForeignKey(
        Campanha,
        on_delete=models.CASCADE,
        related_name='medidas_preliminares',
    )
    step_number = models.PositiveSmallIntegerField()
    question_field = models.CharField(max_length=10)
    scope_type = models.CharField(max_length=10, choices=MedidaScopeType.choices, default=MedidaScopeType.GERAL)
    setor = models.ForeignKey(Setor, on_delete=models.CASCADE, null=True, blank=True, related_name='medidas_preliminares')
    ghe = models.ForeignKey(Ghe, on_delete=models.CASCADE, null=True, blank=True, related_name='medidas_preliminares')
    action_text = models.CharField(max_length=500)
    when_months = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='medidas_preliminares_criadas')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Medida preliminar'
        verbose_name_plural = 'Medidas preliminares'
        ordering = ['step_number', 'question_field', '-created_at']
        indexes = [
            models.Index(fields=['campanha', 'step_number', 'question_field']),
            models.Index(fields=['campanha', 'scope_type']),
        ]

    def __str__(self):
        return f'Medida {self.campanha.title} Step {self.step_number} {self.question_field}'


class CampanhaQuandoPreliminar(models.Model):
    campanha = models.ForeignKey(
        Campanha,
        on_delete=models.CASCADE,
        related_name='quandos_preliminares',
    )
    step_number = models.PositiveSmallIntegerField()
    question_field = models.CharField(max_length=10)
    scope_type = models.CharField(max_length=10, choices=MedidaScopeType.choices, default=MedidaScopeType.GERAL)
    setor = models.ForeignKey(Setor, on_delete=models.CASCADE, null=True, blank=True, related_name='quandos_preliminares')
    ghe = models.ForeignKey(Ghe, on_delete=models.CASCADE, null=True, blank=True, related_name='quandos_preliminares')
    when_months = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='quandos_preliminares_criados')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Quando preliminar'
        verbose_name_plural = 'Quandos preliminares'
        ordering = ['step_number', 'question_field']
        constraints = [
            models.UniqueConstraint(
                fields=['campanha', 'step_number', 'question_field', 'scope_type', 'setor', 'ghe'],
                name='uniq_quando_preliminar_por_pergunta_escopo',
            )
        ]

    def __str__(self):
        return f'Quando {self.campanha.title} Step {self.step_number} {self.question_field}'


class CampanhaRelatorioAnexo(models.Model):
    campanha = models.ForeignKey(
        Campanha,
        on_delete=models.CASCADE,
        related_name='relatorio_anexos',
    )
    file_name = models.CharField(max_length=255)
    file_key = models.CharField(max_length=600, unique=True)
    file_url = models.URLField(max_length=900)
    content_type = models.CharField(max_length=120, blank=True)
    size_bytes = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='relatorio_anexos_enviados')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Anexo de relatorio'
        verbose_name_plural = 'Anexos de relatorio'
        ordering = ['-created_at']

    def __str__(self):
        return f'Anexo {self.file_name} ({self.campanha.title})'


class RegistroHumor(models.Model):
    class Humor(models.TextChoices):
        FELIZ          = 'feliz',          'Feliz'
        MOTIVADO       = 'motivado',       'Motivado'
        TRANQUILO      = 'tranquilo',      'Tranquilo'
        CANSADO        = 'cansado',        'Cansado'
        ESTRESSADO     = 'estressado',     'Estressado'
        TRISTE         = 'triste',         'Triste'
        ANSIOSO        = 'ansioso',        'Ansioso'
        SOBRECARREGADO = 'sobrecarregado', 'Sobrecarregado'

    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='registros_humor',
    )
    ghe = models.ForeignKey(
        Ghe,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registros_humor',
    )
    setor = models.ForeignKey(
        Setor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registros_humor',
    )
    humor = models.CharField(max_length=20, choices=Humor.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Registro de Humor'
        verbose_name_plural = 'Registros de Humor'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.humor} - {self.empresa.company_name} ({self.created_at:%d/%m/%Y})'


class PedidoAjuda(models.Model):
    class Status(models.TextChoices):
        ABERTO = 'ABERTO', 'Aberto'
        EM_ATENDIMENTO = 'EM_ATENDIMENTO', 'Em atendimento'
        ATENDIDO = 'ATENDIDO', 'Atendido'

    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='pedidos_ajuda',
    )
    nome = models.CharField(max_length=255)
    contato = models.CharField(max_length=255, blank=True)
    ghe = models.ForeignKey(
        Ghe,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pedidos_ajuda',
    )
    funcao = models.ForeignKey(
        Cargo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pedidos_ajuda',
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ABERTO)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pedido de Ajuda'
        verbose_name_plural = 'Pedidos de Ajuda'
        ordering = ['-created_at']

    def __str__(self):
        return f'Pedido #{self.id} - {self.nome} ({self.empresa.company_name})'


class PedidoAjudaAtualizacao(models.Model):
    pedido = models.ForeignKey(
        PedidoAjuda,
        on_delete=models.CASCADE,
        related_name='atualizacoes',
    )
    texto = models.TextField()
    criado_por = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='atualizacoes_pedidos_ajuda',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Atualizacao de Pedido de Ajuda'
        verbose_name_plural = 'Atualizacoes de Pedidos de Ajuda'
        ordering = ['-created_at']

    def __str__(self):
        return f'Atualizacao #{self.id} do pedido #{self.pedido_id}'


class CampanhaPlanoAcao(models.Model):
    campanha = models.ForeignKey(
        Campanha,
        on_delete=models.CASCADE,
        related_name='planos_acao',
    )
    step_key = models.CharField(max_length=20)
    question_field = models.CharField(max_length=10)
    plano_index = models.PositiveSmallIntegerField()
    ativo = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Plano de Ação da Campanha'
        verbose_name_plural = 'Planos de Ação da Campanha'
        unique_together = ('campanha', 'step_key', 'question_field', 'plano_index')

    def __str__(self):
        return f'Plano {self.plano_index} | {self.step_key}/{self.question_field} | Campanha #{self.campanha_id}'
