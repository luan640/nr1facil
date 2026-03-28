from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0052_empresa_phone'),
    ]

    operations = [
        migrations.AddField(
            model_name='consultoriaconfiguracao',
            name='notify_on_pedido_ajuda',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='consultoriaconfiguracao',
            name='notify_on_denuncia',
            field=models.BooleanField(default=True),
        ),
    ]
