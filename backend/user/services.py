# user/services.py
from .models import User


def register_user(data):
    """Cria um novo usuário com os dados fornecidos."""
    return User.objects.create_user(**data)
