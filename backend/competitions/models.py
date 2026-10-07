from django.conf import settings
from django.db import models


class Competition(models.Model):
    class Status(models.TextChoices):
        REGISTRATION = "registration", "Inscrições"
        DRAFT = "draft", "Draft ao vivo"
        ACTIVE = "active", "Em andamento"
        FINISHED = "finished", "Encerrada"

    class DraftMode(models.TextChoices):
        SNAKE = "snake", "Snake"
        REVERSE = "reverse", "Reverse"
        LINEAR = "linear", "Linear"

    class CompetitionType(models.TextChoices):
        DRAFT = "draft", "Draft"
        LEAGUE = "league", "Liga"
        CUP = "cup", "Copa"

    class DraftOrderMode(models.TextChoices):
        RANDOM = "random", "Aleatório"
        JOIN_ORDER = "join_order", "Ordem de inscrição"
        MANUAL = "manual", "Manual"

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    competition_type = models.CharField(
        max_length=20,
        choices=CompetitionType.choices,
        default=CompetitionType.DRAFT,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REGISTRATION,
    )
    draft_mode = models.CharField(
        max_length=20,
        choices=DraftMode.choices,
        default=DraftMode.SNAKE,
    )
    max_participants = models.PositiveIntegerField(default=8)
    draft_rounds = models.PositiveIntegerField(default=18)
    draft_order_mode = models.CharField(
        max_length=20,
        choices=DraftOrderMode.choices,
        default=DraftOrderMode.RANDOM,
    )
    draft_seed = models.PositiveIntegerField(null=True, blank=True)
    league_double_round = models.BooleanField(default=True)
    league_win_points = models.PositiveIntegerField(default=3)
    league_draw_points = models.PositiveIntegerField(default=1)
    league_loss_points = models.PositiveIntegerField(default=0)
    match_win_reward = models.DecimalField(max_digits=12, decimal_places=2, default=30000)
    match_draw_reward = models.DecimalField(max_digits=12, decimal_places=2, default=10000)
    match_loss_reward = models.DecimalField(max_digits=12, decimal_places=2, default=5000)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_competitions",
    )
    # legado — competições novas não usam campanha
    campaign = models.ForeignKey(
        "campaigns.Campaign",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="competitions",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Participant(models.Model):
    competition = models.ForeignKey(
        Competition,
        on_delete=models.CASCADE,
        related_name="participants",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="competition_participations",
    )
    team = models.ForeignKey(
        "team.Team",
        on_delete=models.CASCADE,
        related_name="competition_participations",
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    draft_slot = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        unique_together = ("competition", "user")
        ordering = ["joined_at"]

    def __str__(self):
        return f"{self.user} @ {self.competition}"


class DraftSession(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        ACTIVE = "active", "Ativo"
        FINISHED = "finished", "Finalizado"

    competition = models.OneToOneField(
        Competition,
        on_delete=models.CASCADE,
        related_name="draft_session",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    pick_order = models.JSONField(default=list)
    current_pick_index = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Draft #{self.competition_id}"


class DraftPick(models.Model):
    session = models.ForeignKey(
        DraftSession,
        on_delete=models.CASCADE,
        related_name="picks",
    )
    pick_number = models.PositiveIntegerField()
    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name="picks",
    )
    player = models.ForeignKey(
        "fifa_data.Player",
        on_delete=models.CASCADE,
        related_name="draft_picks",
    )
    picked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["pick_number"]
        unique_together = ("session", "pick_number"), ("session", "player")

    def __str__(self):
        return f"Pick #{self.pick_number}"


class CompetitionEntry(models.Model):
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name="entries")
    team = models.ForeignKey(
        "team.Team",
        on_delete=models.CASCADE,
        related_name="competition_entries",
        null=True,
        blank=True,
    )
    points = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("competition", "team")


class Match(models.Model):
    STATUS_CHOICES = [
        ("scheduled", "Agendado"),
        ("played", "Jogado"),
    ]

    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name="matches")
    home_team = models.ForeignKey(
        "team.Team",
        on_delete=models.CASCADE,
        related_name="home_matches",
        null=True,
        blank=True,
    )
    away_team = models.ForeignKey(
        "team.Team",
        on_delete=models.CASCADE,
        related_name="away_matches",
        null=True,
        blank=True,
    )
    home_score = models.IntegerField(default=0)
    away_score = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")
    played_at = models.DateTimeField(auto_now_add=True)
    round_number = models.PositiveIntegerField(null=True, blank=True)
    next_match = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="feeder_matches",
    )
    next_match_slot = models.CharField(
        max_length=10,
        choices=[("home", "Home"), ("away", "Away")],
        null=True,
        blank=True,
    )


class MatchResultLog(models.Model):
    class Action(models.TextChoices):
        CREATED = "created", "Registrado"
        UPDATED = "updated", "Atualizado"

    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="result_logs")
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="match_result_logs",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    previous_home_score = models.IntegerField(null=True, blank=True)
    previous_away_score = models.IntegerField(null=True, blank=True)
    home_score = models.IntegerField()
    away_score = models.IntegerField()
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"Match #{self.match_id} · {self.home_score}-{self.away_score}"


class CompetitionMatchReward(models.Model):
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="rewards")
    team = models.ForeignKey("team.Team", on_delete=models.CASCADE)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="competition_match_rewards",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["match", "team"], name="unique_competition_match_team_reward"),
        ]

    def __str__(self):
        return f"Partida #{self.match_id} · {self.team} · {self.amount}"
