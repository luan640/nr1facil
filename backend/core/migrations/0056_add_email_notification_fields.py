from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0055_empresa_responsible_email_and_legacy_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='empresa',
            name='notify_on_campanha_start',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='empresa',
            name='notify_on_campanha_end',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='empresa',
            name='notify_on_denuncia',
            field=models.BooleanField(default=False),
        ),
    ]
