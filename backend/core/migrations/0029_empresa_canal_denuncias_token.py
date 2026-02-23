from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0028_empresa_cnae'),
    ]

    operations = [
        migrations.AddField(
            model_name='empresa',
            name='canal_denuncias_token',
            field=models.UUIDField(blank=True, null=True, unique=True, db_index=True),
        ),
    ]
