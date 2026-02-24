from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0037_canaldenuncia_tipo'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='access_expires_on',
            field=models.DateField(blank=True, null=True),
        ),
    ]
