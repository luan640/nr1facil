from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0031_canaldenuncia_testemunhas_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='canaldenuncia',
            name='contato_identificacao',
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
