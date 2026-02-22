from django.contrib.auth import authenticate
from django.conf import settings
from io import BytesIO
import base64
import hashlib
from rest_framework import serializers

from .models import Campanha, CampanhaRespostaStep1, CampanhaRespostaStep2, CampanhaRespostaStep3, CampanhaRespostaStep4, CampanhaRespostaStep5, CampanhaRespostaStep6, CampanhaRespostaStep7, CampanhaRespostaStep8, CampanhaRespostaStep9, Cargo, DocumentType, Empresa, EstablishmentType, EvaluationType, FrequencyChoice, Ghe, Setor, User, UserType


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        user = authenticate(request=self.context.get('request'), email=email, password=password)
        if not user:
            raise serializers.ValidationError('E-mail ou senha invalidos.')
        if not user.is_active:
            raise serializers.ValidationError('Usuario inativo.')

        attrs['user'] = user
        return attrs


class ConsultorSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            user_type=UserType.CONSULTOR,
            is_active=validated_data.get('is_active', True),
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


class EmpresaSerializer(serializers.ModelSerializer):
    responsible_email = serializers.EmailField(write_only=True)
    responsible_password = serializers.CharField(write_only=True, required=False, min_length=6)
    responsible_user_email = serializers.EmailField(source='responsavel_usuario.email', read_only=True)

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
            'responsible_name',
            'responsible_email',
            'responsible_password',
            'responsible_user_email',
            'risk_level',
            'employee_count',
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
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'responsible_user_email']

    def validate_document_number(self, value):
        return ''.join(char for char in value if char.isdigit())

    def validate(self, attrs):
        document_type = attrs.get('document_type') or getattr(self.instance, 'document_type', None)
        document_number = attrs.get('document_number') or getattr(self.instance, 'document_number', '')
        responsible_password = attrs.get('responsible_password')
        establishment_type = attrs.get('establishment_type') or getattr(self.instance, 'establishment_type', None)

        if self.instance is None and not responsible_password:
            raise serializers.ValidationError({'responsible_password': 'Senha do responsavel e obrigatoria.'})

        if document_type == DocumentType.CPF and len(document_number) != 11:
            raise serializers.ValidationError({'document_number': 'CPF deve ter 11 digitos.'})

        if document_type == DocumentType.CNPJ and len(document_number) != 14:
            raise serializers.ValidationError({'document_number': 'CNPJ deve ter 14 digitos.'})

        if establishment_type not in EstablishmentType.values:
            raise serializers.ValidationError({'establishment_type': 'Tipo de estabelecimento invalido.'})

        evaluation_type = attrs.get('evaluation_type') or getattr(self.instance, 'evaluation_type', None)
        if evaluation_type not in EvaluationType.values:
            raise serializers.ValidationError({'evaluation_type': 'Tipo de avaliacao invalido.'})

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        responsible_email = validated_data.pop('responsible_email')
        responsible_password = validated_data.pop('responsible_password')

        responsible_user = User.objects.create_user(
            email=responsible_email,
            password=responsible_password,
            full_name=validated_data.get('responsible_name', ''),
            user_type=UserType.EMPRESA,
            is_active=validated_data.get('is_active', True),
        )

        empresa = Empresa.objects.create(
            consultor=request.user,
            responsavel_usuario=responsible_user,
            **validated_data,
        )
        return empresa

    def update(self, instance, validated_data):
        responsible_email = validated_data.pop('responsible_email', None)
        responsible_password = validated_data.pop('responsible_password', None)

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

        if value.consultor_id != request.user.id:
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

    class Meta:
        model = Ghe
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

        if value.consultor_id != request.user.id:
            raise serializers.ValidationError('Empresa nao pertence ao consultor autenticado.')
        return value

    def validate(self, attrs):
        empresa = attrs.get('empresa') or getattr(self.instance, 'empresa', None)
        if empresa:
            self.validate_empresa(empresa)
        return attrs


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

        if value.consultor_id != request.user.id:
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
        return [{'id': setor.id, 'name': setor.name} for setor in obj.setores.all().order_by('name')]

    def get_ghes_data(self, obj):
        return [{'id': ghe.id, 'name': ghe.name} for ghe in obj.ghes.all().order_by('name')]


class CampanhaSerializer(serializers.ModelSerializer):
    empresa = serializers.IntegerField(source='empresa.id', read_only=True)
    empresa_id = serializers.PrimaryKeyRelatedField(
        source='empresa',
        queryset=Empresa.objects.all(),
        write_only=True,
    )
    empresa_name = serializers.CharField(source='empresa.company_name', read_only=True)
    public_url = serializers.SerializerMethodField()

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
            'status',
            'qr_code_data',
            'public_url',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'qr_code_data', 'public_url', 'created_at', 'updated_at', 'empresa_name']

    def validate_empresa(self, value):
        request = self.context.get('request')
        if not request or request.user.is_superuser or request.user.user_type == UserType.ADM:
            return value

        if value.consultor_id != request.user.id:
            raise serializers.ValidationError('Empresa nao pertence ao consultor autenticado.')
        return value

    def validate(self, attrs):
        empresa = attrs.get('empresa') or getattr(self.instance, 'empresa', None)
        if empresa:
            self.validate_empresa(empresa)

        start_date = attrs.get('start_date') or getattr(self.instance, 'start_date', None)
        end_date = attrs.get('end_date') or getattr(self.instance, 'end_date', None)
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({'end_date': 'Data de fim deve ser maior ou igual a data de inicio.'})

        return attrs

    def get_public_url(self, obj):
        base = getattr(settings, 'FRONTEND_PUBLIC_BASE_URL', 'http://127.0.0.1:5173').rstrip('/')
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
