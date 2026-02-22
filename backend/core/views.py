from rest_framework import status
from django.db import transaction
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.permissions import BasePermission
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CampaignStatus, Campanha, Cargo, Empresa, Ghe, Setor, User, UserType
from .serializers import CampanhaSerializer, CampanhaStep1RespostaSerializer, CampanhaStep2RespostaSerializer, CampanhaStep3RespostaSerializer, CampanhaStep4RespostaSerializer, CampanhaStep5RespostaSerializer, CampanhaStep6RespostaSerializer, CampanhaStep7RespostaSerializer, CampanhaStep8RespostaSerializer, CampanhaStep9RespostaSerializer, CargoSerializer, ConsultorSerializer, EmpresaSerializer, GheSerializer, LoginSerializer, SetorSerializer


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
