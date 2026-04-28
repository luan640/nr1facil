from django.contrib.auth import authenticate
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from io import BytesIO
import base64
import hashlib
from rest_framework import serializers

from .company_defaults import seed_empresa_default_structure
from .models import CanalDenuncia, CanalDenunciaAtualizacao, Campanha, CampanhaMedidaPreliminar, CampanhaPlanoAcao, CampanhaQuandoPreliminar, CampanhaRelatorioAnexo, CampanhaRespostaStep1, CampanhaRespostaStep2, CampanhaRespostaStep3, CampanhaRespostaStep4, CampanhaRespostaStep5, CampanhaRespostaStep6, CampanhaRespostaStep7, CampanhaRespostaStep8, CampanhaRespostaStep9, Cargo, ConsultoriaConfiguracao, ConsultoriaResponsavelTecnico, DocumentType, Empresa, EstablishmentType, EvaluationType, FrequencyChoice, Ghe, MedidaScopeType, PedidoAjuda, PedidoAjudaAtualizacao, RegistroHumor, Setor, User, UserType


def get_system_team_owner(user):
    if not user:
        return None
    if user.is_superuser or user.user_type == UserType.ADM:
        return User.objects.filter(is_superuser=True, user_type=UserType.ADM).order_by('id').first() or user
    if user.user_type == UserType.CONSULTOR:
        return user.get_consultoria_owner() or user
    return user


def get_consultoria_owner(user):
    if not user:
        return None
    if user.user_type == UserType.CONSULTOR:
        return user.get_consultoria_owner() or user
    if user.is_superuser or user.user_type == UserType.ADM:
        return get_system_team_owner(user)
    return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        user_by_email = User.objects.filter(email__iexact=email).select_related('consultoria_master').first()
        if user_by_email and user_by_email.check_password(password):
            consultoria_owner = user_by_email.get_consultoria_owner() if hasattr(user_by_email, 'get_consultoria_owner') else None
            owner_inactive = bool(
                consultoria_owner
                and consultoria_owner.id != user_by_email.id
                and not consultoria_owner.is_active
            )
            owner_expired = bool(
                consultoria_owner
                and consultoria_owner.id != user_by_email.id
                and consultoria_owner.access_expires_on
                and consultoria_owner.access_expires_on < timezone.localdate()
            )
            if not user_by_email.is_active or owner_inactive:
                raise serializers.ValidationError('Entre em contato com o suporte.')
            if (
                (user_by_email.access_expires_on and user_by_email.access_expires_on < timezone.localdate())
                or owner_expired
            ):
                raise serializers.ValidationError('Acesso expirado. Entre em contato com o suporte.')

        user = authenticate(request=self.context.get('request'), email=email, password=password)
        if not user:
            raise serializers.ValidationError('E-mail ou senha invalidos.')
        if hasattr(user, 'has_system_access') and not user.has_system_access():
            raise serializers.ValidationError('Entre em contato com o suporte.')
        if user.access_expires_on and user.access_expires_on < timezone.localdate():
            raise serializers.ValidationError('Acesso expirado. Entre em contato com o administrador.')

        attrs['user'] = user
        return attrs


class ConsultorSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    nome_consultoria = serializers.SerializerMethodField(read_only=True)
    total_usuarios = serializers.SerializerMethodField(read_only=True)
    total_empresas = serializers.SerializerMethodField(read_only=True)
    total_campanhas = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'password',
            'is_active',
            'access_expires_on',
            'date_joined',
            'nome_consultoria',
            'total_usuarios',
            'total_empresas',
            'total_campanhas',
        ]
        read_only_fields = ['id', 'date_joined']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            full_name=validated_data.get('full_name', ''),
            user_type=UserType.CONSULTOR,
            is_active=validated_data.get('is_active', True),
            access_expires_on=validated_data.get('access_expires_on'),
            is_staff=False,
            is_superuser=False,
        )
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.user_type = UserType.CONSULTOR
        instance.is_staff = False
        instance.is_superuser = False

        if password:
            instance.set_password(password)

        instance.save()
        return instance

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'Senha e obrigatoria para criar consultor.'})
        return attrs

    def get_nome_consultoria(self, obj):
        cfg = getattr(obj, 'consultoria_configuracao', None)
        if cfg and cfg.nome_consultoria:
            return cfg.nome_consultoria
        return obj.full_name or obj.email

    def get_total_usuarios(self, obj):
        if obj.user_type != UserType.CONSULTOR or obj.consultoria_master_id is not None:
            return 0
        return 1 + obj.consultoria_usuarios.count()

    def get_total_empresas(self, obj):
        if obj.user_type != UserType.CONSULTOR or obj.consultoria_master_id is not None:
            return 0
        return obj.empresas_consultoria.count()

    def get_total_campanhas(self, obj):
        if obj.user_type != UserType.CONSULTOR or obj.consultoria_master_id is not None:
            return 0
        return Campanha.objects.filter(empresa__consultor=obj).count()


class ConsultoriaUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    consultoria_owner_id = serializers.IntegerField(source='consultoria_master_id', read_only=True)
    consultoria_owner_email = serializers.EmailField(source='consultoria_master.email', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'password',
            'is_active',
            'date_joined',
            'consultoria_owner_id',
            'consultoria_owner_email',
        ]
        read_only_fields = ['id', 'date_joined', 'consultoria_owner_id', 'consultoria_owner_email']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        request = self.context.get('request')
        consultoria_owner = get_consultoria_owner(getattr(request, 'user', None))
        return User.objects.create_user(
            email=validated_data['email'],
            password=password,
            full_name=validated_data.get('full_name', ''),
            user_type=UserType.CONSULTOR,
            is_active=validated_data.get('is_active', True),
            is_staff=False,
            is_superuser=False,
            consultoria_master=consultoria_owner,
        )

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.user_type = UserType.CONSULTOR
        instance.is_staff = False
        instance.is_superuser = False
        if password:
            instance.set_password(password)
        instance.save()
        return instance

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'Senha e obrigatoria para criar usuario da consultoria.'})
        return attrs


class SystemAccountSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'password', 'is_active', 'access_expires_on', 'date_joined', 'is_superuser']
        read_only_fields = ['id', 'date_joined', 'is_superuser']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            full_name=validated_data.get('full_name', ''),
            user_type=UserType.ADM,
            is_active=validated_data.get('is_active', True),
            is_staff=True,
            is_superuser=True,
        )
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.user_type = UserType.ADM
        instance.is_staff = True
        instance.is_superuser = True

        if password:
            instance.set_password(password)

        instance.save()
        return instance

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'Senha e obrigatoria para criar conta do sistema.'})
        return attrs


