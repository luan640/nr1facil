from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0032_canaldenuncia_contato_identificacao'),
    ]

    operations = [
        migrations.AddField(
            model_name='canaldenuncia',
            name='cargo_funcao',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='canal_denuncias', to='core.cargo'),
        ),
        migrations.AddField(
            model_name='canaldenuncia',
            name='ghe',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='canal_denuncias', to='core.ghe'),
        ),
    ]
