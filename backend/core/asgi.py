"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.production')

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from django.urls import path

django_asgi_app = get_asgi_application()

from core.channels_jwt import JwtAuthMiddlewareStack
from auction.consumers import AuctionConsumer
from competitions.consumers import DraftConsumer

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JwtAuthMiddlewareStack(URLRouter([
        path('ws/auctions/<int:auction_id>/', AuctionConsumer.as_asgi()),
        path('ws/drafts/<int:competition_id>/', DraftConsumer.as_asgi()),
    ])),
})
