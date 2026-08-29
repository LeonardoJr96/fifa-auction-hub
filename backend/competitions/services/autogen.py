"""Geração automática de chaveamento/rodadas.

Sem checagem de permissão: é acionado por eventos do próprio sistema
(competição lotada, ativação ou fim do draft), não por requisição de admin.
"""

from django.db import transaction

from ..models import Competition
from .league import create_league_fixtures, ensure_competition_entries
from .legacy import generate_bracket


def can_auto_generate(competition: Competition) -> bool:
    if competition.competition_type not in (
        Competition.CompetitionType.LEAGUE,
        Competition.CompetitionType.CUP,
    ):
        return False
    if competition.matches.exists():
        return False
    return competition.participants.count() >= 2


def auto_generate_fixtures(competition: Competition) -> list | None:
    """Gera rodadas (liga) ou chaveamento (copa). Idempotente e silencioso."""
    if not can_auto_generate(competition):
        return None

    if competition.competition_type == Competition.CompetitionType.LEAGUE:
        return create_league_fixtures(competition)

    teams = [participant.team for participant in competition.participants.select_related("team")]
    ensure_competition_entries(competition)
    with transaction.atomic():
        matches = generate_bracket(competition, teams)
        if competition.status != Competition.Status.ACTIVE:
            competition.status = Competition.Status.ACTIVE
            competition.save(update_fields=["status"])
    return matches
