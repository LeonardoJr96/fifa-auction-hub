from django.core.exceptions import ValidationError
from django.db import transaction

from team.services import get_or_create_team

from ..models import Competition, Participant
from .autogen import auto_generate_fixtures



def create_competition(
    user,
    *,
    name: str,
    description: str = "",
    competition_type: str = Competition.CompetitionType.DRAFT,
    draft_mode: str = Competition.DraftMode.SNAKE,
    draft_order_mode: str = Competition.DraftOrderMode.RANDOM,
    draft_seed: int | None = None,
    max_participants: int = 8,
    draft_rounds: int = 18,
    league_double_round: bool = True,
    league_win_points: int = 3,
    league_draw_points: int = 1,
    league_loss_points: int = 0,
) -> Competition:
    if not user.is_staff:
        raise ValidationError("Apenas administradores podem criar competições.")
    if not name.strip():
        raise ValidationError("O nome da competição é obrigatório.")
    if max_participants < 2:
        raise ValidationError("Mínimo de 2 participantes.")
    if competition_type == Competition.CompetitionType.DRAFT and draft_rounds < 1:
        raise ValidationError("O draft precisa de pelo menos 1 rodada.")

    return Competition.objects.create(
        name=name.strip(),
        description=description.strip(),
        competition_type=competition_type,
        status=Competition.Status.REGISTRATION,
        draft_mode=draft_mode,
        draft_order_mode=draft_order_mode,
        draft_seed=draft_seed,
        max_participants=max_participants,
        draft_rounds=draft_rounds if competition_type == Competition.CompetitionType.DRAFT else 0,
        league_double_round=league_double_round,
        league_win_points=league_win_points,
        league_draw_points=league_draw_points,
        league_loss_points=league_loss_points,
        created_by=user,
    )


def join_competition(user, competition: Competition) -> Participant:
    if competition.status != Competition.Status.REGISTRATION:
        raise ValidationError("Inscrições encerradas para esta competição.")
    if not competition.is_active:
        raise ValidationError("Esta competição não está ativa.")
    if competition.participants.filter(user=user).exists():
        raise ValidationError("Você já está inscrito.")
    if competition.participants.count() >= competition.max_participants:
        raise ValidationError("Competição lotada.")

    with transaction.atomic():
        team = get_or_create_team(user, competition=competition)
        if not team.name:
            team.name = user.username
            team.save(update_fields=["name"])
        participant = Participant.objects.create(
            competition=competition,
            user=user,
            team=team,
        )
        if competition.participants.count() >= competition.max_participants:
            auto_generate_fixtures(competition)
        return participant


def activate_without_draft(user, competition: Competition) -> Competition:
    if not user.is_staff and competition.created_by_id != user.id:
        raise ValidationError("Sem permissão.")
    if competition.competition_type == Competition.CompetitionType.DRAFT:
        raise ValidationError("Competições de draft precisam passar pelo draft.")
    if competition.status != Competition.Status.REGISTRATION:
        raise ValidationError("A competição já foi iniciada.")
    if competition.participants.count() < 2:
        raise ValidationError("São necessários pelo menos 2 participantes.")
    with transaction.atomic():
        competition.status = Competition.Status.ACTIVE
        competition.save(update_fields=["status"])
        auto_generate_fixtures(competition)
    return competition
