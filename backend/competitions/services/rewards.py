from django.contrib.auth import get_user_model
from django.db import transaction

from payment.models import Transaction, TransactionStatus, TransactionType

from ..models import CompetitionMatchReward, Match


@transaction.atomic
def pay_match_rewards(match: Match) -> None:
    match = (
        Match.objects.select_for_update(of=("self",))
        .select_related("competition", "home_team__owner", "away_team__owner")
        .get(pk=match.pk)
    )
    if match.home_team is None or match.away_team is None:
        return

    if match.home_score > match.away_score:
        rewards = (
            (match.home_team, match.competition.match_win_reward, "vitória"),
            (match.away_team, match.competition.match_loss_reward, "derrota"),
        )
    elif match.home_score < match.away_score:
        rewards = (
            (match.home_team, match.competition.match_loss_reward, "derrota"),
            (match.away_team, match.competition.match_win_reward, "vitória"),
        )
    else:
        rewards = (
            (match.home_team, match.competition.match_draw_reward, "empate"),
            (match.away_team, match.competition.match_draw_reward, "empate"),
        )

    users = {
        user.pk: user
        for user in get_user_model().objects.select_for_update()
        .filter(pk__in={team.owner_id for team, _, _ in rewards})
        .order_by("pk")
    }

    for team, amount, outcome in rewards:
        if CompetitionMatchReward.objects.filter(match=match, team=team).exists():
            continue

        user = users[team.owner_id]
        user.balance += amount
        user.save(update_fields=["balance"])

        if amount:
            Transaction.objects.create(
                user=user,
                type=TransactionType.COMPETITION_REWARD,
                status=TransactionStatus.COMPLETED,
                amount=amount,
                balance_after=user.balance,
                notes=f"Competição #{match.competition_id}, partida #{match.id}: {outcome}",
            )

        CompetitionMatchReward.objects.create(
            match=match,
            team=team,
            user=user,
            amount=amount,
        )
