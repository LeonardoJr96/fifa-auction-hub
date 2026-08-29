import os

from celery.schedules import crontab

CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0"))
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "America/Sao_Paulo"
CELERY_TASK_ALWAYS_EAGER = False

CELERY_BEAT_SCHEDULE = {
    "expire-unpaid-auctions": {
        "task": "auction.tasks.expire_unpaid_auctions",
        "schedule": crontab(minute="*/15"),
    },
}
