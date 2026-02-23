from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0033_canaldenuncia_ghe_cargo_funcao'),
    ]

    operations = [
        migrations.AddField(
            model_name='canaldenuncia',
            name='status',
            field=models.CharField(choices=[('ABERTA', 'Aberta'), ('EM_ANALISE', 'Em analise'), ('RESOLVIDA', 'Resolvida')], default='ABERTA', max_length=20),
        ),
        migrations.CreateModel(
            name='CanalDenunciaAtualizacao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('texto', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('criado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='atualizacoes_denuncias', to='core.user')),
                ('denuncia', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='atualizacoes', to='core.canaldenuncia')),
            ],
            options={
                'verbose_name': 'Atualizacao de Denuncia',
                'verbose_name_plural': 'Atualizacoes de Denuncias',
                'ordering': ['-created_at'],
            },
        ),
    ]
