from django.db.models import Q
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAdminUser

from .models import Product
from .serializers import ProductListSerializer, ProductSerializer


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = Product.objects.select_related("player").prefetch_related("images")
        if self.action != "list":
            return queryset

        params = self.request.query_params

        # 1. Busca por nome do jogador / título
        search = params.get("search") or params.get("q")
        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(player__common_name__icontains=search)
                | Q(player__first_name__icontains=search)
                | Q(player__last_name__icontains=search)
            )

        # 2. Posição / Categoria
        position = params.get("position") or params.get("category")
        if position:
            position = position.strip()
            queryset = queryset.filter(
                Q(category__iexact=position)
                | Q(player__best_position__iexact=position)
                | Q(player__positions__icontains=position)
            )

        # 3. Overall
        min_overall = params.get("minOverall") or params.get("min_overall")
        if min_overall:
            try:
                queryset = queryset.filter(player__overall_rating__gte=int(min_overall))
            except (ValueError, TypeError):
                pass

        max_overall = params.get("maxOverall") or params.get("max_overall")
        if max_overall:
            try:
                queryset = queryset.filter(player__overall_rating__lte=int(max_overall))
            except (ValueError, TypeError):
                pass

        # 4. Potencial
        min_potential = params.get("minPotential") or params.get("min_potential")
        if min_potential:
            try:
                queryset = queryset.filter(player__potential__gte=int(min_potential))
            except (ValueError, TypeError):
                pass

        # 5. Idade
        min_age = params.get("minAge") or params.get("min_age")
        if min_age:
            try:
                queryset = queryset.filter(player__age__gte=int(min_age))
            except (ValueError, TypeError):
                pass

        max_age = params.get("maxAge") or params.get("max_age")
        if max_age:
            try:
                queryset = queryset.filter(player__age__lte=int(max_age))
            except (ValueError, TypeError):
                pass

        # 6. Pé preferido (1=Destro, 2=Canhoto)
        foot = params.get("foot")
        if foot:
            try:
                queryset = queryset.filter(player__foot=int(foot))
            except (ValueError, TypeError):
                pass

        # 7. Preço máximo
        max_price = params.get("maxPrice") or params.get("max_price")
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except (ValueError, TypeError):
                pass

        # 8. Ordenação
        sort = params.get("sort") or params.get("ordering")
        sort_map = {
            "name": ("player__common_name", "title"),
            "overall_desc": ("-player__overall_rating", "-id"),
            "overall_asc": ("player__overall_rating", "id"),
            "price_desc": ("-price", "-id"),
            "price_asc": ("price", "id"),
            "potential_desc": ("-player__potential", "-id"),
            "age_asc": ("player__age", "id"),
            "age_desc": ("-player__age", "-id"),
        }
        if sort in sort_map:
            return queryset.order_by(*sort_map[sort])

        return queryset.order_by("-date_posted", "-id")

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        return ProductSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [perm() for perm in permission_classes]