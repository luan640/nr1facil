from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('core', '0042_consultoriaresponsaveltecnico_responsavel_totem'),
    ]

    operations = [
        migrations.AddField(
            model_name='pedidoajuda',
            name='status',
            field=models.CharField(
                choices=[
                    ('ABERTO', 'Aberto'),
                    ('EM_ATENDIMENTO', 'Em atendimento'),
                    ('ATENDIDO', 'Atendido'),
                ],
                default='ABERTO',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='PedidoAjudaAtualizacao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('texto', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'criado_por',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='atualizacoes_pedidos_ajuda',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'pedido',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='atualizacoes',
                        to='core.pedidoajuda',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Atualizacao de Pedido de Ajuda',
                'verbose_name_plural': 'Atualizacoes de Pedidos de Ajuda',
                'ordering': ['-created_at'],
            },
        ),
    ]
