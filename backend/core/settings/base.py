import os
from pathlib import Path

import environ

from .api import *  # noqa: F403
from .celery import *  # noqa: F403
from .password_policy import PASSWORD_POLICY  # noqa: F401

env = environ.Env(
    DEBUG=(bool, False),
    COOKIE_SECURE=(bool, False),
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent

environ.Env.read_env(BASE_DIR.parent / ".env")

SECRET_KEY = env("SECRET_KEY", default="django-insecure-dev-only-change-in-production")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_celery_beat",
    "auction",
    "products",
    "fifa_data",
    "user",
    "common.apps.CommonConfig",
    "team",
    "payment",
    "campaigns",
    "competitions",
    "social",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_password_validators",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [env("REDIS_URL", default="redis://127.0.0.1:6379/0")]},
    },
}

DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
    )
}

AUTH_USER_MODEL = "user.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": PASSWORD_POLICY["min_length"]},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {
        "NAME": "django_password_validators.password_character_requirements.password_validation.PasswordCharacterValidator",
        "OPTIONS": {
            "min_length_digit": PASSWORD_POLICY["character_requirements"]["min_digit"],
            "min_length_alpha": 1,
            "min_length_special": PASSWORD_POLICY["character_requirements"]["min_special"],
            "min_length_upper": PASSWORD_POLICY["character_requirements"]["min_upper"],
            "special_characters": PASSWORD_POLICY["character_requirements"]["special_characters"],
        },
    },
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUCTION_PAYMENT_DEADLINE_DAYS = env.int("AUCTION_PAYMENT_DEADLINE_DAYS", default=1)
AUCTION_REOPEN_EXTENSION_DAYS = env.int("AUCTION_REOPEN_EXTENSION_DAYS", default=7)
AUCTION_BID_EXTENSION_SECONDS = env.int("AUCTION_BID_EXTENSION_SECONDS", default=30)
RESPONSIBLE_GAMBLING_DEPOSIT_LIMIT = env.float("RESPONSIBLE_GAMBLING_DEPOSIT_LIMIT", default=500.00)
RESPONSIBLE_GAMBLING_LOSS_LIMIT = env.float("RESPONSIBLE_GAMBLING_LOSS_LIMIT", default=300.00)

SCRAPER_IMPORT_KEY = env("SCRAPER_IMPORT_KEY", default="troque-por-um-valor-secreto-de-verdade")

PIX_GATEWAY = env(
    "PIX_GATEWAY",
    default="payment.gateways.fake.FakePixGateway",
)

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "same-origin"

REDIS_URL = env("REDIS_URL", default=None)
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
            "TIMEOUT": 300,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "fifa-auction-hub-cache",
            "TIMEOUT": 300,
        }
    }

