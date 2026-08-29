from django.core.exceptions import ValidationError
from django.db import transaction

from ..models import Participant
from .permissions import require_competition_admin


def set_draft_order(user, competition, order: list[dict]) -> list[Participant]:
    require_competition_admin(user, competition)
    if competition.status != competition.Status.REGISTRATION:
        raise ValidationError("A ordem do draft só pode ser definida antes do início.")

    participant_ids = {item.get("participant") for item in order}
    if None in participant_ids:
        raise ValidationError("Cada item precisa de participant.")
    if len(participant_ids) != len(order):
        raise ValidationError("Participante duplicado na ordem do draft.")

    slots = [item.get("draft_slot") for item in order]
    if len(set(slots)) != len(slots) or min(slots) != 1 or max(slots) != len(slots):
        raise ValidationError("draft_slot deve ser uma sequência única começando em 1.")

    participants = {
        participant.id: participant
        for participant in competition.participants.all()
    }
    if set(participant_ids) != set(participants):
        raise ValidationError("Informe todos os participantes da competição.")

    with transaction.atomic():
        competition.draft_order_mode = competition.DraftOrderMode.MANUAL
        competition.save(update_fields=["draft_order_mode"])
        updated = []
        for item in order:
            participant = participants[int(item["participant"])]
            participant.draft_slot = int(item["draft_slot"])
            participant.save(update_fields=["draft_slot"])
            updated.append(participant)
    return updated
