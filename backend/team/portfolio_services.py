from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from auction.models import Auction, PricingMode
from auction.services import close_auction, create_auction
from common.models import Status
from fifa_data.models import Player
from payment.models import Transaction, TransactionStatus, TransactionType
from products.models import Product

from .models import PortfolioListing, PortfolioListingStatus, PortfolioListingType, TacticSlot
from .services import get_or_create_team


def _require_global_owner(user, player: Player):
    team = get_or_create_team(user, campaign=None)
    if not team.roster_entries.filter(player=player).exists():
        raise ValidationError("Este jogador não está na sua bolsa.")
    return team


def _ensure_not_listed(player: Player):
    if PortfolioListing.objects.filter(player=player, is_active=True).exists():
        raise ValidationError("Este jogador já está à venda.")


def _ensure_no_open_auction(product: Product):
    if Auction.objects.filter(product=product, status=Status.OPEN).exists():
        raise ValidationError("Já existe um leilão aberto para este jogador.")


def _remove_from_lineup(team, player: Player):
    TacticSlot.objects.filter(team=team, player=player).update(player=None)


def _lock_player_for_sale(team, player: Player):
    _remove_from_lineup(team, player)
    team.roster_entries.filter(player=player).delete()


def _restore_player_to_seller(seller, player: Player):
    team = get_or_create_team(seller, campaign=None)
    team.roster_entries.get_or_create(player=player)


def _get_product_for_player(player: Player) -> Product:
    product, _ = Product.objects.get_or_create(
        player=player,
        defaults={
            "title": player.common_name or str(player.fifa_id),
            "description": f"Jogador {player.common_name or player.fifa_id}",
            "price": player.price or Decimal("0"),
        },
    )
    return product


def list_player_for_auction(
    user,
    player: Player,
    *,
    price: Decimal,
    duration_minutes: int = 60,
    min_increment: Decimal = Decimal("1"),
):
    if price <= 0:
        raise ValidationError("O preço inicial deve ser positivo.")

    with transaction.atomic():
        team = _require_global_owner(user, player)
        _ensure_not_listed(player)
        product = _get_product_for_player(player)
        _ensure_no_open_auction(product)

        _lock_player_for_sale(team, player)

        auction = create_auction(
            product=product,
            pricing_mode=PricingMode.MANUAL,
            duration_minutes=duration_minutes,
            manual_price=price,
            min_increment=min_increment,
        )
        auction.seller = user
        auction.save(update_fields=["seller"])

        listing = PortfolioListing.objects.create(
            seller=user,
            player=player,
            listing_type=PortfolioListingType.AUCTION,
            price=price,
            auction=auction,
            status=PortfolioListingStatus.ACTIVE,
            is_active=True,
        )

    return listing


def offer_direct_sale(user, player: Player, buyer, price: Decimal):
    if buyer.id == user.id:
        raise ValidationError("Você não pode vender para si mesmo.")
    if price <= 0:
        raise ValidationError("O preço deve ser positivo.")

    with transaction.atomic():
        team = _require_global_owner(user, player)
        _ensure_not_listed(player)

        _lock_player_for_sale(team, player)

        listing = PortfolioListing.objects.create(
            seller=user,
            player=player,
            listing_type=PortfolioListingType.DIRECT,
            price=price,
            buyer=buyer,
            status=PortfolioListingStatus.PENDING,
            is_active=True,
        )

    return listing


def accept_direct_sale(buyer, listing_id: int):
    with transaction.atomic():
        listing = PortfolioListing.objects.select_for_update().get(pk=listing_id)

        if listing.listing_type != PortfolioListingType.DIRECT:
            raise ValidationError("Esta listagem não é uma venda direta.")
        if not listing.is_active or listing.status != PortfolioListingStatus.PENDING:
            raise ValidationError("Esta oferta não está mais disponível.")
        if listing.buyer_id != buyer.id:
            raise ValidationError("Esta oferta não foi feita para você.")

        seller = listing.seller.__class__.objects.select_for_update().get(pk=listing.seller_id)
        locked_buyer = buyer.__class__.objects.select_for_update().get(pk=buyer.pk)
        charge = listing.price

        if locked_buyer.balance < charge:
            Transaction.objects.create(
                user=locked_buyer,
                type=TransactionType.DIRECT_PURCHASE,
                status=TransactionStatus.FAILED,
                amount=charge,
                balance_after=locked_buyer.balance,
                notes=f"Saldo insuficiente para compra de {listing.player_id}",
            )
            raise ValidationError("Saldo insuficiente.")

        locked_buyer.balance -= charge
        locked_buyer.save(update_fields=["balance"])

        seller.balance += charge
        seller.save(update_fields=["balance"])

        buyer_team = get_or_create_team(locked_buyer, campaign=None)
        buyer_team.roster_entries.get_or_create(player=listing.player)

        Transaction.objects.create(
            user=locked_buyer,
            type=TransactionType.DIRECT_PURCHASE,
            status=TransactionStatus.COMPLETED,
            amount=charge,
            balance_after=locked_buyer.balance,
            notes=f"Compra direta: jogador {listing.player_id} de {seller.username}",
        )
        Transaction.objects.create(
            user=seller,
            type=TransactionType.DIRECT_PURCHASE,
            status=TransactionStatus.COMPLETED,
            amount=charge,
            balance_after=seller.balance,
            notes=f"Venda direta: jogador {listing.player_id} para {locked_buyer.username}",
        )

        listing.status = PortfolioListingStatus.SOLD
        listing.is_active = False
        listing.save(update_fields=["status", "is_active", "updated_at"])

    return listing


