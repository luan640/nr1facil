from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0036_canaldenuncia_origem"),
    ]

    operations = [
        migrations.AddField(
            model_name="canaldenuncia",
            name="tipo",
            field=models.CharField(
                choices=[
                    ("ASSEDIO_MORAL", "Assedio moral"),
                    ("ASSEDIO_SEXUAL", "Assedio sexual"),
                    ("DISCRIMINACAO", "Discriminacao"),
                    ("VIOLENCIA_VERBAL", "Violencia verbal"),
                    ("VIOLENCIA_FISICA", "Violencia fisica"),
                    ("FRAUDE", "Fraude"),
                    ("CORRUPCAO", "Corrupcao"),
                    ("DESVIO_CONDUTA", "Desvio de conduta"),
                    ("CONFLITO_INTERESSE", "Conflito de interesse"),
                    ("OUTROS", "Outros"),
                ],
                default="OUTROS",
                max_length=40,
            ),
        ),
    ]
