from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0027_consultoriaconfiguracao_logo'),
    ]

    operations = [
        migrations.AddField(
            model_name='empresa',
            name='cnae',
            field=models.CharField(blank=True, max_length=120),
        ),
    ]