class LegacyEmpresaSerializer(serializers.ModelSerializer):
    responsible_email = serializers.EmailField(write_only=True)
    responsible_password = serializers.CharField(write_only=True, required=False, min_length=6)
    create_default_structure = serializers.BooleanField(write_only=True, required=False, default=True)
    responsible_user_email = serializers.EmailField(source='responsavel_usuario.email', read_only=True)
    logo_url = serializers.SerializerMethodField(read_only=True)
    consultor_id = serializers.IntegerField(source='consultor.id', read_only=True)
    consultor_name = serializers.CharField(source='consultor.full_name', read_only=True)

    class Meta:
        model = Empresa
        fields = [
            'id',
            'document_type',
            'document_number',
            'company_name',
            'establishment_type',
            'establishment_custom_name',
            'establishment_name',
            'evaluation_type',
            'cnae',
            'responsible_name',
            'responsible_email',
            'responsible_password',
            'create_default_structure',
            'responsible_user_email',
            'risk_level',
            'employee_count',
            'logo',
            'logo_url',
            'phone',
            'postal_code',
            'state',
            'city',
            'neighborhood',
            'street',
            'number',
            'complement',
            'is_active',
            'created_at',
            'updated_at',
            'consultor_id',
            'consultor_name',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'responsible_user_email', 'logo_url', 'consultor_id', 'consultor_name']

    def validate_document_number(self, value):
        return ''.join(char for char in value if char.isdigit())

    def validate(self, attrs):
        request = self.context.get('request')
        document_type = attrs.get('document_type') or getattr(self.instance, 'document_type', None)
        document_number = attrs.get('document_number') or getattr(self.instance, 'document_number', '')
        establishment_type = attrs.get('establishment_type') or getattr(self.instance, 'establishment_type', None)
        responsible_email = str(
            attrs.get('responsible_email')
            or getattr(getattr(self.instance, 'responsavel_usuario', None), 'email', '')
            or ''
        ).strip().lower()

        if document_type == DocumentType.CPF and len(document_number) != 11:
            raise serializers.ValidationError({'document_number': 'CPF deve ter 11 digitos.'})

        if document_type == DocumentType.CNPJ and len(document_number) != 14:
            raise serializers.ValidationError({'document_number': 'CNPJ deve ter 14 digitos.'})

        if establishment_type not in EstablishmentType.values:
            raise serializers.ValidationError({'establishment_type': 'Tipo de estabelecimento inválido.'})

        evaluation_type = attrs.get('evaluation_type') or getattr(self.instance, 'evaluation_type', None)
        if evaluation_type not in EvaluationType.values:
            raise serializers.ValidationError({'evaluation_type': 'Tipo de avaliação inválido.'})

        consultoria_owner = get_consultoria_owner(getattr(request, 'user', None))
        if consultoria_owner and document_number:
            exists_qs = Empresa.objects.filter(
                consultor=consultoria_owner,
                document_number=document_number,
            )
            if self.instance:
                exists_qs = exists_qs.exclude(id=self.instance.id)
            if exists_qs.exists():
                raise serializers.ValidationError({
                    'document_number': 'Já existe uma empresa com este documento nesta consultoria.'
                })

        if responsible_email:
            user_qs = User.objects.filter(email__iexact=responsible_email)
            if self.instance and getattr(self.instance, 'responsavel_usuario_id', None):
                user_qs = user_qs.exclude(id=self.instance.responsavel_usuario_id)
            if user_qs.exists():
                raise serializers.ValidationError({
                    'responsible_email': 'Já existe um usuário com este e-mail.'
                })

        return attrs

    def get_logo_url(self, obj):
        if not getattr(obj, 'logo', None):
            return ''
        try:
            url = obj.logo.url
        except Exception:
            return ''
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def create(self, validated_data):
        request = self.context.get('request')
        responsible_email = validated_data.pop('responsible_email')
        responsible_password = validated_data.pop('responsible_password', None)
        create_default_structure = validated_data.pop('create_default_structure', True)
        consultor_owner = get_consultoria_owner(request.user)
        with transaction.atomic():
            responsible_user = User.objects.create_user(
                email=responsible_email,
                password=responsible_password,
                full_name=validated_data.get('responsible_name', ''),
                user_type=UserType.EMPRESA,
                is_active=validated_data.get('is_active', True),
            )

            empresa = Empresa.objects.create(
                consultor=consultor_owner,
                responsavel_usuario=responsible_user,
                **validated_data,
            )
            if create_default_structure:
                seed_empresa_default_structure(empresa)
        return empresa

    def update(self, instance, validated_data):
        responsible_email = validated_data.pop('responsible_email', None)
        responsible_password = validated_data.pop('responsible_password', None)
        validated_data.pop('create_default_structure', None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        responsible_user = instance.responsavel_usuario
        if responsible_email and responsible_email != responsible_user.email:
            responsible_user.email = responsible_email
        responsible_user.full_name = instance.responsible_name
        responsible_user.is_active = instance.is_active
        responsible_user.user_type = UserType.EMPRESA
        if responsible_password:
            responsible_user.set_password(responsible_password)
        responsible_user.save()

        instance.save()
        return instance


class EmpresaSerializer(serializers.ModelSerializer):
    responsible_email = serializers.EmailField()
    responsible_password = serializers.CharField(write_only=True, required=False, min_length=6)
    create_default_structure = serializers.BooleanField(write_only=True, required=False, default=True)
    responsible_user_email = serializers.EmailField(source='responsible_email', read_only=True)
    logo_url = serializers.SerializerMethodField(read_only=True)
    consultor_id = serializers.IntegerField(source='consultor.id', read_only=True)
    consultor_name = serializers.CharField(source='consultor.full_name', read_only=True)

    class Meta:
        model = Empresa
        fields = [
            'id',
            'document_type',
            'document_number',
            'company_name',
            'establishment_type',
            'establishment_custom_name',
            'establishment_name',
            'evaluation_type',
            'cnae',
            'responsible_name',
            'responsible_email',
            'responsible_password',
            'create_default_structure',
            'responsible_user_email',
            'risk_level',
            'employee_count',
            'logo',
            'logo_url',
            'phone',
            'postal_code',
            'state',
            'city',
            'neighborhood',
            'street',
            'number',
            'complement',
            'is_active',
            'created_at',
            'updated_at',
            'consultor_id',
            'consultor_name',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'responsible_user_email', 'logo_url', 'consultor_id', 'consultor_name']

    def validate_document_number(self, value):
        return ''.join(char for char in value if char.isdigit())

    def validate(self, attrs):
        request = self.context.get('request')
        document_type = attrs.get('document_type') or getattr(self.instance, 'document_type', None)
        document_number = attrs.get('document_number') or getattr(self.instance, 'document_number', '')
        establishment_type = attrs.get('establishment_type') or getattr(self.instance, 'establishment_type', None)

        if document_type == DocumentType.CPF and len(document_number) != 11:
            raise serializers.ValidationError({'document_number': 'CPF deve ter 11 digitos.'})

        if document_type == DocumentType.CNPJ and len(document_number) != 14:
            raise serializers.ValidationError({'document_number': 'CNPJ deve ter 14 digitos.'})

        if establishment_type not in EstablishmentType.values:
            raise serializers.ValidationError({'establishment_type': 'Tipo de estabelecimento invÃ¡lido.'})

        evaluation_type = attrs.get('evaluation_type') or getattr(self.instance, 'evaluation_type', None)
        if evaluation_type not in EvaluationType.values:
            raise serializers.ValidationError({'evaluation_type': 'Tipo de avaliaÃ§Ã£o invÃ¡lido.'})

        consultoria_owner = get_consultoria_owner(getattr(request, 'user', None))
        if consultoria_owner and document_number:
            exists_qs = Empresa.objects.filter(
                consultor=consultoria_owner,
                document_number=document_number,
            )
            if self.instance:
                exists_qs = exists_qs.exclude(id=self.instance.id)
            if exists_qs.exists():
                raise serializers.ValidationError({
                    'document_number': 'JÃ¡ existe uma empresa com este documento nesta consultoria.'
                })

        return attrs

    def get_logo_url(self, obj):
        if not getattr(obj, 'logo', None):
            return ''
        try:
            url = obj.logo.url
        except Exception:
            return ''
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data.pop('responsible_password', None)
        create_default_structure = validated_data.pop('create_default_structure', True)
        consultor_owner = get_consultoria_owner(request.user)
        with transaction.atomic():
            empresa = Empresa.objects.create(
                consultor=consultor_owner,
                **validated_data,
            )
            if create_default_structure:
                seed_empresa_default_structure(empresa)
        return empresa

    def update(self, instance, validated_data):
        validated_data.pop('responsible_password', None)
        validated_data.pop('create_default_structure', None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()
        return instance


class ConsultoriaResponsavelTecnicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultoriaResponsavelTecnico
        fields = ['id', 'nome', 'formacao', 'registro', 'responsavel_totem', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ConsultoriaConfiguracaoSerializer(serializers.ModelSerializer):
    responsaveis_tecnicos = ConsultoriaResponsavelTecnicoSerializer(many=True, read_only=True)
    logo_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ConsultoriaConfiguracao
        fields = [
            'id',
            'cnpj',
            'nome_consultoria',
            'responsavel_legal',
            'representante_legal_relatorio',
            'cidade',
            'uf',
            'logo',
            'logo_url',
            'responsaveis_tecnicos',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'logo_url', 'responsaveis_tecnicos', 'created_at', 'updated_at']

    def validate_cnpj(self, value):
        return ''.join(ch for ch in str(value or '') if ch.isdigit())

    def validate_uf(self, value):
        return str(value or '').upper().strip()[:2]

    def get_logo_url(self, obj):
        if not getattr(obj, 'logo', None):
            return ''
        try:
            url = obj.logo.url
        except Exception:
            return ''
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url


class SetorSerializer(serializers.ModelSerializer):
    empresa = serializers.IntegerField(source='empresa.id', read_only=True)
    empresa_id = serializers.PrimaryKeyRelatedField(
        source='empresa',
        queryset=Empresa.objects.all(),
        write_only=True,
    )
    empresa_name = serializers.CharField(source='empresa.company_name', read_only=True)

    class Meta:
        model = Setor
        fields = [
            'id',
            'empresa',
            'empresa_id',
            'empresa_name',
            'name',
            'description',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'empresa_name']

    def validate_empresa(self, value):
        request = self.context.get('request')
        if not request or request.user.is_superuser or request.user.user_type == UserType.ADM:
            return value
        consultoria_owner = get_consultoria_owner(request.user)
        if value.consultor_id != getattr(consultoria_owner, 'id', None):
            raise serializers.ValidationError('Empresa nao pertence ao consultor autenticado.')
        return value

    def validate(self, attrs):
        empresa = attrs.get('empresa') or getattr(self.instance, 'empresa', None)
        if empresa:
            self.validate_empresa(empresa)
        return attrs


class GheSerializer(serializers.ModelSerializer):
    empresa = serializers.IntegerField(source='empresa.id', read_only=True)
    empresa_id = serializers.PrimaryKeyRelatedField(
        source='empresa',
        queryset=Empresa.objects.all(),
        write_only=True,
    )
    empresa_name = serializers.CharField(source='empresa.company_name', read_only=True)
    setor_ids = serializers.PrimaryKeyRelatedField(source='setores', queryset=Setor.objects.all(), many=True, write_only=True, required=False)
    setores_data = serializers.SerializerMethodField()

    class Meta:
        model = Ghe
        fields = [
            'id',
            'empresa',
            'empresa_id',
            'empresa_name',
            'name',
            'description',
            'setor_ids',
            'setores_data',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'empresa_name', 'setores_data']

    def validate_empresa(self, value):
        request = self.context.get('request')
        if not request or request.user.is_superuser or request.user.user_type == UserType.ADM:
            return value
        consultoria_owner = get_consultoria_owner(request.user)
        if value.consultor_id != getattr(consultoria_owner, 'id', None):
            raise serializers.ValidationError('Empresa nao pertence ao consultor autenticado.')
        return value

    def validate(self, attrs):
        empresa = attrs.get('empresa') or getattr(self.instance, 'empresa', None)
        if empresa:
            self.validate_empresa(empresa)

        setores = attrs.get('setores', None)
        if empresa and setores is not None:
            invalid_setores = [s.id for s in setores if s.empresa_id != empresa.id]
            if invalid_setores:
                raise serializers.ValidationError('Um ou mais setores nao pertencem a empresa selecionada.')
        return attrs

    def get_setores_data(self, obj):
        return [{'id': setor.id, 'name': setor.name} for setor in obj.setores.all()]


class CargoSerializer(serializers.ModelSerializer):
    empresa = serializers.IntegerField(source='empresa.id', read_only=True)
    empresa_id = serializers.PrimaryKeyRelatedField(
        source='empresa',
        queryset=Empresa.objects.all(),
        write_only=True,
    )
    empresa_name = serializers.CharField(source='empresa.company_name', read_only=True)
    setor_ids = serializers.PrimaryKeyRelatedField(source='setores', queryset=Setor.objects.all(), many=True, write_only=True, required=False)
    ghe_ids = serializers.PrimaryKeyRelatedField(source='ghes', queryset=Ghe.objects.all(), many=True, write_only=True, required=False)
    setores_data = serializers.SerializerMethodField()
    ghes_data = serializers.SerializerMethodField()

    class Meta:
        model = Cargo
        fields = [
            'id',
            'empresa',
            'empresa_id',
            'empresa_name',
            'name',
            'description',
            'setor_ids',
            'ghe_ids',
            'setores_data',
            'ghes_data',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'empresa_name', 'setores_data', 'ghes_data']

    def validate_empresa(self, value):
        request = self.context.get('request')
        if not request or request.user.is_superuser or request.user.user_type == UserType.ADM:
            return value
        consultoria_owner = get_consultoria_owner(request.user)
        if value.consultor_id != getattr(consultoria_owner, 'id', None):
            raise serializers.ValidationError('Empresa nao pertence ao consultor autenticado.')
        return value

    def validate(self, attrs):
        empresa = attrs.get('empresa') or getattr(self.instance, 'empresa', None)
        if empresa:
            self.validate_empresa(empresa)

        setores = attrs.get('setores', None)
        ghes = attrs.get('ghes', None)

        if self.instance is None and not setores and not ghes:
            raise serializers.ValidationError('Selecione ao menos 1 setor ou 1 GHE para o cargo.')

        if empresa and setores is not None:
            invalid_setores = [s.id for s in setores if s.empresa_id != empresa.id]
            if invalid_setores:
                raise serializers.ValidationError('Um ou mais setores nao pertencem a empresa selecionada.')

        if empresa and ghes is not None:
            invalid_ghes = [g.id for g in ghes if g.empresa_id != empresa.id]
            if invalid_ghes:
                raise serializers.ValidationError('Um ou mais GHEs nao pertencem a empresa selecionada.')

        return attrs

    def get_setores_data(self, obj):
        return [{'id': setor.id, 'name': setor.name} for setor in obj.setores.all()]

    def get_ghes_data(self, obj):
        return [{'id': ghe.id, 'name': ghe.name} for ghe in obj.ghes.all()]


class CampanhaSerializer(serializers.ModelSerializer):
    empresa = serializers.IntegerField(source='empresa.id', read_only=True)
    empresa_id = serializers.PrimaryKeyRelatedField(
        source='empresa',
        queryset=Empresa.objects.all(),
        write_only=True,
    )
    empresa_name = serializers.CharField(source='empresa.company_name', read_only=True)
    public_url = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()

    class Meta:
        model = Campanha
        fields = [
            'id',
            'empresa',
            'empresa_id',
            'empresa_name',
            'title',
            'start_date',
            'end_date',
            'review_recommendation_months',
            'aceitar_respostas_apos_fim',
            'aceitar_respostas_acima_limite',
            'status',
            'qr_code_data',
            'public_url',
            'completed_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'qr_code_data', 'public_url', 'created_at', 'updated_at', 'empresa_name']

    def validate_empresa(self, value):
        request = self.context.get('request')
        if not request or request.user.is_superuser or request.user.user_type == UserType.ADM:
            return value
        consultoria_owner = get_consultoria_owner(request.user)
        if value.consultor_id != getattr(consultoria_owner, 'id', None):
            raise serializers.ValidationError('Empresa nao pertence ao consultor autenticado.')
        return value

    def get_completed_count(self, obj):
        return obj.step1_respostas.filter(is_completed=True).count()

    def validate(self, attrs):
        empresa = attrs.get('empresa') or getattr(self.instance, 'empresa', None)
        if empresa:
            self.validate_empresa(empresa)

        start_date = attrs.get('start_date') or getattr(self.instance, 'start_date', None)
        end_date = attrs.get('end_date') or getattr(self.instance, 'end_date', None)
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({'end_date': 'Data de fim deve ser maior ou igual a data de inicio.'})
        review_months = attrs.get('review_recommendation_months')
        if review_months is not None and (int(review_months) < 1 or int(review_months) > 60):
            raise serializers.ValidationError({'review_recommendation_months': 'Informe um valor entre 1 e 60 meses.'})

        return attrs

    def get_public_url(self, obj):
        base = getattr(settings, 'FRONTEND_PUBLIC_BASE_URL', 'http://127.0.0.1:5173').rstrip('/')
        # Use hash route so links work even when the host does not rewrite SPA paths.
        return f'{base}/#/questionario/{obj.share_token}/'

    def _build_qr_data_uri(self, text):
        try:
            import qrcode
        except Exception:
            return ''

        buffer = BytesIO()
        img = qrcode.make(text)
        img.save(buffer, format='PNG')
        encoded = base64.b64encode(buffer.getvalue()).decode('ascii')
        return f'data:image/png;base64,{encoded}'

    def _update_qr_code(self, campanha):
        url = self.get_public_url(campanha)
        qr_data = self._build_qr_data_uri(url)
        if campanha.qr_code_data != qr_data:
            campanha.qr_code_data = qr_data
            campanha.save(update_fields=['qr_code_data', 'updated_at'])

    def create(self, validated_data):
        campanha = super().create(validated_data)
        self._update_qr_code(campanha)
        return campanha

    def update(self, instance, validated_data):
        campanha = super().update(instance, validated_data)
        self._update_qr_code(campanha)
        return campanha


class CampanhaStep1RespostaSerializer(serializers.ModelSerializer):
    setor_id = serializers.PrimaryKeyRelatedField(source='setor', queryset=Setor.objects.all(), required=False, allow_null=True)
    ghe_id = serializers.PrimaryKeyRelatedField(source='ghe', queryset=Ghe.objects.all(), required=False, allow_null=True)
    cargo_id = serializers.PrimaryKeyRelatedField(source='cargo', queryset=Cargo.objects.all(), required=True)

    class Meta:
        model = CampanhaRespostaStep1
        fields = [
            'id',
            'cpf',
            'first_name',
            'age',
            'sex',
            'setor_id',
            'ghe_id',
            'cargo_id',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_cpf(self, value):
        digits = ''.join(ch for ch in str(value) if ch.isdigit())
        if len(digits) != 11:
            raise serializers.ValidationError('CPF deve conter 11 digitos.')
        return digits

    def validate_age(self, value):
        if value <= 0 or value > 120:
            raise serializers.ValidationError('Idade invalida.')
        return value

    def validate(self, attrs):
        campanha = self.context.get('campanha')
        if not campanha:
            raise serializers.ValidationError('Campanha nao informada.')

        empresa = campanha.empresa
        evaluation_type = empresa.evaluation_type
        setor = attrs.get('setor')
        ghe = attrs.get('ghe')
        cargo = attrs.get('cargo')

        if evaluation_type == EvaluationType.SETOR:
            if not setor:
                raise serializers.ValidationError({'setor_id': 'Setor e obrigatorio.'})
            if setor.empresa_id != empresa.id:
                raise serializers.ValidationError({'setor_id': 'Setor invalido para esta empresa.'})
            attrs['ghe'] = None
        else:
            if not ghe:
                raise serializers.ValidationError({'ghe_id': 'GHE e obrigatorio.'})
            if ghe.empresa_id != empresa.id:
                raise serializers.ValidationError({'ghe_id': 'GHE invalido para esta empresa.'})
            attrs['setor'] = None

        if not cargo:
            raise serializers.ValidationError({'cargo_id': 'Cargo e obrigatorio.'})
        if cargo.empresa_id != empresa.id:
            raise serializers.ValidationError({'cargo_id': 'Cargo invalido para esta empresa.'})

        if evaluation_type == EvaluationType.SETOR:
            if not cargo.setores.filter(id=setor.id).exists():
                raise serializers.ValidationError({'cargo_id': 'Cargo nao relacionado ao setor selecionado.'})
        else:
            if not cargo.ghes.filter(id=ghe.id).exists():
                raise serializers.ValidationError({'cargo_id': 'Cargo nao relacionado ao GHE selecionado.'})

        cpf_digits = attrs.get('cpf', '')
        if cpf_digits:
            cpf_hash = self._cpf_hash(cpf_digits, campanha.id)
            if CampanhaRespostaStep1.objects.filter(campanha=campanha, cpf_hash=cpf_hash, is_completed=True).exists():
                raise serializers.ValidationError({'cpf': 'Este CPF ja respondeu esta campanha.'})
            # Apaga respostas incompletas anteriores do mesmo CPF para evitar duplicatas
            CampanhaRespostaStep1.objects.filter(campanha=campanha, cpf_hash=cpf_hash, is_completed=False).delete()

        return attrs

    def _cpf_masked(self, cpf_digits):
        return f"{'*' * 9}{cpf_digits[-2:]}"

    def _cpf_hash(self, cpf_digits, campanha_id):
        base = f'{campanha_id}:{cpf_digits}:{settings.SECRET_KEY}'
        return hashlib.sha256(base.encode('utf-8')).hexdigest()

    def create(self, validated_data):
        campanha = self.context['campanha']
        cpf_digits = validated_data.pop('cpf')
        validated_data['cpf'] = self._cpf_masked(cpf_digits)
        validated_data['cpf_hash'] = self._cpf_hash(cpf_digits, campanha.id)
        return CampanhaRespostaStep1.objects.create(campanha=campanha, **validated_data)


class CampanhaStep2RespostaSerializer(serializers.ModelSerializer):
    step1_response_id = serializers.PrimaryKeyRelatedField(source='step1', queryset=CampanhaRespostaStep1.objects.all(), write_only=True)

    class Meta:
        model = CampanhaRespostaStep2
        fields = [
            'id',
            'step1_response_id',
            'q1',
            'q2',
            'q3',
            'q4',
            'q5',
            'q6',
            'q7',
            'q8',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        campanha = self.context.get('campanha')
        if not campanha:
            raise serializers.ValidationError('Campanha nao informada.')

        step1 = attrs.get('step1')
        if not step1:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 e obrigatorio.'})
        if step1.campanha_id != campanha.id:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 nao pertence a campanha.'})
        if hasattr(step1, 'step2') and self.instance is None:
            raise serializers.ValidationError({'step1_response_id': 'Step 2 ja foi respondido para este Step 1.'})

        allowed = set(FrequencyChoice.values)
        for key in ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']:
            if attrs.get(key) not in allowed:
                raise serializers.ValidationError({key: 'Opcao invalida.'})

        return attrs


class CampanhaStep3RespostaSerializer(serializers.ModelSerializer):
    step1_response_id = serializers.PrimaryKeyRelatedField(source='step1', queryset=CampanhaRespostaStep1.objects.all(), write_only=True)

    class Meta:
        model = CampanhaRespostaStep3
        fields = [
            'id',
            'step1_response_id',
            'q1',
            'q2',
            'q3',
            'q4',
            'q5',
            'q6',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        campanha = self.context.get('campanha')
        if not campanha:
            raise serializers.ValidationError('Campanha nao informada.')

        step1 = attrs.get('step1')
        if not step1:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 e obrigatorio.'})
        if step1.campanha_id != campanha.id:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 nao pertence a campanha.'})
        if hasattr(step1, 'step3') and self.instance is None:
            raise serializers.ValidationError({'step1_response_id': 'Step 3 ja foi respondido para este Step 1.'})

        allowed = set(FrequencyChoice.values)
        for key in ['q1', 'q2', 'q3', 'q4', 'q5', 'q6']:
            if attrs.get(key) not in allowed:
                raise serializers.ValidationError({key: 'Opcao invalida.'})

        return attrs


class CampanhaStep4RespostaSerializer(serializers.ModelSerializer):
    step1_response_id = serializers.PrimaryKeyRelatedField(source='step1', queryset=CampanhaRespostaStep1.objects.all(), write_only=True)

    class Meta:
        model = CampanhaRespostaStep4
        fields = [
            'id',
            'step1_response_id',
            'q1',
            'q2',
            'q3',
            'q4',
            'q5',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        campanha = self.context.get('campanha')
        if not campanha:
            raise serializers.ValidationError('Campanha nao informada.')

        step1 = attrs.get('step1')
        if not step1:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 e obrigatorio.'})
        if step1.campanha_id != campanha.id:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 nao pertence a campanha.'})
        if hasattr(step1, 'step4') and self.instance is None:
            raise serializers.ValidationError({'step1_response_id': 'Step 4 ja foi respondido para este Step 1.'})

        allowed = set(FrequencyChoice.values)
        for key in ['q1', 'q2', 'q3', 'q4', 'q5']:
            if attrs.get(key) not in allowed:
                raise serializers.ValidationError({key: 'Opcao invalida.'})

        return attrs


class CampanhaStep5RespostaSerializer(serializers.ModelSerializer):
    step1_response_id = serializers.PrimaryKeyRelatedField(source='step1', queryset=CampanhaRespostaStep1.objects.all(), write_only=True)

    class Meta:
        model = CampanhaRespostaStep5
        fields = [
            'id',
            'step1_response_id',
            'q1',
            'q2',
            'q3',
            'q4',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        campanha = self.context.get('campanha')
        if not campanha:
            raise serializers.ValidationError('Campanha nao informada.')

        step1 = attrs.get('step1')
        if not step1:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 e obrigatorio.'})
        if step1.campanha_id != campanha.id:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 nao pertence a campanha.'})
        if hasattr(step1, 'step5') and self.instance is None:
            raise serializers.ValidationError({'step1_response_id': 'Step 5 ja foi respondido para este Step 1.'})

        allowed = set(FrequencyChoice.values)
        for key in ['q1', 'q2', 'q3', 'q4']:
            if attrs.get(key) not in allowed:
                raise serializers.ValidationError({key: 'Opcao invalida.'})

        return attrs


class CampanhaStep6RespostaSerializer(serializers.ModelSerializer):
    step1_response_id = serializers.PrimaryKeyRelatedField(source='step1', queryset=CampanhaRespostaStep1.objects.all(), write_only=True)

    class Meta:
        model = CampanhaRespostaStep6
        fields = [
            'id',
            'step1_response_id',
            'q1',
            'q2',
            'q3',
            'q4',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        campanha = self.context.get('campanha')
        if not campanha:
            raise serializers.ValidationError('Campanha nao informada.')

        step1 = attrs.get('step1')
        if not step1:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 e obrigatorio.'})
        if step1.campanha_id != campanha.id:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 nao pertence a campanha.'})
        if hasattr(step1, 'step6') and self.instance is None:
            raise serializers.ValidationError({'step1_response_id': 'Step 6 ja foi respondido para este Step 1.'})

        allowed = set(FrequencyChoice.values)
        for key in ['q1', 'q2', 'q3', 'q4']:
            if attrs.get(key) not in allowed:
                raise serializers.ValidationError({key: 'Opcao invalida.'})

        return attrs


class CampanhaStep7RespostaSerializer(serializers.ModelSerializer):
    step1_response_id = serializers.PrimaryKeyRelatedField(source='step1', queryset=CampanhaRespostaStep1.objects.all(), write_only=True)

    class Meta:
        model = CampanhaRespostaStep7
        fields = [
            'id',
            'step1_response_id',
            'q1',
            'q2',
            'q3',
            'q4',
            'q5',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        campanha = self.context.get('campanha')
        if not campanha:
            raise serializers.ValidationError('Campanha nao informada.')

        step1 = attrs.get('step1')
        if not step1:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 e obrigatorio.'})
        if step1.campanha_id != campanha.id:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 nao pertence a campanha.'})
        if hasattr(step1, 'step7') and self.instance is None:
            raise serializers.ValidationError({'step1_response_id': 'Step 7 ja foi respondido para este Step 1.'})

        allowed = set(FrequencyChoice.values)
        for key in ['q1', 'q2', 'q3', 'q4', 'q5']:
            if attrs.get(key) not in allowed:
                raise serializers.ValidationError({key: 'Opcao invalida.'})

        return attrs


class CampanhaStep8RespostaSerializer(serializers.ModelSerializer):
    step1_response_id = serializers.PrimaryKeyRelatedField(source='step1', queryset=CampanhaRespostaStep1.objects.all(), write_only=True)

    class Meta:
        model = CampanhaRespostaStep8
        fields = ['id', 'step1_response_id', 'q1', 'q2', 'q3', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        campanha = self.context.get('campanha')
        if not campanha:
            raise serializers.ValidationError('Campanha nao informada.')
        step1 = attrs.get('step1')
        if not step1:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 e obrigatorio.'})
        if step1.campanha_id != campanha.id:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 nao pertence a campanha.'})
        if hasattr(step1, 'step8') and self.instance is None:
            raise serializers.ValidationError({'step1_response_id': 'Step 8 ja foi respondido para este Step 1.'})
        allowed = set(FrequencyChoice.values)
        for key in ['q1', 'q2', 'q3']:
            if attrs.get(key) not in allowed:
                raise serializers.ValidationError({key: 'Opcao invalida.'})
        return attrs


class CampanhaStep9RespostaSerializer(serializers.ModelSerializer):
    step1_response_id = serializers.PrimaryKeyRelatedField(source='step1', queryset=CampanhaRespostaStep1.objects.all(), write_only=True)

    class Meta:
        model = CampanhaRespostaStep9
        fields = ['id', 'step1_response_id', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        campanha = self.context.get('campanha')
        if not campanha:
            raise serializers.ValidationError('Campanha nao informada.')
        step1 = attrs.get('step1')
        if not step1:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 e obrigatorio.'})
        if step1.campanha_id != campanha.id:
            raise serializers.ValidationError({'step1_response_id': 'Step 1 nao pertence a campanha.'})
        if hasattr(step1, 'step9') and self.instance is None:
            raise serializers.ValidationError({'step1_response_id': 'Step 9 ja foi respondido para este Step 1.'})
        return attrs


class CampanhaMedidaPreliminarSerializer(serializers.ModelSerializer):
    setor_id = serializers.PrimaryKeyRelatedField(source='setor', queryset=Setor.objects.all(), required=False, allow_null=True, write_only=True)
    ghe_id = serializers.PrimaryKeyRelatedField(source='ghe', queryset=Ghe.objects.all(), required=False, allow_null=True, write_only=True)
    setor = serializers.IntegerField(source='setor.id', read_only=True)
    ghe = serializers.IntegerField(source='ghe.id', read_only=True)
    setor_name = serializers.CharField(source='setor.name', read_only=True)
    ghe_name = serializers.CharField(source='ghe.name', read_only=True)

    class Meta:
        model = CampanhaMedidaPreliminar
        fields = [
            'id',
            'campanha',
            'step_number',
            'question_field',
            'scope_type',
            'setor',
            'setor_id',
            'setor_name',
            'ghe',
            'ghe_id',
            'ghe_name',
            'action_text',
            'when_months',
            'created_at',
        ]
        read_only_fields = ['id', 'campanha', 'created_at', 'setor', 'ghe', 'setor_name', 'ghe_name']

    def validate(self, attrs):
        campanha = self.context.get('campanha') or getattr(self.instance, 'campanha', None)
        if not campanha:
            raise serializers.ValidationError('Campanha nao informada.')

        empresa = campanha.empresa
        step_number = attrs.get('step_number') or getattr(self.instance, 'step_number', None)
        question_field = attrs.get('question_field') or getattr(self.instance, 'question_field', '')
        scope_type = attrs.get('scope_type') or getattr(self.instance, 'scope_type', MedidaScopeType.GERAL)
        setor = attrs.get('setor') if 'setor' in attrs else getattr(self.instance, 'setor', None)
        ghe = attrs.get('ghe') if 'ghe' in attrs else getattr(self.instance, 'ghe', None)
        action_text = (attrs.get('action_text') if 'action_text' in attrs else getattr(self.instance, 'action_text', '')).strip()
        when_months = attrs.get('when_months') if 'when_months' in attrs else getattr(self.instance, 'when_months', [])

        if step_number not in [2, 3, 4, 5, 6, 7, 8]:
            raise serializers.ValidationError({'step_number': 'Step invalido para medida preliminar.'})
        if question_field not in [f'q{i}' for i in range(1, 9)]:
            raise serializers.ValidationError({'question_field': 'Pergunta invalida.'})
        if not action_text:
            raise serializers.ValidationError({'action_text': 'Informe a medida.'})
        attrs['action_text'] = action_text
        if when_months is None:
            when_months = []
        if not isinstance(when_months, list):
            raise serializers.ValidationError({'when_months': 'Formato invalido.'})
        normalized_months = []
        for m in when_months:
            s = str(m).strip()
            if not s:
                continue
            if len(s) != 7 or s[2] != '/':
                raise serializers.ValidationError({'when_months': 'Use o formato MM/YYYY.'})
            mm, yyyy = s.split('/')
            if not (mm.isdigit() and yyyy.isdigit()):
                raise serializers.ValidationError({'when_months': 'Use o formato MM/YYYY.'})
            if int(mm) < 1 or int(mm) > 12:
                raise serializers.ValidationError({'when_months': 'Mes invalido.'})
            normalized_months.append(f'{int(mm):02d}/{int(yyyy):04d}')
        attrs['when_months'] = list(dict.fromkeys(normalized_months))

        if scope_type == MedidaScopeType.GERAL:
            attrs['setor'] = None
            attrs['ghe'] = None
        elif scope_type == MedidaScopeType.SETOR:
            if empresa.evaluation_type != EvaluationType.SETOR:
                raise serializers.ValidationError({'scope_type': 'Campanha desta empresa nao usa Setor.'})
            if not setor:
                raise serializers.ValidationError({'setor_id': 'Setor e obrigatorio.'})
            if setor.empresa_id != empresa.id:
                raise serializers.ValidationError({'setor_id': 'Setor nao pertence a empresa da campanha.'})
            attrs['ghe'] = None
        elif scope_type == MedidaScopeType.GHE:
            if empresa.evaluation_type != EvaluationType.GHE:
                raise serializers.ValidationError({'scope_type': 'Campanha desta empresa nao usa GHE.'})
            if not ghe:
                raise serializers.ValidationError({'ghe_id': 'GHE e obrigatorio.'})
            if ghe.empresa_id != empresa.id:
                raise serializers.ValidationError({'ghe_id': 'GHE nao pertence a empresa da campanha.'})
            attrs['setor'] = None
        else:
            raise serializers.ValidationError({'scope_type': 'Escopo invalido.'})

        return attrs

    def create(self, validated_data):
        campanha = self.context['campanha']
        request = self.context.get('request')
        return CampanhaMedidaPreliminar.objects.create(
            campanha=campanha,
            created_by=request.user if request and getattr(request, 'user', None) else None,
            **validated_data,
        )


class CampanhaQuandoPreliminarSerializer(serializers.ModelSerializer):
    setor_id = serializers.PrimaryKeyRelatedField(source='setor', queryset=Setor.objects.all(), required=False, allow_null=True, write_only=True)
    ghe_id = serializers.PrimaryKeyRelatedField(source='ghe', queryset=Ghe.objects.all(), required=False, allow_null=True, write_only=True)
    setor = serializers.IntegerField(source='setor.id', read_only=True)
    ghe = serializers.IntegerField(source='ghe.id', read_only=True)
    setor_name = serializers.CharField(source='setor.name', read_only=True)
    ghe_name = serializers.CharField(source='ghe.name', read_only=True)

    class Meta:
        model = CampanhaQuandoPreliminar
        fields = [
            'id', 'campanha', 'step_number', 'question_field', 'scope_type',
            'setor', 'setor_id', 'setor_name', 'ghe', 'ghe_id', 'ghe_name',
            'when_months', 'updated_at',
        ]
        read_only_fields = ['id', 'campanha', 'updated_at', 'setor', 'ghe', 'setor_name', 'ghe_name']

    def validate(self, attrs):
        campanha = self.context.get('campanha') or getattr(self.instance, 'campanha', None)
        if not campanha:
            raise serializers.ValidationError('Campanha nao informada.')
        empresa = campanha.empresa
        step_number = attrs.get('step_number') or getattr(self.instance, 'step_number', None)
        question_field = attrs.get('question_field') or getattr(self.instance, 'question_field', '')
        scope_type = attrs.get('scope_type') or getattr(self.instance, 'scope_type', MedidaScopeType.GERAL)
        setor = attrs.get('setor') if 'setor' in attrs else getattr(self.instance, 'setor', None)
        ghe = attrs.get('ghe') if 'ghe' in attrs else getattr(self.instance, 'ghe', None)
        when_months = attrs.get('when_months') if 'when_months' in attrs else getattr(self.instance, 'when_months', [])

        if step_number not in [2, 3, 4, 5, 6, 7, 8]:
            raise serializers.ValidationError({'step_number': 'Step invalido para "quando".'})
        if question_field not in [f'q{i}' for i in range(1, 9)]:
            raise serializers.ValidationError({'question_field': 'Pergunta invalida.'})

        if when_months is None:
            when_months = []
        if not isinstance(when_months, list):
            raise serializers.ValidationError({'when_months': 'Formato invalido.'})
        normalized_months = []
        for m in when_months:
            s = str(m).strip()
            if not s:
                continue
            if len(s) != 7 or s[2] != '/':
                raise serializers.ValidationError({'when_months': 'Use o formato MM/YYYY.'})
            mm, yyyy = s.split('/')
            if not (mm.isdigit() and yyyy.isdigit()):
                raise serializers.ValidationError({'when_months': 'Use o formato MM/YYYY.'})
            if int(mm) < 1 or int(mm) > 12:
                raise serializers.ValidationError({'when_months': 'Mes invalido.'})
            normalized_months.append(f'{int(mm):02d}/{int(yyyy):04d}')
        attrs['when_months'] = list(dict.fromkeys(normalized_months))

        if scope_type == MedidaScopeType.GERAL:
            attrs['setor'] = None
            attrs['ghe'] = None
        elif scope_type == MedidaScopeType.SETOR:
            if empresa.evaluation_type != EvaluationType.SETOR:
                raise serializers.ValidationError({'scope_type': 'Campanha desta empresa nao usa Setor.'})
            if not setor or setor.empresa_id != empresa.id:
                raise serializers.ValidationError({'setor_id': 'Setor invalido.'})
            attrs['ghe'] = None
        elif scope_type == MedidaScopeType.GHE:
            if empresa.evaluation_type != EvaluationType.GHE:
                raise serializers.ValidationError({'scope_type': 'Campanha desta empresa nao usa GHE.'})
            if not ghe or ghe.empresa_id != empresa.id:
                raise serializers.ValidationError({'ghe_id': 'GHE invalido.'})
            attrs['setor'] = None
        else:
            raise serializers.ValidationError({'scope_type': 'Escopo invalido.'})
        return attrs

    def create(self, validated_data):
        campanha = self.context['campanha']
        request = self.context.get('request')
        return CampanhaQuandoPreliminar.objects.create(
            campanha=campanha,
            created_by=request.user if request and getattr(request, 'user', None) else None,
            **validated_data,
        )


class CampanhaRelatorioAnexoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampanhaRelatorioAnexo
        fields = [
            'id', 'campanha', 'file_name', 'file_key', 'file_url',
            'content_type', 'size_bytes', 'created_at',
        ]
        read_only_fields = fields


class CanalDenunciaPublicSerializer(serializers.ModelSerializer):
    setor_id = serializers.PrimaryKeyRelatedField(source='setor', queryset=Setor.objects.all(), required=False, allow_null=True, write_only=True)
    ghe_id = serializers.PrimaryKeyRelatedField(source='ghe', queryset=Ghe.objects.all(), required=False, allow_null=True, write_only=True)
    cargo_id = serializers.PrimaryKeyRelatedField(source='cargo_funcao', queryset=Cargo.objects.all(), required=False, allow_null=True, write_only=True)

    class Meta:
        model = CanalDenuncia
        fields = [
            'id',
            'possui_vinculo',
            'deseja_identificar',
            'contato_identificacao',
            'setor_id',
            'ghe_id',
            'cargo_id',
            'tipo',
            'relato',
            'testemunhas',
            'aceita_devolutiva',
            'email_devolutiva',
            'evidencia_arquivo',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_relato(self, value):
        text = str(value or '').strip()
        if len(text) < 10:
            raise serializers.ValidationError('Descreva a denuncia com mais detalhes.')
        return text

    def validate(self, attrs):
        aceita = attrs.get('aceita_devolutiva')
        email = str(attrs.get('email_devolutiva') or '').strip()
        deseja_identificar = attrs.get('deseja_identificar')
        contato_identificacao = str(attrs.get('contato_identificacao') or '').strip()
        if aceita and not email:
            raise serializers.ValidationError({'email_devolutiva': 'Informe o e-mail para devolutiva.'})
        if not aceita:
            attrs['email_devolutiva'] = ''
        if deseja_identificar and not contato_identificacao:
            raise serializers.ValidationError({'contato_identificacao': 'Informe e-mail ou WhatsApp para identificacao.'})
        if not deseja_identificar:
            attrs['contato_identificacao'] = ''
        attrs['testemunhas'] = str(attrs.get('testemunhas') or '').strip()

        empresa = self.context.get('empresa')
        setor = attrs.get('setor')
        ghe = attrs.get('ghe')
        cargo = attrs.get('cargo_funcao')
        if empresa is not None:
            if empresa.evaluation_type == EvaluationType.SETOR:
                if setor and setor.empresa_id != empresa.id:
                    raise serializers.ValidationError({'setor_id': 'Setor invalido para esta empresa.'})
                attrs['ghe'] = None
            else:
                if ghe and ghe.empresa_id != empresa.id:
                    raise serializers.ValidationError({'ghe_id': 'GHE invalido para esta empresa.'})
                attrs['setor'] = None
            if cargo and cargo.empresa_id != empresa.id:
                raise serializers.ValidationError({'cargo_id': 'Funcao invalida para esta empresa.'})
            if empresa.evaluation_type == EvaluationType.SETOR:
                if setor and cargo and not cargo.setores.filter(id=setor.id).exists():
                    raise serializers.ValidationError({'cargo_id': 'A funcao selecionada nao pertence ao setor informado.'})
            else:
                if ghe and cargo and not cargo.ghes.filter(id=ghe.id).exists():
                    raise serializers.ValidationError({'cargo_id': 'A funcao selecionada nao pertence ao GHE informado.'})
        return attrs


class CanalDenunciaListSerializer(serializers.ModelSerializer):
    empresa_name = serializers.CharField(source='empresa.company_name', read_only=True)
    setor_name = serializers.CharField(source='setor.name', read_only=True)
    ghe_name = serializers.CharField(source='ghe.name', read_only=True)
    cargo_name = serializers.CharField(source='cargo_funcao.name', read_only=True)
    evidencia_url = serializers.SerializerMethodField()
    atualizacoes = serializers.SerializerMethodField()
    origem_label = serializers.CharField(source='get_origem_display', read_only=True)
    tipo_label = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = CanalDenuncia
        fields = [
            'id',
            'empresa',
            'empresa_name',
            'possui_vinculo',
            'deseja_identificar',
            'contato_identificacao',
            'setor',
            'setor_name',
            'ghe',
            'ghe_name',
            'cargo_funcao',
            'cargo_name',
            'tipo',
            'tipo_label',
            'relato',
            'testemunhas',
            'aceita_devolutiva',
            'email_devolutiva',
            'evidencia_url',
            'origem',
            'origem_label',
            'status',
            'atualizacoes',
            'created_at',
        ]
        read_only_fields = fields

    def get_evidencia_url(self, obj):
        if not obj.evidencia_arquivo:
            return ''
        request = self.context.get('request')
        try:
            url = obj.evidencia_arquivo.url
        except Exception:
            return ''
        return request.build_absolute_uri(url) if request else url

    def get_atualizacoes(self, obj):
        return [
            {
                'id': x.id,
                'texto': x.texto,
                'created_at': x.created_at.isoformat(),
                'criado_por': getattr(x.criado_por, 'email', '') if x.criado_por_id else '',
            }
            for x in obj.atualizacoes.all()[:10]
        ]


class CanalDenunciaStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanalDenuncia
        fields = ['status']


class CanalDenunciaAtualizacaoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanalDenunciaAtualizacao
        fields = ['texto']

    def validate_texto(self, value):
        text = str(value or '').strip()
        if len(text) < 3:
            raise serializers.ValidationError('Informe uma atualizacao valida.')
        return text


class RegistroHumorPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroHumor
        fields = ['humor', 'ghe', 'setor']

    def validate_humor(self, value):
        valid = [c[0] for c in RegistroHumor.Humor.choices]
        if value not in valid:
            raise serializers.ValidationError('Humor inválido.')
        return value


class PedidoAjudaPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = PedidoAjuda
        fields = ['nome', 'contato', 'setor', 'ghe', 'funcao']

    def validate_nome(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Nome é obrigatório.')
        return value.strip()


class PedidoAjudaListSerializer(serializers.ModelSerializer):
    setor_name = serializers.SerializerMethodField()
    ghe_name = serializers.SerializerMethodField()
    funcao_name = serializers.SerializerMethodField()
    atualizacoes = serializers.SerializerMethodField()

    class Meta:
        model = PedidoAjuda
        fields = ['id', 'nome', 'contato', 'setor', 'setor_name', 'ghe', 'ghe_name', 'funcao', 'funcao_name', 'status', 'atualizacoes', 'created_at']

    def get_setor_name(self, obj):
        return obj.setor.name if obj.setor else None

    def get_ghe_name(self, obj):
        return obj.ghe.name if obj.ghe else None

    def get_funcao_name(self, obj):
        return obj.funcao.name if obj.funcao else None

    def get_atualizacoes(self, obj):
        return [
            {
                'id': x.id,
                'texto': x.texto,
                'created_at': x.created_at.isoformat(),
                'criado_por': getattr(x.criado_por, 'email', '') if x.criado_por_id else '',
            }
            for x in obj.atualizacoes.all()[:20]
        ]


class PedidoAjudaStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PedidoAjuda
        fields = ['status']


class PedidoAjudaAtualizacaoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PedidoAjudaAtualizacao
        fields = ['texto']

    def validate_texto(self, value):
        text = str(value or '').strip()
        if len(text) < 3:
            raise serializers.ValidationError('Informe uma atualizacao valida.')
        return text


class CampanhaPlanoAcaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampanhaPlanoAcao
        fields = ['id', 'step_key', 'question_field', 'plano_index', 'ativo']
