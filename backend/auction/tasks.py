from celery import shared_task
from django.core.management import call_command


@shared_task(name="auction.tasks.expire_unpaid_auctions")
def expire_unpaid_auctions():
    call_command("expire_unpaid_auctions")
