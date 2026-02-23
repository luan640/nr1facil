from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0030_canaldenuncia'),
    ]

    operations = [
        migrations.AddField(
            model_name='canaldenuncia',
            name='aceita_devolutiva',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='canaldenuncia',
            name='email_devolutiva',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name='canaldenuncia',
            name='testemunhas',
            field=models.TextField(blank=True),
        ),
    ]
