from django.db import models


FORMATION_CHOICES = [
    ("4-3-3", "4-3-3"),
    ("4-4-2", "4-4-2"),
    ("3-5-2", "3-5-2"),
    ("4-2-3-1", "4-2-3-1"),
]


class FormationSlot(models.Model):
    """
    Define as posições fixas de cada formação, com coordenada em % pra
    desenhar o campinho no front (x=0 esquerda, x=100 direita, y=0 fundo
    da defesa, y=100 ataque).
    """
    formation = models.CharField(max_length=10, choices=FORMATION_CHOICES)
    slot_code = models.CharField(max_length=10)   # 'GK', 'LB', 'CB1', 'CM1'...
    label = models.CharField(max_length=20)        # 'Goleiro', 'Zagueiro'...
    x = models.FloatField()
    y = models.FloatField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("formation", "slot_code")
        ordering = ["formation", "order"]


class Team(models.Model):
    owner = models.ForeignKey("user.User", on_delete=models.CASCADE, related_name="teams")
    campaign = models.ForeignKey(
        "campaigns.Campaign",
        on_delete=models.CASCADE,
        related_name="teams",
        null=True,
        blank=True,
    )
    competition = models.ForeignKey(
        "competitions.Competition",
        on_delete=models.CASCADE,
        related_name="teams",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=100, blank=True)
    formation = models.CharField(max_length=10, choices=FORMATION_CHOICES, default="4-3-3")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "campaign"],
                condition=models.Q(campaign__isnull=False),
                name="unique_team_owner_campaign",
            ),
            models.UniqueConstraint(
                fields=["owner", "competition"],
                condition=models.Q(competition__isnull=False),
                name="unique_team_owner_competition",
            ),
            models.UniqueConstraint(
                fields=["owner"],
                condition=models.Q(campaign__isnull=True, competition__isnull=True),
                name="unique_global_team_owner",
            ),
        ]


class RosterEntry(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="roster_entries")
    player = models.ForeignKey("fifa_data.Player", on_delete=models.CASCADE, related_name="roster_entries")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "player")


class TacticSlot(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="slots")
    slot_code = models.CharField(max_length=10)
    player = models.ForeignKey(
        "fifa_data.Player", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        unique_together = ("team", "slot_code")


class PortfolioListingType(models.TextChoices):
    AUCTION = "auction", "Leilão"
    DIRECT = "direct", "Venda direta"


class PortfolioListingStatus(models.TextChoices):
    ACTIVE = "active", "Ativa"
    PENDING = "pending", "Aguardando comprador"
    SOLD = "sold", "Vendida"
    CANCELLED = "cancelled", "Cancelada"


class PortfolioListing(models.Model):
    """Listagem de jogador da bolsa global do usuário (revenda P2P)."""

    seller = models.ForeignKey("user.User", on_delete=models.CASCADE, related_name="portfolio_listings")
    player = models.ForeignKey("fifa_data.Player", on_delete=models.CASCADE, related_name="portfolio_listings")
    listing_type = models.CharField(max_length=20, choices=PortfolioListingType.choices)
    price = models.DecimalField(max_digits=25, decimal_places=2)
    buyer = models.ForeignKey(
        "user.User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="incoming_portfolio_offers",
        help_text="Comprador escolhido pelo vendedor (venda direta).",
    )
    auction = models.ForeignKey(
        "auction.Auction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portfolio_listing",
    )
    status = models.CharField(
        max_length=20,
        choices=PortfolioListingStatus.choices,
        default=PortfolioListingStatus.ACTIVE,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["player"],
                condition=models.Q(is_active=True),
                name="unique_active_portfolio_listing_per_player",
            ),
        ]