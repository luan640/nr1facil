from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0050_campanha_aceitar_respostas_apos_fim'),
    ]

    operations = [
        migrations.AddField(
            model_name='campanha',
            name='aceitar_respostas_acima_limite',
            field=models.BooleanField(default=False),
        ),
    ]
