from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0043_pedidoajuda_status_pedidoajudaatualizacao'),
    ]

    operations = [
        migrations.CreateModel(
            name='CampanhaPlanoAcao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('step_key', models.CharField(max_length=20)),
                ('question_field', models.CharField(max_length=10)),
                ('plano_index', models.PositiveSmallIntegerField()),
                ('ativo', models.BooleanField(default=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('campanha', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='planos_acao', to='core.campanha')),
            ],
            options={
                'verbose_name': 'Plano de Ação da Campanha',
                'verbose_name_plural': 'Planos de Ação da Campanha',
                'unique_together': {('campanha', 'step_key', 'question_field', 'plano_index')},
            },
        ),
    ]
