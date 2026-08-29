import math
import random

from django.core.exceptions import ValidationError
from django.db import transaction

from competitions.models import CompetitionEntry, Match
from campaigns.models import MatchPlayerStat
from campaigns import services as campaign_services
from fifa_data.models import Player
from team.models import RosterEntry

from .league_points import _advance_winner, rebuild_league_points


def register_manual_result(match, home_score, away_score, stats=None):
    if getattr(match, "status", None) == "played":
        raise ValidationError("Este confronto já possui resultado registrado.")

    if match.competition.competition_type == "cup" and home_score == away_score:
        raise ValidationError("Partidas de copa precisam de um vencedor; informe o resultado dos pênaltis.")

    match.home_score = home_score
    match.away_score = away_score
    match.status = "played"
    match.save(update_fields=["home_score", "away_score", "status"])

    if stats:
        for stat in stats:
            team = stat.get("team")
            if team is None:
                raise ValidationError("Time da estatística é obrigatório.")
            if team not in (match.home_team, match.away_team):
                raise ValidationError("Time da estatística não participa desta partida.")
            MatchPlayerStat.objects.create(
                match=match,
                player=stat["player"],
                team=team,
                goals=stat.get("goals", 0),
                assists=stat.get("assists", 0),
            )

    if match.competition.competition_type == "league":
        rebuild_league_points(match.competition)
    else:
        _apply_match_points(match)

    if match.competition.competition_type == "cup":
        _advance_winner(match)

    if match.competition and getattr(match.competition, "campaign", None) is not None:
        campaign_services.notify_match_played(match.competition.campaign)

    return match


def _standings_key(entry, matches):
    wins = goals_for = goals_against = 0
    for match in matches:
        if match.home_team_id == entry.team_id:
            goals_for += match.home_score
            goals_against += match.away_score
            if match.home_score > match.away_score:
                wins += 1
        elif match.away_team_id == entry.team_id:
            goals_for += match.away_score
            goals_against += match.home_score
            if match.away_score > match.home_score:
                wins += 1
    return (entry.points, wins, goals_for - goals_against, goals_for, -entry.id)


def finish_competition(competition):
    if not competition.is_active:
        raise ValidationError('Esta competição já foi encerrada.')
    entries = list(competition.entries.all())
    played_matches = list(competition.matches.filter(status='played'))
    top_entry = max(entries, key=lambda entry: _standings_key(entry, played_matches), default=None)
    if top_entry is None or not competition.matches.filter(status='played').exists():
        raise ValidationError('Nenhuma equipe possui pontuação registrada.')
    if top_entry.team is None or top_entry.team.owner_id is None:
        raise ValidationError('A equipe campeã não possui proprietário.')
    with transaction.atomic():
        competition.is_active = False
        competition.status = competition.Status.FINISHED
        competition.save(update_fields=['is_active', 'status'])
    return {'champion_team_id': top_entry.team_id}


def generate_bracket(competition, teams):
    if competition.competition_type != 'cup':
        raise ValidationError('Esta competição não é do tipo copa.')
    teams = list(teams)
    if len(teams) < 2:
        raise ValidationError('São necessários pelo menos 2 times para gerar um chaveamento.')
    if competition.matches.exists():
        raise ValidationError('Esta competição já possui partidas no chaveamento.')
    if len({team.id for team in teams}) != len(teams):
        raise ValidationError('Um time não pode aparecer mais de uma vez no chaveamento.')
    random.shuffle(teams)
    size = 2 ** math.ceil(math.log2(len(teams)))
    teams.extend([None] * (size - len(teams)))
    with transaction.atomic():
        first_round = []
        for index in range(0, size, 2):
            home, away = teams[index:index + 2]
            match = Match.objects.create(competition=competition, home_team=home, away_team=away, round_number=1)
            if home is None or away is None:
                match.status = 'played'
                match.home_score, match.away_score = (1, 0) if home else (0, 1)
                match.save(update_fields=['status', 'home_score', 'away_score'])
            first_round.append(match)
        current = first_round
        round_number = 1
        while len(current) > 1:
            round_number += 1
            following = []
            for index in range(0, len(current), 2):
                next_match = Match.objects.create(competition=competition, round_number=round_number)
                for feeder, slot in ((current[index], 'home'), (current[index + 1], 'away')):
                    feeder.next_match = next_match
                    feeder.next_match_slot = slot
                    feeder.save(update_fields=['next_match', 'next_match_slot'])
                following.append(next_match)
            current = following
        for match in first_round:
            if match.status == 'played':
                _advance_winner(match)
        return first_round


def _build_simulated_stats(match, home_goals, away_goals):
    stats = []

    def assign_goals(team, goals):
        roster = list(RosterEntry.objects.filter(team=team).select_related("player"))
        if not roster or goals <= 0:
            return
        for _ in range(goals):
            entry = random.choice(roster)
            stats.append({
                "player": entry.player,
                "team": team,
                "goals": 1,
                "assists": 0,
            })

    assign_goals(match.home_team, home_goals)
    assign_goals(match.away_team, away_goals)
    return stats


def simulate_match(match):
    def team_strength(team):
        players_qs = RosterEntry.objects.filter(team=team).select_related('player')
        ratings = [p.player.overall_rating or 50 for p in players_qs]
        if not ratings:
            return 50.0
        return sum(ratings) / len(ratings)

    home_strength = team_strength(match.home_team)
    away_strength = team_strength(match.away_team)

    if home_strength + away_strength <= 0:
        home_exp = away_exp = 1.0
    else:
        total = home_strength + away_strength
        home_exp = (home_strength / total) * 3.0
        away_exp = (away_strength / total) * 3.0

    home_goals = max(0, int(round(random.gauss(home_exp, 1.2))))
    away_goals = max(0, int(round(random.gauss(away_exp, 1.2))))

    if match.competition.competition_type == 'cup' and home_goals == away_goals:
        away_goals += 1

    stats = _build_simulated_stats(match, home_goals, away_goals)
    return register_manual_result(match, home_goals, away_goals, stats=stats)
