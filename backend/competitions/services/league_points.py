from ..models import CompetitionEntry


def _advance_winner(match):
    if match.next_match_id is None or match.home_score == match.away_score:
        return
    winner = match.home_team if match.home_score > match.away_score else match.away_team
    next_match = match.next_match
    setattr(next_match, f"{match.next_match_slot}_team", winner)
    next_match.save(update_fields=[f"{match.next_match_slot}_team"])


def _apply_match_points(match):
    entry_home, _ = CompetitionEntry.objects.get_or_create(
        competition=match.competition,
        team=match.home_team,
    )
    entry_away, _ = CompetitionEntry.objects.get_or_create(
        competition=match.competition,
        team=match.away_team,
    )
    if match.home_score > match.away_score:
        entry_home.points += match.competition.league_win_points
        entry_away.points += match.competition.league_loss_points
    elif match.home_score < match.away_score:
        entry_away.points += match.competition.league_win_points
        entry_home.points += match.competition.league_loss_points
    else:
        entry_home.points += match.competition.league_draw_points
        entry_away.points += match.competition.league_draw_points
    entry_home.save(update_fields=["points"])
    entry_away.save(update_fields=["points"])


def rebuild_league_points(competition):
    CompetitionEntry.objects.filter(competition=competition).update(points=0)
    for match in competition.matches.filter(status="played"):
        _apply_match_points(match)
