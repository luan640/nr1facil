from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Campanha, CampanhaMedidaPreliminar, CampanhaQuandoPreliminar, CampanhaRelatorioAnexo, CampanhaRespostaStep1, CampanhaRespostaStep2, CampanhaRespostaStep3, CampanhaRespostaStep4, CampanhaRespostaStep5, CampanhaRespostaStep6, CampanhaRespostaStep7, CampanhaRespostaStep8, CampanhaRespostaStep9, Cargo, Empresa, Ghe, Setor, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ['email']
    list_display = ['email', 'full_name', 'user_type', 'consultoria_master', 'is_staff', 'is_superuser', 'is_active']
    search_fields = ['email', 'full_name']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Dados pessoais', {'fields': ('full_name', 'user_type', 'consultoria_master', 'access_expires_on')}),
        ('Permissoes', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Datas importantes', {'fields': ('last_login',)}),
    )

    add_fieldsets = (
        (
            None,
            {
                'classes': ('wide',),
                'fields': ('email', 'full_name', 'user_type', 'consultoria_master', 'access_expires_on', 'password1', 'password2', 'is_staff', 'is_superuser'),
            },
        ),
    )


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'document_type', 'document_number', 'evaluation_type', 'risk_level', 'is_active']
    list_filter = ['document_type', 'establishment_type', 'evaluation_type', 'is_active']
    search_fields = ['company_name', 'document_number', 'responsible_name', 'responsavel_usuario__email']


@admin.register(Setor)
class SetorAdmin(admin.ModelAdmin):
    list_display = ['name', 'empresa', 'is_active', 'created_at']
    list_filter = ['is_active', 'empresa']
    search_fields = ['name', 'empresa__company_name']


@admin.register(Ghe)
class GheAdmin(admin.ModelAdmin):
    list_display = ['name', 'empresa', 'is_active', 'created_at']
    list_filter = ['is_active', 'empresa']
    search_fields = ['name', 'empresa__company_name']


@admin.register(Cargo)
class CargoAdmin(admin.ModelAdmin):
    list_display = ['name', 'empresa', 'is_active', 'created_at']
    list_filter = ['is_active', 'empresa']
    search_fields = ['name', 'empresa__company_name']


@admin.register(Campanha)
class CampanhaAdmin(admin.ModelAdmin):
    list_display = ['title', 'empresa', 'start_date', 'end_date', 'status', 'created_at']
    list_filter = ['status', 'empresa']
    search_fields = ['title', 'empresa__company_name']


@admin.register(CampanhaRespostaStep1)
class CampanhaRespostaStep1Admin(admin.ModelAdmin):
    list_display = ['campanha', 'cpf', 'first_name', 'age', 'sex', 'cargo', 'created_at']
    list_filter = ['campanha', 'sex', 'created_at']
    search_fields = ['cpf', 'first_name', 'campanha__title']


@admin.register(CampanhaRespostaStep2)
class CampanhaRespostaStep2Admin(admin.ModelAdmin):
    list_display = ['step1', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'created_at']
    list_filter = ['created_at']
    search_fields = ['step1__campanha__title']


@admin.register(CampanhaRespostaStep3)
class CampanhaRespostaStep3Admin(admin.ModelAdmin):
    list_display = ['step1', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'created_at']
    list_filter = ['created_at']
    search_fields = ['step1__campanha__title']


@admin.register(CampanhaRespostaStep4)
class CampanhaRespostaStep4Admin(admin.ModelAdmin):
    list_display = ['step1', 'q1', 'q2', 'q3', 'q4', 'q5', 'created_at']
    list_filter = ['created_at']
    search_fields = ['step1__campanha__title']


@admin.register(CampanhaRespostaStep5)
class CampanhaRespostaStep5Admin(admin.ModelAdmin):
    list_display = ['step1', 'q1', 'q2', 'q3', 'q4', 'created_at']
    list_filter = ['created_at']
    search_fields = ['step1__campanha__title']


@admin.register(CampanhaRespostaStep6)
class CampanhaRespostaStep6Admin(admin.ModelAdmin):
    list_display = ['step1', 'q1', 'q2', 'q3', 'q4', 'created_at']
    list_filter = ['created_at']
    search_fields = ['step1__campanha__title']


@admin.register(CampanhaRespostaStep7)
class CampanhaRespostaStep7Admin(admin.ModelAdmin):
    list_display = ['step1', 'q1', 'q2', 'q3', 'q4', 'q5', 'created_at']
    list_filter = ['created_at']
    search_fields = ['step1__campanha__title']


@admin.register(CampanhaRespostaStep8)
class CampanhaRespostaStep8Admin(admin.ModelAdmin):
    list_display = ['step1', 'q1', 'q2', 'q3', 'created_at']
    list_filter = ['created_at']
    search_fields = ['step1__campanha__title']


@admin.register(CampanhaRespostaStep9)
class CampanhaRespostaStep9Admin(admin.ModelAdmin):
    list_display = ['step1', 'created_at']
    list_filter = ['created_at']
    search_fields = ['step1__campanha__title', 'comment']


@admin.register(CampanhaMedidaPreliminar)
class CampanhaMedidaPreliminarAdmin(admin.ModelAdmin):
    list_display = ['campanha', 'step_number', 'question_field', 'scope_type', 'setor', 'ghe', 'created_at']
    list_filter = ['scope_type', 'step_number', 'campanha']
    search_fields = ['campanha__title', 'action_text']


@admin.register(CampanhaQuandoPreliminar)
class CampanhaQuandoPreliminarAdmin(admin.ModelAdmin):
    list_display = ['campanha', 'step_number', 'question_field', 'scope_type', 'setor', 'ghe', 'updated_at']
    list_filter = ['scope_type', 'step_number', 'campanha']
    search_fields = ['campanha__title']


@admin.register(CampanhaRelatorioAnexo)
class CampanhaRelatorioAnexoAdmin(admin.ModelAdmin):
    list_display = ['campanha', 'file_name', 'content_type', 'size_bytes', 'created_at']
    list_filter = ['campanha', 'created_at']
    search_fields = ['campanha__title', 'file_name']
