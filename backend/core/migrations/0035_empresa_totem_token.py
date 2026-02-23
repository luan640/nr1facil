from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0034_canaldenuncia_status_and_atualizacoes"),
    ]

    operations = [
        migrations.AddField(
            model_name="empresa",
            name="totem_token",
            field=models.UUIDField(blank=True, db_index=True, null=True, unique=True),
        ),
    ]
