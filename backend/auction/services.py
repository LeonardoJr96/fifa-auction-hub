# auction/services.py
from datetime import timedelta
import logging

from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from redis.exceptions import RedisError

from .models import Auction, Bid, PricingMode
from common.models import Status
from user.models import User

logger = logging.getLogger(__name__)

def create_auction(product, pricing_mode, duration_minutes, manual_price=None, min_increment=1):
    """
    Cria o leilão já decidindo o preço inicial:
    - PLAYER_VALUE: usa product.price (valor de mercado do jogador)
    - MANUAL: usa o valor que o admin da sessão informou
    """
    if pricing_mode == PricingMode.MANUAL:
        if manual_price is None:
            raise ValidationError("Informe o valor inicial manual para este modo.")
        starting_price = manual_price
    else:
        starting_price = product.price

    now = timezone.now()
    return Auction.objects.create(
        product=product,
        pricing_mode=pricing_mode,
        starting_price=starting_price,
        min_increment=min_increment,
        time_starting=now,
        time_ending=now + timedelta(minutes=duration_minutes),
        status=Status.OPEN,
    )


def get_current_price(auction: Auction):
    """Preço atual = maior lance já dado, ou o preço inicial se ninguém deu lance ainda."""
    top_bid = Bid.objects.filter(auction=auction).order_by('-price', 'bid_time').first()
    return top_bid.price if top_bid else auction.starting_price

def place_bid(user, auction: Auction, price):
    """
    Registra um novo lance no leilão.
    O pagamento do valor vencedor é feito depois, com o saldo do usuário.
    """
    with transaction.atomic():
        auction = Auction.objects.select_for_update().get(pk=auction.pk)
        user = User.objects.select_for_update().get(pk=user.pk)

        if user.self_excluded_until and user.self_excluded_until > timezone.now():
            raise ValidationError(
                f"Você optou por autoexclusão até {user.self_excluded_until:%d/%m/%Y}."
            )

        if auction.status != Status.OPEN:
            raise ValidationError("Este leilão não está aberto para lances.")

        if auction.seller_id == user.id:
            raise ValidationError("Você não pode dar lance no seu próprio leilão.")

        agora = timezone.now()
        if auction.time_ending < agora:
            raise ValidationError("O leilão já terminou.")

        if user.lance_credits <= 0:
            raise ValidationError("Você não possui créditos de lance disponíveis.")

        current_price = get_current_price(auction)
        has_bids = Bid.objects.filter(auction=auction).exists()

        if not has_bids:
            if price < auction.starting_price:
                raise ValidationError(f"O lance mínimo é {auction.starting_price}.")
        else:
            minimo_seguinte = current_price + auction.min_increment
            if price < minimo_seguinte:
                raise ValidationError(f"Seu lance deve ser de pelo menos {minimo_seguinte}.")

        bid = Bid.objects.create(
            user=user,
            auction=auction,
            bid_time=agora,
            price=price,
        )
        user.lance_credits -= 1
        user.save(update_fields=["lance_credits"])
        auction.number_of_bids = Bid.objects.filter(auction=auction).count()

        # a extensão nunca ENCURTA o leilão — só garante um mínimo
        # de N segundos de janela a partir deste lance
        janela_minima = agora + timedelta(seconds=settings.AUCTION_BID_EXTENSION_SECONDS)
        if janela_minima > auction.time_ending:
            auction.time_ending = janela_minima

        auction.save(update_fields=["number_of_bids", "time_ending"])

    transaction.on_commit(lambda: _broadcast_bid(bid))
    return bid


def _broadcast_bid(bid):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    try:
        async_to_sync(channel_layer.group_send)(
            f'auction_{bid.auction_id}',
            {'type': 'bid.placed', 'payload': {
                'type': 'bid.placed', 'auction_id': bid.auction_id,
                'amount': str(bid.price), 'user': bid.user.username,
            }},
        )
    except RedisError:
        logger.warning(
            "Lance %s foi salvo, mas não foi possível publicar a atualização em tempo real: Redis indisponível.",
            bid.pk,
            exc_info=True,
        )


def get_bid_status(bid):
    """Retorna o status legível do lance para a tela de perfil."""
    auction = bid.auction
    if auction.status == Status.OPEN:
        return 'em_andamento'
    # Leilão já encerrado
    if auction.winner_id == bid.user_id:
        return 'vencedor'
    return auction.get_status_display()


def get_winning_bid(auction: Auction):
    """
    Vence quem deu o maior lance. Se o maior preço estiver empatado
    entre DOIS USUÁRIOS DIFERENTES, não há vencedor único (retorna None).
    Empate do mesmo usuário consigo mesmo não conta como ambíguo.
    """
    bids = list(Bid.objects.filter(auction=auction).order_by('-price', 'bid_time'))
    if not bids:
        return None

    top_price = bids[0].price
    empatados = [b for b in bids if b.price == top_price]
    usuarios_distintos = {b.user_id for b in empatados}

    if len(usuarios_distintos) > 1:
        return None

    return empatados[0]


def close_auction(auction: Auction):
    """
    Fecha o leilão e retorna o lance vencedor (ou None se
    não houver vencedor único).
    """
    winning_bid = get_winning_bid(auction)
    auction.time_ending = timezone.now()

    if  winning_bid is None:
        auction.status = Status.NO_WINNER
    
    else:
        auction.winner = winning_bid.user
        auction.status = Status.PENDING
        auction.payment_deadline = timezone.now() + timedelta(
            days=settings.AUCTION_PAYMENT_DEADLINE_DAYS
        )

    auction.save()


    return winning_bid

def reopen_auction(auction: Auction):
    """
    Ação do administrador: em vez de reaproveitar o mesmo registro,
    cria um NOVO Auction (novo ID), preservando o leilão expirado
    como histórico, e liga os dois via reopened_into.
    """
    if auction.status != Status.EXPIRED:
        raise ValidationError("Só é possível reabrir leilões expirados.")

    if auction.reopened_into is not None:
        raise ValidationError("Este leilão já foi reaberto anteriormente.")

    novo_auction = Auction.objects.create(
        product=auction.product,
        pricing_mode=auction.pricing_mode,
        starting_price=auction.starting_price,
        min_increment=auction.min_increment,
        time_starting=timezone.now(),
        time_ending=timezone.now() + timedelta(days=settings.AUCTION_REOPEN_EXTENSION_DAYS),
        status=Status.OPEN,
    )

    auction.reopened_into = novo_auction
    auction.save()

    return novo_auction

def expire_unpaid_auctions():
    """
    Roda periodicamente. Marca como EXPIRED os leilões cujo prazo
    de pagamento venceu. A partir daí, fica a critério do admin:
    deixar como está ou reabrir (reopen_auction).
    """
    qs = Auction.objects.filter(
        status=Status.PENDING,
        payment_deadline__lt=timezone.now(),
    )
    qs.update(status=Status.EXPIRED)
