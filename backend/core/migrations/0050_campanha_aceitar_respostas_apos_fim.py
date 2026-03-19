from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0049_add_setor_to_pedidoajuda'),
    ]

    operations = [
        migrations.AddField(
            model_name='campanha',
            name='aceitar_respostas_apos_fim',
            field=models.BooleanField(default=False),
        ),
    ]
