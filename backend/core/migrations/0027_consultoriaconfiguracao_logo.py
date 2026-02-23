from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0026_consultoriaconfiguracao_cidade_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='consultoriaconfiguracao',
            name='logo',
            field=models.FileField(blank=True, null=True, upload_to='consultoria_logos/'),
        ),
    ]