def cancel_listing(user, listing_id: int):
    with transaction.atomic():
        listing = PortfolioListing.objects.select_for_update().get(pk=listing_id)

        if listing.seller_id != user.id:
            raise ValidationError("Você não pode cancelar esta listagem.")
        if not listing.is_active:
            raise ValidationError("Esta listagem já foi encerrada.")

        if listing.listing_type == PortfolioListingType.AUCTION and listing.auction_id:
            auction = Auction.objects.select_for_update().get(pk=listing.auction_id)
            if auction.status == Status.OPEN:
                auction.status = Status.CLOSE
                auction.time_ending = timezone.now()
                auction.save(update_fields=["status", "time_ending"])
            elif auction.status == Status.PENDING:
                raise ValidationError("Não é possível cancelar: há um vencedor aguardando pagamento.")

        listing.status = PortfolioListingStatus.CANCELLED
        listing.is_active = False
        listing.save(update_fields=["status", "is_active", "updated_at"])

        _restore_player_to_seller(user, listing.player)

    return listing


def restore_player_after_failed_auction(auction: Auction):
    """Devolve o jogador ao vendedor quando o leilão P2P termina sem vencedor."""
    listing = (
        PortfolioListing.objects.filter(auction=auction, is_active=True)
        .select_related("seller", "player")
        .first()
    )
    if listing is None:
        return

    with transaction.atomic():
        listing = PortfolioListing.objects.select_for_update().get(pk=listing.pk)
        if not listing.is_active:
            return
        listing.status = PortfolioListingStatus.CANCELLED
        listing.is_active = False
        listing.save(update_fields=["status", "is_active", "updated_at"])
        _restore_player_to_seller(listing.seller, listing.player)


def complete_auction_sale(auction: Auction, buyer, amount: Decimal):
    """Finaliza revenda P2P após pagamento do vencedor do leilão."""
    listing = (
        PortfolioListing.objects.filter(auction=auction, is_active=True)
        .select_related("seller", "player")
        .first()
    )
    if listing is None:
        return

    with transaction.atomic():
        listing = PortfolioListing.objects.select_for_update().get(pk=listing.pk)
        if not listing.is_active:
            return

        seller = listing.seller.__class__.objects.select_for_update().get(pk=listing.seller_id)
        seller.balance += amount
        seller.save(update_fields=["balance"])

        buyer_team = get_or_create_team(buyer, campaign=None)
        buyer_team.roster_entries.get_or_create(player=listing.player)

        Transaction.objects.create(
            user=seller,
            type=TransactionType.DIRECT_PURCHASE,
            status=TransactionStatus.COMPLETED,
            amount=amount,
            balance_after=seller.balance,
            notes=f"Venda em leilão #{auction.id}: jogador {listing.player_id}",
        )

        listing.status = PortfolioListingStatus.SOLD
        listing.is_active = False
        listing.save(update_fields=["status", "is_active", "updated_at"])


def get_portfolio(user):
    team = get_or_create_team(user, campaign=None)
    players = [entry.player for entry in team.roster_entries.select_related("player").all()]
    my_listings = (
        PortfolioListing.objects.filter(seller=user, is_active=True)
        .select_related("player", "buyer", "auction")
        .order_by("-created_at")
    )
    incoming_offers = (
        PortfolioListing.objects.filter(
            buyer=user,
            listing_type=PortfolioListingType.DIRECT,
            is_active=True,
            status=PortfolioListingStatus.PENDING,
        )
        .select_related("player", "seller")
        .order_by("-created_at")
    )
    return {
        "players": players,
        "my_listings": list(my_listings),
        "incoming_offers": list(incoming_offers),
    }


def maybe_finalize_user_auction(auction: Auction):
    """Fecha leilão expirado e restaura jogador se não houver vencedor."""
    if auction.status != Status.OPEN or auction.time_ending > timezone.now():
        return auction

    close_auction(auction)
    if auction.seller_id and auction.status in {Status.NO_WINNER, Status.CLOSE}:
        restore_player_after_failed_auction(auction)
    return auction
