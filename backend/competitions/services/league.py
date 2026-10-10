from django.core.exceptions import ValidationError
from django.db import transaction

from ..models import Competition, CompetitionEntry, Match, Participant
from .permissions import require_competition_admin


def ensure_competition_entries(competition: Competition) -> None:
    existing_team_ids = set(
        CompetitionEntry.objects.filter(competition=competition).values_list("team_id", flat=True)
    )
    entries_to_create = [
        CompetitionEntry(competition=competition, team_id=team_id)
        for team_id in competition.participants.values_list("team_id", flat=True)
        if team_id not in existing_team_ids
    ]
    if entries_to_create:
        CompetitionEntry.objects.bulk_create(entries_to_create, ignore_conflicts=True)


def _round_robin_pairings(team_ids: list[int]) -> list[list[tuple[int, int]]]:
    teams: list[int | None] = list(team_ids)
    if len(teams) % 2 == 1:
        teams.append(None)
    rounds: list[list[tuple[int, int]]] = []
    for round_index in range(len(teams) - 1):
        round_pairs: list[tuple[int, int]] = []
        for index in range(len(teams) // 2):
            home = teams[index]
            away = teams[len(teams) - 1 - index]
            if home is None or away is None:
                continue
            if round_index % 2 == 1:
                home, away = away, home
            round_pairs.append((home, away))
        rounds.append(round_pairs)
        teams = [teams[0]] + [teams[-1]] + teams[1:-1]
    return rounds


def create_league_fixtures(
    competition: Competition,
    *,
    double_round: bool | None = None,
) -> list[Match]:
    """Cria as rodadas da liga sem checagem de permissão (uso interno/automático)."""
    if competition.competition_type != Competition.CompetitionType.LEAGUE:
        raise ValidationError("Esta competição não é do tipo liga.")
    if competition.matches.exists():
        raise ValidationError("Esta competição já possui partidas geradas.")

    team_ids = list(
        competition.participants.order_by("joined_at").values_list("team_id", flat=True),
    )
    if len(team_ids) < 2:
        raise ValidationError("São necessários pelo menos 2 participantes.")

    ensure_competition_entries(competition)
    use_double = competition.league_double_round if double_round is None else double_round
    pairings = _round_robin_pairings(team_ids)

    if use_double:
        return_pairings = []
        for round_pairs in pairings:
            return_pairings.append([(away, home) for home, away in round_pairs])
        pairings = pairings + return_pairings

    matches_to_create = []
    for round_number, round_pairs in enumerate(pairings, start=1):
        for home_id, away_id in round_pairs:
            matches_to_create.append(
                Match(
                    competition=competition,
                    home_team_id=home_id,
                    away_team_id=away_id,
                    round_number=round_number,
                )
            )

    with transaction.atomic():
        created = Match.objects.bulk_create(matches_to_create)
        competition.status = Competition.Status.ACTIVE
        competition.save(update_fields=["status"])
    return created


def generate_league_fixtures(
    user,
    competition: Competition,
    *,
    double_round: bool | None = None,
) -> list[Match]:
    require_competition_admin(user, competition)
    return create_league_fixtures(competition, double_round=double_round)




def _team_match_stats(team_id: int, matches) -> dict:
    played = wins = draws = losses = goals_for = goals_against = 0
    for match in matches:
        if match.home_team_id == team_id:
            goals_for += match.home_score
            goals_against += match.away_score
            if match.home_score > match.away_score:
                wins += 1
            elif match.home_score < match.away_score:
                losses += 1
            else:
                draws += 1
            played += 1
        elif match.away_team_id == team_id:
            goals_for += match.away_score
            goals_against += match.home_score
            if match.away_score > match.home_score:
                wins += 1
            elif match.away_score < match.home_score:
                losses += 1
            else:
                draws += 1
            played += 1
    return {
        "played": played,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "goals_for": goals_for,
        "goals_against": goals_against,
        "goal_diff": goals_for - goals_against,
    }


def get_standings(competition: Competition) -> list[dict]:
    ensure_competition_entries(competition)
    played_matches = list(competition.matches.filter(status="played"))
    standings: list[dict] = []
    for entry in competition.entries.select_related("team", "team__owner"):
        if entry.team_id is None:
            continue
        team = entry.team
        stats = _team_match_stats(entry.team_id, played_matches)
        standings.append({
            "team_id": entry.team_id,
            "team_name": team.name or team.owner.username,
            "username": team.owner.username,
            "points": entry.points,
            **stats,
        })
    standings.sort(
        key=lambda row: (
            -row["points"],
            -row["wins"],
            -row["goal_diff"],
            -row["goals_for"],
            row["team_id"],
        ),
    )
    for position, row in enumerate(standings, start=1):
        row["position"] = position
    return standings
