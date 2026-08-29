from django.core.exceptions import ValidationError
from django.db import transaction

from campaigns.models import MatchPlayerStat

from ..models import Competition, Match, MatchResultLog, Participant
from .league_points import _advance_winner, rebuild_league_points
from .legacy import register_manual_result, simulate_match


def require_competition_reporter(user, competition: Competition) -> None:
    if not user.is_authenticated:
        raise ValidationError("É necessário estar logado.")
    if user.is_staff:
        return
    if competition.created_by_id == user.id:
        return
    if Participant.objects.filter(competition=competition, user=user).exists():
        return
    raise ValidationError("Apenas participantes da competição podem registrar resultados.")


def _parse_stats_payload(stats_payload, match: Match) -> list[dict]:
    if not stats_payload:
        return []
    from fifa_data.models import Player
    from team.models import Team

    parsed = []
    for stat in stats_payload:
        player_id = stat.get("player")
        team_id = stat.get("team")
        if not player_id or not team_id:
            raise ValidationError("Cada estatística precisa de player e team.")
        team = Team.objects.get(pk=team_id)
        if team not in (match.home_team, match.away_team):
            raise ValidationError("Time da estatística não participa desta partida.")
        parsed.append({
            "player": Player.objects.get(pk=player_id),
            "team": team,
            "goals": int(stat.get("goals", 0)),
            "assists": int(stat.get("assists", 0)),
        })
    return parsed


def _save_match_stats(match: Match, stats: list[dict] | None) -> None:
    MatchPlayerStat.objects.filter(match=match).delete()
    if not stats:
        return
    for stat in stats:
        MatchPlayerStat.objects.create(
            match=match,
            player=stat["player"],
            team=stat["team"],
            goals=stat.get("goals", 0),
            assists=stat.get("assists", 0),
        )


def register_competition_match_result(
    user,
    competition: Competition,
    match: Match,
    *,
    home_score: int,
    away_score: int,
    stats=None,
) -> Match:
    require_competition_reporter(user, competition)
    if match.competition_id != competition.id:
        raise ValidationError("Esta partida não pertence à competição.")
    if competition.competition_type == Competition.CompetitionType.CUP and home_score == away_score:
        raise ValidationError("Partidas de copa precisam de um vencedor.")

    parsed_stats = _parse_stats_payload(stats, match)
    was_played = match.status == "played"
    previous_home = match.home_score if was_played else None
    previous_away = match.away_score if was_played else None

    with transaction.atomic():
        match.home_score = home_score
        match.away_score = away_score
        match.status = "played"
        match.save(update_fields=["home_score", "away_score", "status"])

        _save_match_stats(match, parsed_stats)

        if competition.competition_type == Competition.CompetitionType.LEAGUE:
            rebuild_league_points(competition)
        elif not was_played:
            from .league_points import _apply_match_points

            _apply_match_points(match)
            _advance_winner(match)

        MatchResultLog.objects.create(
            match=match,
            recorded_by=user,
            action=MatchResultLog.Action.UPDATED if was_played else MatchResultLog.Action.CREATED,
            previous_home_score=previous_home,
            previous_away_score=previous_away,
            home_score=home_score,
            away_score=away_score,
        )

    return match


def simulate_competition_match(user, competition: Competition, match: Match) -> Match:
    if not user.is_staff and competition.created_by_id != user.id:
        raise ValidationError("Apenas administradores podem simular partidas.")
    if match.competition_id != competition.id:
        raise ValidationError("Esta partida não pertence à competição.")
    result = simulate_match(match)
    MatchResultLog.objects.create(
        match=result,
        recorded_by=user,
        action=MatchResultLog.Action.CREATED,
        previous_home_score=None,
        previous_away_score=None,
        home_score=result.home_score,
        away_score=result.away_score,
    )
    return result


def get_competition_matches(competition: Competition):
    return (
        competition.matches.select_related("home_team", "away_team", "next_match")
        .prefetch_related(
            "player_stats__player",
            "player_stats__team",
            "result_logs__recorded_by",
        )
        .order_by("round_number", "id")
    )
