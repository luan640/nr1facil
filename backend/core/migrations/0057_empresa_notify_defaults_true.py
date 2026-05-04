from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0056_add_email_notification_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='empresa',
            name='notify_on_campanha_start',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='empresa',
            name='notify_on_campanha_end',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='empresa',
            name='notify_on_denuncia',
            field=models.BooleanField(default=True),
        ),
    ]
