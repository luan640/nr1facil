from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0057_empresa_notify_defaults_true'),
    ]

    operations = [
        migrations.AlterField(
            model_name='empresa',
            name='cnae',
            field=models.TextField(blank=True),
        ),
    ]
