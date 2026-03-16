import os
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent


def load_env_file(env_path):
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_env_file(BASE_DIR / '.env')

SECRET_KEY = 'django-insecure-x16ccm)2!m3c!rxbrd14a_2)cjgzj0f7)u5n-o)6g_l@3qo#ag'
DEBUG = os.getenv('DEBUG', '1') == '1'

def parse_allowed_hosts(raw_value):
    hosts = []
    for item in raw_value.split(','):
        value = item.strip()
        if not value:
            continue
        if value == '*':
            hosts.append(value)
            continue

        # Accept host values accidentally provided as full URLs (Render dashboard mistake).
        if '://' in value:
            parsed = urlparse(value)
            value = parsed.netloc or parsed.path

        # Remove path if user pasted host with suffix like domain.com/api
        value = value.split('/')[0].strip()
        if value:
            hosts.append(value)
    return hosts


def parse_origin_list(raw_value):
    origins = []
    for item in raw_value.split(','):
        value = item.strip()
        if not value:
            continue
        if value == '*':
            origins.append(value)
            continue
        if '://' not in value:
            value = f'https://{value}'
        origins.append(value.rstrip('/'))
    return origins


ALLOWED_HOSTS = parse_allowed_hosts(os.getenv('ALLOWED_HOSTS', ''))
if DEBUG and not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'core.middleware.DevCorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR.parent / 'frontend' / 'dist'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

SUPABASE_DB_HOST = os.getenv('SUPABASE_DB_HOST', 'aws-0-us-west-2.pooler.supabase.com')
SUPABASE_DB_PORT = int(os.getenv('SUPABASE_DB_PORT', '5432'))
SUPABASE_DB_NAME = os.getenv('SUPABASE_DB_NAME', 'postgres')
SUPABASE_DB_USER = os.getenv('SUPABASE_DB_USER', 'postgres.kpgzqowpslygjqikmqcc')
SUPABASE_DB_PASSWORD = os.getenv('SUPABASE_DB_PASSWORD', '')
SUPABASE_DB_CONN_MAX_AGE = int(os.getenv('SUPABASE_DB_CONN_MAX_AGE', '0'))
USE_SUPABASE_POSTGRES = os.getenv('USE_SUPABASE_POSTGRES', '0') == '1'

if USE_SUPABASE_POSTGRES:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': SUPABASE_DB_NAME,
            'USER': SUPABASE_DB_USER,
            'PASSWORD': SUPABASE_DB_PASSWORD,
            'HOST': SUPABASE_DB_HOST,
            'PORT': SUPABASE_DB_PORT,
            'CONN_MAX_AGE': SUPABASE_DB_CONN_MAX_AGE,
            'OPTIONS': {
                'sslmode': 'require',
            },
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'

USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
}

AUTH_USER_MODEL = 'core.User'

# PgBouncer/transaction pooling compatibility (e.g. Supabase pooler)
DISABLE_SERVER_SIDE_CURSORS = True

DEV_CORS_ALLOW_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
CORS_ALLOW_ORIGINS = parse_origin_list(os.getenv('CORS_ALLOW_ORIGINS', '')) or DEV_CORS_ALLOW_ORIGINS

FRONTEND_PUBLIC_BASE_URL = os.getenv('FRONTEND_PUBLIC_BASE_URL', 'http://localhost:5173')
FRONTEND_PUBLIC_USE_HASH_ROUTING = os.getenv('FRONTEND_PUBLIC_USE_HASH_ROUTING', '1') == '1'

EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', '1') == '1'
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', '0') == '1'
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER or 'no-reply@cissconsultoria.local')

SUPABASE_STORAGE_S3_ENDPOINT = os.getenv('SUPABASE_STORAGE_S3_ENDPOINT', 'https://kwygqibakpstvanogpjc.storage.supabase.co/storage/v1/s3')
SUPABASE_STORAGE_REGION = os.getenv('SUPABASE_STORAGE_REGION', 'us-east-2')
SUPABASE_STORAGE_BUCKET = os.getenv('SUPABASE_STORAGE_BUCKET', 'cissconsult')
SUPABASE_STORAGE_ACCESS_KEY = os.getenv('SUPABASE_STORAGE_ACCESS_KEY', '')
SUPABASE_STORAGE_SECRET_KEY = os.getenv('SUPABASE_STORAGE_SECRET_KEY', '')
SUPABASE_STORAGE_PUBLIC_BASE_URL = os.getenv(
    'SUPABASE_STORAGE_PUBLIC_BASE_URL',
    'https://kwygqibakpstvanogpjc.supabase.co/storage/v1/object/public/cissconsult',
).rstrip('/')

# Use Supabase S3-compatible storage for media files when credentials are present
if SUPABASE_STORAGE_ACCESS_KEY and SUPABASE_STORAGE_SECRET_KEY:
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
        },
        'staticfiles': {
            'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
        },
    }
    AWS_S3_ENDPOINT_URL = SUPABASE_STORAGE_S3_ENDPOINT
    AWS_S3_REGION_NAME = SUPABASE_STORAGE_REGION
    AWS_STORAGE_BUCKET_NAME = SUPABASE_STORAGE_BUCKET
    AWS_ACCESS_KEY_ID = SUPABASE_STORAGE_ACCESS_KEY
    AWS_SECRET_ACCESS_KEY = SUPABASE_STORAGE_SECRET_KEY
    # Strip the scheme so S3Boto3Storage builds: https://<custom_domain>/<file_key>
    # e.g. https://kwygqibakpstvanogpjc.supabase.co/storage/v1/object/public/cissconsult/consultoria_logos/file.png
    AWS_S3_CUSTOM_DOMAIN = SUPABASE_STORAGE_PUBLIC_BASE_URL.split('://', 1)[-1]
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    MEDIA_URL = SUPABASE_STORAGE_PUBLIC_BASE_URL + '/'
