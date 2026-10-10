from django.db import models
from common.models import Status

class PricingMode(models.TextChoices):
    PLAYER_VALUE = 'player_value', 'Valor do jogador'
    MANUAL = 'manual', 'Definido pelo admin'

class Auction(models.Model):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    seller = models.ForeignKey(
        'user.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sales_auctions',
        help_text='Preenchido em leilões de revenda entre usuários.',
    )
    pricing_mode = models.CharField(max_length=20, choices=PricingMode.choices, default=PricingMode.PLAYER_VALUE)
    starting_price = models.DecimalField(max_digits=25, decimal_places=2, default=0)
    min_increment = models.DecimalField(max_digits=25, decimal_places=2, default=1)
    number_of_bids = models.IntegerField(default=0)
    winner = models.ForeignKey('user.User', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN, db_index=True)
    time_starting = models.DateTimeField()
    time_ending = models.DateTimeField(db_index=True)
    payment_deadline = models.DateTimeField(null=True, blank=True)
    reopened_into = models.OneToOneField('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='reopened_from')

class Bid(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='bids')
    user = models.ForeignKey('user.User', on_delete=models.CASCADE, related_name='bids')
    price = models.DecimalField(max_digits=25, decimal_places=2)
    bid_time = models.DateTimeField()

    class Meta:
        ordering = ['-price', 'bid_time']

    def __str__(self):
        return f"{self.user} - {self.price} em {self.auction_id}"