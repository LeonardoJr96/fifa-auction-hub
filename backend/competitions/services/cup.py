from django.core.exceptions import ValidationError
from django.db import transaction

from ..models import Competition
from .league import ensure_competition_entries
from .legacy import generate_bracket
from .permissions import require_competition_admin


def generate_cup_bracket(user, competition: Competition):
    require_competition_admin(user, competition)
    if competition.competition_type != Competition.CompetitionType.CUP:
        raise ValidationError("Esta competição não é do tipo copa.")
    if competition.matches.exists():
        raise ValidationError("Esta competição já possui chaveamento.")

    teams = [participant.team for participant in competition.participants.select_related("team")]
    if len(teams) < 2:
        raise ValidationError("São necessários pelo menos 2 participantes.")

    ensure_competition_entries(competition)
    with transaction.atomic():
        matches = generate_bracket(competition, teams)
        competition.status = Competition.Status.ACTIVE
        competition.save(update_fields=["status"])
    return matches
