from urllib.parse import parse_qs

from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


@database_sync_to_async
def _get_user_from_token(token: str | None):
    if not token:
        return AnonymousUser()
    try:
        validated = AccessToken(token)
        user_id = validated.get("user_id")
        return User.objects.get(pk=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist, TypeError, ValueError):
        return AnonymousUser()


class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]
        if token:
            user = await _get_user_from_token(token)
            if user.is_authenticated:
                scope["user"] = user
        return await super().__call__(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    return JwtAuthMiddleware(AuthMiddlewareStack(inner))
