import random

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from fifa_data.models import Player
from team.models import RosterEntry

from ..models import Competition, DraftPick, DraftSession, Participant
from .permissions import require_competition_admin


def build_pick_order(participant_ids: list[int], mode: str, rounds: int) -> list[int]:
    if not participant_ids or rounds < 1:
        return []
    order: list[int] = []
    for round_index in range(rounds):
        if mode == Competition.DraftMode.SNAKE and round_index % 2 == 1:
            order.extend(reversed(participant_ids))
        elif mode == Competition.DraftMode.REVERSE:
            order.extend(list(reversed(participant_ids)))
        else:
            order.extend(participant_ids)
    return order


def _ordered_participants(competition: Competition, participants: list[Participant]) -> list[Participant]:
    mode = competition.draft_order_mode
    if mode == Competition.DraftOrderMode.JOIN_ORDER:
        return sorted(participants, key=lambda participant: participant.joined_at)
    if mode == Competition.DraftOrderMode.MANUAL:
        ordered = sorted(participants, key=lambda participant: participant.draft_slot or 9999)
        if any(participant.draft_slot is None for participant in participants):
            raise ValidationError("Defina a ordem manual do draft antes de iniciar.")
        return ordered

    ordered = participants[:]
    rng = random.Random(competition.draft_seed) if competition.draft_seed else random
    rng.shuffle(ordered)
    return ordered


def start_draft(user, competition: Competition) -> DraftSession:
    require_competition_admin(user, competition)
    if competition.status != Competition.Status.REGISTRATION:
        raise ValidationError("O draft já foi iniciado ou a competição foi encerrada.")
    if competition.competition_type not in (
        Competition.CompetitionType.DRAFT,
        Competition.CompetitionType.LEAGUE,
        Competition.CompetitionType.CUP,
    ):
        raise ValidationError("Tipo de competição inválido para draft.")

    participants = list(competition.participants.select_related("user").order_by("joined_at"))
    if len(participants) < 2:
        raise ValidationError("São necessários pelo menos 2 participantes.")

    ordered = _ordered_participants(competition, participants)
    for slot, participant in enumerate(ordered, start=1):
        participant.draft_slot = slot
        participant.save(update_fields=["draft_slot"])

    ordered_ids = [participant.id for participant in ordered]
    rounds = competition.draft_rounds or 18
    pick_order = build_pick_order(ordered_ids, competition.draft_mode, rounds)

    with transaction.atomic():
        competition.status = Competition.Status.DRAFT
        competition.save(update_fields=["status"])
        session, _ = DraftSession.objects.update_or_create(
            competition=competition,
            defaults={
                "status": DraftSession.Status.ACTIVE,
                "pick_order": pick_order,
                "current_pick_index": 0,
                "started_at": timezone.now(),
                "finished_at": None,
            },
        )
        DraftPick.objects.filter(session=session).delete()

    transaction.on_commit(lambda: _broadcast_draft_state(competition))
    return session


def make_pick(user, competition: Competition, player_id: int) -> DraftPick:
    try:
        session = competition.draft_session
    except DraftSession.DoesNotExist as exc:
        raise ValidationError("Draft ainda não foi iniciado.") from exc

    if session.status != DraftSession.Status.ACTIVE:
        raise ValidationError("Draft não está ativo.")

    participant = Participant.objects.filter(competition=competition, user=user).first()
    if participant is None:
        raise ValidationError("Você não participa desta competição.")

    if session.current_pick_index >= len(session.pick_order):
        raise ValidationError("Draft finalizado.")

    current_participant_id = session.pick_order[session.current_pick_index]
    if current_participant_id != participant.id:
        raise ValidationError("Não é a sua vez.")

    try:
        player = Player.objects.get(pk=player_id)
    except Player.DoesNotExist as exc:
        raise ValidationError("Jogador não encontrado.") from exc

    if DraftPick.objects.filter(session=session, player=player).exists():
        raise ValidationError("Jogador já escolhido.")

    with transaction.atomic():
        pick = DraftPick.objects.create(
            session=session,
            pick_number=session.current_pick_index + 1,
            participant=participant,
            player=player,
        )
        RosterEntry.objects.get_or_create(team=participant.team, player=player)
        session.current_pick_index += 1
        if session.current_pick_index >= len(session.pick_order):
            session.status = DraftSession.Status.FINISHED
            session.finished_at = timezone.now()
            if competition.competition_type == Competition.CompetitionType.DRAFT:
                competition.status = Competition.Status.ACTIVE
                competition.save(update_fields=["status"])
            else:
                from .autogen import auto_generate_fixtures

                auto_generate_fixtures(competition)
        session.save(update_fields=["current_pick_index", "status", "finished_at"])


    transaction.on_commit(lambda: _broadcast_draft_state(competition))
    return pick


def get_draft_state(competition: Competition, request=None) -> dict | None:
    try:
        session = competition.draft_session
    except DraftSession.DoesNotExist:
        return None
    from ..serializers import DraftStateSerializer

    return DraftStateSerializer(
        session,
        context={"competition": competition, "request": request},
    ).data


def _broadcast_draft_state(competition: Competition) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    payload = get_draft_state(competition) or {"competition_id": competition.id}
    async_to_sync(channel_layer.group_send)(
        f"draft_{competition.id}",
        {"type": "draft.event", "payload": payload},
    )
