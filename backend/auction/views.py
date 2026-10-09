from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import Auction, Bid, PricingMode
from .serializers import (
    AuctionListSerializer,
    AuctionSerializer,
    CreateAuctionSerializer,
    BidSerializer,
    BidPublicSerializer,
    PlaceBidSerializer,
)
from .services import place_bid, create_auction
from team.portfolio_services import maybe_finalize_user_auction
from common.models import Status

class AuctionViewSet(viewsets.ModelViewSet):
    queryset = Auction.objects.select_related("product", "product__player", "seller").prefetch_related("product__images")
    serializer_class = AuctionSerializer

    def get_permissions(self):
        # Qualquer usuário autenticado pode LER leilões (participar do leilão
        # exige ver a lista/detalhe). Criar, editar ou apagar um leilão é
        # decisão de administração da plataforma (Cláusula 2.1.2 do contrato:
        # "Painel administrativo para criação de campanhas..."), então fica
        # restrito a is_staff — mesmo padrão já usado em ProductViewSet.
        if self.action in ['list', 'retrieve']:
            classes = [AllowAny]
        else:
            classes = [IsAdminUser]
        return [perm() for perm in classes]

    def get_serializer_class(self):
        # Criar um leilão usa um shape diferente de ler um leilão: o cliente
        # informa o lance mínimo inicial e a duração, não os campos de tempo.
        if self.action == 'create':
            return CreateAuctionSerializer
        if self.action == 'list':
            return AuctionListSerializer
        return AuctionSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        maybe_finalize_user_auction(instance)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        expired = Auction.objects.filter(status=Status.OPEN, time_ending__lte=timezone.now())[:50]
        for auction in expired:
            maybe_finalize_user_auction(auction)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        # Sobrescrevemos o create() inteiro (em vez de só perform_create)
        # porque o serializer de ENTRADA (CreateAuctionSerializer) não tem
        # os mesmos campos do model — então ele não serve pra montar a
        # resposta. Quem monta a resposta é o AuctionSerializer.
        input_serializer = self.get_serializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data

        auction = create_auction(
            product=data['product'],
            pricing_mode=PricingMode.MANUAL,
            duration_minutes=data['duration_minutes'],
            manual_price=data['starting_price'],
            min_increment=data.get('min_increment', 1),
        )

        output_serializer = AuctionSerializer(auction, context=self.get_serializer_context())
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class AuctionBidsView(generics.ListCreateAPIView):
    """
    GET  /api/v1/auctions/<auction_id>/bids/  -> histórico público de lances
         deste leilão (de todos os participantes, não só do usuário logado).
    POST /api/v1/auctions/<auction_id>/bids/  -> registra um novo lance neste
         leilão (o auction vem da URL, não do corpo da requisição).
    """
    def get_permissions(self):
        # GET é público (qualquer um vê o histórico de lances). POST exige
        # login: dar lance sem estar autenticado não faz sentido, e o
        # place_bid() precisa de um user de verdade (não AnonymousUser).
        if self.request.method == 'POST':
            classes = [IsAuthenticated]
        else:
            classes = [AllowAny]
        return [perm() for perm in classes]

    def get_serializer_class(self):
        return PlaceBidSerializer if self.request.method == 'POST' else BidPublicSerializer

    def get_queryset(self):
        return (
            Bid.objects
            .filter(auction_id=self.kwargs['auction_id'])
            .select_related('user')
            .order_by('-price', 'bid_time')
        )

    def perform_create(self, serializer):
        auction = get_object_or_404(Auction, pk=self.kwargs['auction_id'])
        price = serializer.validated_data['price']

        try:
            bid = place_bid(
                user=self.request.user,
                auction=auction,
                price=price
            )
        except DjangoValidationError as e:
            raise DRFValidationError(str(e))

        serializer.instance = bid