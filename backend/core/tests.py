from django.urls import reverse
from django.test import override_settings
from django.core import mail
from datetime import date
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory

from pypdf import PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from .models import Campanha, Empresa, User, UserType
from .views import _apply_pdf_letterhead, _build_report_pdf_response


class ConsultoriaHierarchyTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='secret123',
            user_type=UserType.ADM,
            is_superuser=True,
            is_staff=True,
        )
        self.consultoria = User.objects.create_user(
            email='consultoria@example.com',
            password='secret123',
            full_name='Consultoria Alfa',
            user_type=UserType.CONSULTOR,
        )
        self.client = APIClient()

    def test_consultoria_owner_can_create_internal_user(self):
        self.client.force_authenticate(user=self.consultoria)

        response = self.client.post(
            reverse('consultoria-user-list-create'),
            {
                'full_name': 'Operador Interno',
                'email': 'interno@example.com',
                'password': 'secret123',
                'is_active': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        interno = User.objects.get(email='interno@example.com')
        self.assertEqual(interno.user_type, UserType.CONSULTOR)
        self.assertEqual(interno.consultoria_master_id, self.consultoria.id)
        self.assertFalse(interno.is_superuser)

    def test_internal_user_only_sees_owner_companies(self):
        interno = User.objects.create_user(
            email='interno@example.com',
            password='secret123',
            user_type=UserType.CONSULTOR,
            consultoria_master=self.consultoria,
        )
        empresa_user = User.objects.create_user(
            email='empresa@example.com',
            password='secret123',
            user_type=UserType.EMPRESA,
        )
        outra_consultoria = User.objects.create_user(
            email='outra@example.com',
            password='secret123',
            user_type=UserType.CONSULTOR,
        )
        outra_empresa_user = User.objects.create_user(
            email='outra-empresa@example.com',
            password='secret123',
            user_type=UserType.EMPRESA,
        )

        Empresa.objects.create(
            consultor=self.consultoria,
            responsavel_usuario=empresa_user,
            document_type='CNPJ',
            document_number='12345678000199',
            company_name='Empresa Alfa',
            establishment_type='MATRIZ',
            establishment_name='Matriz',
            evaluation_type='SETOR',
            responsible_name='Responsavel Alfa',
            risk_level='3',
            employee_count=10,
        )
        Empresa.objects.create(
            consultor=outra_consultoria,
            responsavel_usuario=outra_empresa_user,
            document_type='CNPJ',
            document_number='98765432000111',
            company_name='Empresa Beta',
            establishment_type='MATRIZ',
            establishment_name='Matriz',
            evaluation_type='SETOR',
            responsible_name='Responsavel Beta',
            risk_level='2',
            employee_count=8,
        )

        self.client.force_authenticate(user=interno)
        response = self.client.get(reverse('empresa-list-create'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['company_name'], 'Empresa Alfa')

    def test_admin_list_consultorias_excludes_internal_users(self):
        User.objects.create_user(
            email='interno@example.com',
            password='secret123',
            user_type=UserType.CONSULTOR,
            consultoria_master=self.consultoria,
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('consultor-list-create'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['email'], self.consultoria.email)
        self.assertEqual(response.data[0]['total_usuarios'], 2)

    def test_admin_can_create_consultoria_with_access_expiration_date(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse('consultor-list-create'),
            {
                'full_name': 'Consultoria Beta',
                'email': 'consultoria-beta@example.com',
                'password': 'secret123',
                'is_active': True,
                'access_expires_on': '2026-12-31',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['access_expires_on'], '2026-12-31')

        consultoria = User.objects.get(email='consultoria-beta@example.com')
        self.assertEqual(consultoria.access_expires_on, date(2026, 12, 31))

    def test_different_consultorias_can_use_same_document_number(self):
        outra_consultoria = User.objects.create_user(
            email='outra@example.com',
            password='secret123',
            user_type=UserType.CONSULTOR,
        )
        empresa_user_a = User.objects.create_user(
            email='empresa-a@example.com',
            password='secret123',
            user_type=UserType.EMPRESA,
        )
        empresa_user_b = User.objects.create_user(
            email='empresa-b@example.com',
            password='secret123',
            user_type=UserType.EMPRESA,
        )

        Empresa.objects.create(
            consultor=self.consultoria,
            responsavel_usuario=empresa_user_a,
            document_type='CNPJ',
            document_number='11222333000144',
            company_name='Empresa A',
            establishment_type='MATRIZ',
            establishment_name='Matriz',
            evaluation_type='SETOR',
            responsible_name='Responsavel A',
            risk_level='3',
            employee_count=10,
        )
        Empresa.objects.create(
            consultor=outra_consultoria,
            responsavel_usuario=empresa_user_b,
            document_type='CNPJ',
            document_number='11222333000144',
            company_name='Empresa B',
            establishment_type='MATRIZ',
            establishment_name='Matriz',
            evaluation_type='SETOR',
            responsible_name='Responsavel B',
            risk_level='2',
            employee_count=8,
        )

        self.assertEqual(Empresa.objects.filter(document_number='11222333000144').count(), 2)

    def test_login_returns_support_message_for_inactive_consultoria(self):
        self.consultoria.is_active = False
        self.consultoria.save(update_fields=['is_active'])

        response = self.client.post(
            reverse('login'),
            {'email': self.consultoria.email, 'password': 'secret123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['non_field_errors'][0], 'Entre em contato com o suporte.')

    def test_login_returns_support_message_for_internal_user_of_inactive_consultoria(self):
        interno = User.objects.create_user(
            email='interno@example.com',
            password='secret123',
            user_type=UserType.CONSULTOR,
            consultoria_master=self.consultoria,
        )
        self.consultoria.is_active = False
        self.consultoria.save(update_fields=['is_active'])

        response = self.client.post(
            reverse('login'),
            {'email': interno.email, 'password': 'secret123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['non_field_errors'][0], 'Entre em contato com o suporte.')


class PdfLetterheadTests(APITestCase):
    def _build_pdf(self, pages):
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        for text in pages:
            c.drawString(72, 800, text)
            c.showPage()
        c.save()
        return buffer.getvalue()

    def test_apply_pdf_letterhead_adds_template_to_every_page(self):
        with TemporaryDirectory() as tmpdir:
            template_path = Path(tmpdir) / 'timbrado.pdf'
            template_pdf = self._build_pdf(['HEADER FOOTER TIMBRADO'])
            template_path.write_bytes(template_pdf)

            source_pdf = self._build_pdf(['PAGINA 1 RELATORIO', 'PAGINA 2 RELATORIO'])
            merged_pdf = _apply_pdf_letterhead(source_pdf, letterhead_path=template_path)
            reader = PdfReader(BytesIO(merged_pdf))

            self.assertEqual(len(reader.pages), 2)

            page_1_text = reader.pages[0].extract_text()
            page_2_text = reader.pages[1].extract_text()

            self.assertIn('HEADER FOOTER TIMBRADO', page_1_text)
            self.assertIn('HEADER FOOTER TIMBRADO', page_2_text)
            self.assertIn('PAGINA 1 RELATORIO', page_1_text)
            self.assertIn('PAGINA 2 RELATORIO', page_2_text)


class PasswordResetTests(APITestCase):
    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        FRONTEND_PUBLIC_BASE_URL='https://app.example.com',
        FRONTEND_PUBLIC_USE_HASH_ROUTING=True,
    )
    def test_password_reset_email_uses_hash_route_when_enabled(self):
        user = User.objects.create_user(
            email='reset@example.com',
            password='secret123',
            user_type=UserType.CONSULTOR,
        )

        response = self.client.post(
            reverse('password-reset-request'),
            {'email': user.email},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('https://app.example.com#/reset-password?uid=', mail.outbox[0].body)
        self.assertIn('&token=', mail.outbox[0].body)

    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        FRONTEND_PUBLIC_BASE_URL='https://app.example.com',
        FRONTEND_PUBLIC_USE_HASH_ROUTING=False,
    )
    def test_password_reset_email_uses_path_route_when_hash_routing_disabled(self):
        user = User.objects.create_user(
            email='reset-path@example.com',
            password='secret123',
            user_type=UserType.CONSULTOR,
        )

        response = self.client.post(
            reverse('password-reset-request'),
            {'email': user.email},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('https://app.example.com/reset-password?uid=', mail.outbox[0].body)
        self.assertNotIn('https://app.example.com#/reset-password?uid=', mail.outbox[0].body)


class CampaignReportPdfTests(APITestCase):
    def test_campaign_report_pdf_includes_risk_classification_section_before_annexes(self):
        consultoria = User.objects.create_user(
            email='consultoria-pdf@example.com',
            password='secret123',
            user_type=UserType.CONSULTOR,
            full_name='Consultoria PDF',
        )
        empresa_user = User.objects.create_user(
            email='empresa-pdf@example.com',
            password='secret123',
            user_type=UserType.EMPRESA,
        )
        empresa = Empresa.objects.create(
            consultor=consultoria,
            responsavel_usuario=empresa_user,
            document_type='CNPJ',
            document_number='12345678000199',
            company_name='Empresa PDF',
            establishment_type='MATRIZ',
            establishment_name='Unidade Central',
            evaluation_type='SETOR',
            responsible_name='Responsavel Empresa',
            risk_level='3',
            employee_count=50,
        )
        campanha = Campanha.objects.create(
            empresa=empresa,
            title='Campanha PDF',
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 31),
            review_recommendation_months=6,
        )

        rel_payload = {
            'empresa': {'name': empresa.company_name},
            'filters': {'ref_label': 'Setor'},
            'overall': {
                'summary': {
                    'completed_responses': 20,
                    'company_mean_percent': 68.5,
                    'company_mean_score': 3.42,
                    'company_zone': {'key': 'yellow', 'label': 'Atencao'},
                    'sample_percent': 40.0,
                    'sample_zone': {'key': 'green', 'label': 'Bom'},
                },
                'domains': [
                    {'domain': 'Demandas', 'percent': 72.0, 'zone': {'key': 'red', 'label': 'Critico'}},
                    {'domain': 'Apoio', 'percent': 48.0, 'zone': {'key': 'yellow', 'label': 'Atencao'}},
                ],
                'steps': [],
            },
            'per_ref': [
                {
                    'ref': {'id': 1, 'name': 'Administrativo'},
                    'summary': {'company_mean_percent': 62.0, 'company_zone': {'key': 'yellow', 'label': 'Atencao'}},
                    'steps': [],
                },
            ],
            'preliminary_measures': [],
            'preliminary_whens': [],
            'attachments': [],
            'review_recommendation_months': campanha.review_recommendation_months,
        }

        response = _build_report_pdf_response(campanha, rel_payload)
        reader = PdfReader(BytesIO(response.content))
        pdf_text = '\n'.join(page.extract_text() or '' for page in reader.pages)
        classif_idx = pdf_text.find('CLASSIFICACAO')
        anexos_idx = pdf_text.rfind('ANEXOS')

        self.assertIn('9', pdf_text)
        self.assertGreaterEqual(classif_idx, 0)
        self.assertIn('AVALIACAO', pdf_text)
        self.assertIn('10', pdf_text)
        self.assertGreaterEqual(anexos_idx, 0)
        self.assertLess(classif_idx, anexos_idx)
