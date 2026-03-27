from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0051_campanha_aceitar_respostas_acima_limite'),
    ]

    operations = [
        migrations.AddField(
            model_name='empresa',
            name='phone',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
