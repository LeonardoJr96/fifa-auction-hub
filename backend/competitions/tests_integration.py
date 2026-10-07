from django.test import TestCase
from django.utils import timezone

from competitions.models import Competition, Match, CompetitionEntry, MatchResultLog, Participant
from campaigns.models import Campaign, MarketWindow
from team.models import Team
from competitions import services as competition_services


class CompetitionsIntegrationTests(TestCase):
    def setUp(self):
        # create campaign with small matches_per_market_cycle to trigger market window
        self.campaign = Campaign.objects.create(name='C1', matches_per_market_cycle=1)
        # create a user to be owner and teams linked to campaign
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.owner = User.objects.create_user(username='owner', password='pw', birth_date='2000-01-01', cpf='00000000001', email='owner@example.com')
        self.team_a = Team.objects.create(name='Team A', campaign=self.campaign, owner=self.owner)
        self.owner_b = User.objects.create_user(username='owner2', password='pw', birth_date='1999-01-01', cpf='00000000002', email='owner2@example.com')
        self.team_b = Team.objects.create(name='Team B', campaign=self.campaign, owner=self.owner_b)
        # competition linked to campaign
        self.competition = Competition.objects.create(name='Comp', campaign=self.campaign)
        CompetitionEntry.objects.create(competition=self.competition, team=self.team_a)
        CompetitionEntry.objects.create(competition=self.competition, team=self.team_b)

    def test_simulate_match_opens_market_window(self):
        match = Match.objects.create(competition=self.competition, home_team=self.team_a, away_team=self.team_b)

        # simulate; should call notify_match_played and open market window because matches_per_market_cycle=1
        competition_services.simulate_match(match)

        mw_exists = MarketWindow.objects.filter(campaign=self.campaign).exists()
        self.assertTrue(mw_exists, 'Simulating a match should open a MarketWindow when threshold reached')

    def test_created_by_can_generate_fixtures_after_competition_is_active(self):
        competition = Competition.objects.create(
            name="Active League",
            competition_type=Competition.CompetitionType.LEAGUE,
            status=Competition.Status.ACTIVE,
            league_double_round=False,
            created_by=self.owner,
        )
        Participant.objects.create(competition=competition, user=self.owner, team=self.team_a)
        Participant.objects.create(competition=competition, user=self.owner_b, team=self.team_b)

        matches = competition_services.generate_league_fixtures(self.owner, competition)

        self.assertEqual(len(matches), 1)
        self.assertEqual(competition.matches.count(), 1)

    def test_correcting_league_result_rebuilds_standings(self):
        competition = Competition.objects.create(
            name="League Results",
            competition_type=Competition.CompetitionType.LEAGUE,
            created_by=self.owner,
        )
        match = Match.objects.create(
            competition=competition,
            home_team=self.team_a,
            away_team=self.team_b,
        )

        competition_services.register_competition_match_result(
            self.owner, competition, match, home_score=3, away_score=1,
        )
        competition_services.register_competition_match_result(
            self.owner, competition, match, home_score=0, away_score=2,
        )

        self.assertEqual(competition.entries.get(team=self.team_a).points, 0)
        self.assertEqual(competition.entries.get(team=self.team_b).points, 3)
        self.assertEqual(
            list(match.result_logs.values_list("action", flat=True)),
            [MatchResultLog.Action.UPDATED, MatchResultLog.Action.CREATED],
        )

    def test_league_points_use_competition_configured_values(self):
        competition = Competition.objects.create(
            name="Custom Points League",
            competition_type=Competition.CompetitionType.LEAGUE,
            created_by=self.owner,
            league_win_points=5,
            league_draw_points=2,
            league_loss_points=1,
        )
        win = Match.objects.create(
            competition=competition,
            home_team=self.team_a,
            away_team=self.team_b,
        )
        draw = Match.objects.create(
            competition=competition,
            home_team=self.team_a,
            away_team=self.team_b,
        )

        competition_services.register_competition_match_result(
            self.owner, competition, win, home_score=2, away_score=0,
        )
        competition_services.register_competition_match_result(
            self.owner, competition, draw, home_score=1, away_score=1,
        )

        self.assertEqual(competition.entries.get(team=self.team_a).points, 7)
        self.assertEqual(competition.entries.get(team=self.team_b).points, 3)
