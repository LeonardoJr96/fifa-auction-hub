"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from django.urls import path

from core.channels_jwt import JwtAuthMiddlewareStack
from auction.consumers import AuctionConsumer
from competitions.consumers import DraftConsumer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.production')

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': JwtAuthMiddlewareStack(URLRouter([
        path('ws/auctions/<int:auction_id>/', AuctionConsumer.as_asgi()),
        path('ws/drafts/<int:competition_id>/', DraftConsumer.as_asgi()),
    ])),
})
