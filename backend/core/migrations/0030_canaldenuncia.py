from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0029_empresa_canal_denuncias_token'),
    ]

    operations = [
        migrations.CreateModel(
            name='CanalDenuncia',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('possui_vinculo', models.BooleanField()),
                ('deseja_identificar', models.BooleanField(default=False)),
                ('relato', models.TextField()),
                ('evidencia_arquivo', models.FileField(blank=True, null=True, upload_to='canal_denuncias_evidencias/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('empresa', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='canal_denuncias', to='core.empresa')),
            ],
            options={
                'verbose_name': 'Canal de Denuncia',
                'verbose_name_plural': 'Canal de Denuncias',
                'ordering': ['-created_at'],
            },
        ),
    ]
