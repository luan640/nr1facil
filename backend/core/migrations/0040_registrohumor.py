from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0039_ghe_setores'),
    ]

    operations = [
        migrations.CreateModel(
            name='RegistroHumor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('humor', models.CharField(
                    choices=[
                        ('feliz', 'Feliz'),
                        ('motivado', 'Motivado'),
                        ('tranquilo', 'Tranquilo'),
                        ('cansado', 'Cansado'),
                        ('estressado', 'Estressado'),
                        ('triste', 'Triste'),
                        ('ansioso', 'Ansioso'),
                        ('sobrecarregado', 'Sobrecarregado'),
                    ],
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('empresa', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='registros_humor',
                    to='core.empresa',
                )),
                ('ghe', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='registros_humor',
                    to='core.ghe',
                )),
                ('setor', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='registros_humor',
                    to='core.setor',
                )),
            ],
            options={
                'verbose_name': 'Registro de Humor',
                'verbose_name_plural': 'Registros de Humor',
                'ordering': ['-created_at'],
            },
        ),
    ]
