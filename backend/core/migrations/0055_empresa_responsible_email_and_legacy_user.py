from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def copy_legacy_responsible_email(apps, schema_editor):
    Empresa = apps.get_model('core', 'Empresa')
    for empresa in Empresa.objects.select_related('responsavel_usuario').all():
        if empresa.responsible_email:
            continue
        responsavel = getattr(empresa, 'responsavel_usuario', None)
        if responsavel and responsavel.email:
            empresa.responsible_email = responsavel.email
            empresa.save(update_fields=['responsible_email'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0054_remove_consultoriaconfiguracao_notify_on_denuncia_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='empresa',
            name='responsavel_usuario',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='empresas_responsavel',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='empresa',
            name='responsible_email',
            field=models.EmailField(blank=True, default='', max_length=254),
            preserve_default=False,
        ),
        migrations.RunPython(copy_legacy_responsible_email, migrations.RunPython.noop),
    ]
