"""Testes de idempotência da geração automática de chaveamento/rodadas."""

from django.test import TestCase

from campaigns.models import Campaign
from competitions.models import Competition
from competitions.services import auto_generate_fixtures, can_auto_generate
from competitions.services.draft import make_pick, start_draft
from competitions.services.registration import activate_without_draft, join_competition
from fifa_data.models import Player
from user.models import User


def make_user(username: str, cpf: str, *, staff: bool = False) -> User:
    return User.objects.create_user(
        username=username,
        email=f"{username}@x.com",
        password="x",
        cpf=cpf,
        cellphone="",
        address="",
        town="",
        post_code="",
        country="",
        birth_date="1990-01-01",
        is_staff=staff,
    )


class AutoGenerateFixturesIdempotencyTests(TestCase):
    def setUp(self):
        self.campaign = Campaign.objects.create(
            name="Camp",
            matches_per_market_cycle=1,
            min_roster_size=1,
            max_roster_size=20,
        )
        self.admin = make_user("admin_ag", "ag0", staff=True)
        self.users = [make_user(f"u_ag{index}", f"ag{index + 1}") for index in range(2)]

    def _competition(self, competition_type: str, **kwargs) -> Competition:
        return Competition.objects.create(
            name=f"Comp {competition_type}",
            competition_type=competition_type,
            status=Competition.Status.REGISTRATION,
            campaign=self.campaign,
            created_by=self.admin,
            max_participants=kwargs.pop("max_participants", 2),
            **kwargs,
        )

    def _join_all(self, competition: Competition) -> None:
        for user in self.users:
            join_competition(user, competition)

    def test_league_activate_is_idempotent(self):
        competition = self._competition(
            Competition.CompetitionType.LEAGUE,
            max_participants=4,
            league_double_round=False,
        )
        self._join_all(competition)
        self.assertEqual(competition.matches.count(), 0)

        activate_without_draft(self.admin, competition)
        first_count = competition.matches.count()
        self.assertGreater(first_count, 0)

        # Reexecuções não devem duplicar partidas.
        self.assertIsNone(auto_generate_fixtures(competition))
        self.assertIsNone(auto_generate_fixtures(competition))
        self.assertEqual(competition.matches.count(), first_count)
        self.assertFalse(can_auto_generate(competition))

    def test_join_filling_slots_generates_once(self):
        competition = self._competition(
            Competition.CompetitionType.LEAGUE,
            max_participants=2,
            league_double_round=False,
        )
        self._join_all(competition)

        first_count = competition.matches.count()
        self.assertGreater(first_count, 0)
        self.assertIsNone(auto_generate_fixtures(competition))
        self.assertEqual(competition.matches.count(), first_count)

    def test_cup_bracket_generated_once_after_draft(self):
        competition = self._competition(
            Competition.CompetitionType.CUP,
            max_participants=4,
            draft_order_mode=Competition.DraftOrderMode.JOIN_ORDER,
            draft_rounds=1,
        )
        self._join_all(competition)
        self.assertEqual(competition.matches.count(), 0)

        players = [
            Player.objects.create(fifa_id=9100 + index, common_name=f"AG{index}", overall_rating=80)
            for index in range(len(self.users))
        ]

        start_draft(self.admin, competition)
        for user, player in zip(self.users, players):
            make_pick(user, competition, player.id)

        competition.refresh_from_db()
        first_count = competition.matches.count()
        self.assertGreater(first_count, 0)
        self.assertEqual(competition.status, Competition.Status.ACTIVE)

        # Após o draft terminar, novas chamadas são no-op.
        self.assertIsNone(auto_generate_fixtures(competition))
        self.assertEqual(competition.matches.count(), first_count)

    def test_no_autogen_without_minimum_participants(self):
        competition = self._competition(Competition.CompetitionType.LEAGUE, max_participants=4)
        join_competition(self.users[0], competition)

        self.assertFalse(can_auto_generate(competition))
        self.assertIsNone(auto_generate_fixtures(competition))
        self.assertEqual(competition.matches.count(), 0)
