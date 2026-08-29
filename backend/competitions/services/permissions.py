from django.core.exceptions import ValidationError

from ..models import Competition


def require_competition_admin(user, competition: Competition) -> None:
    if user.is_staff:
        return
    if competition.created_by_id == user.id:
        return
    raise ValidationError("Sem permissão para administrar esta competição.")
