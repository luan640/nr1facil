from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0035_empresa_totem_token"),
    ]

    operations = [
        migrations.AddField(
            model_name="canaldenuncia",
            name="origem",
            field=models.CharField(
                choices=[("LINK", "Link de denuncia"), ("TOTEM", "Totem")],
                default="LINK",
                max_length=20,
            ),
        ),
    ]
