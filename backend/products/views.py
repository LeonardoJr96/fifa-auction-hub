from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAdminUser

from .models import Product
from .serializers import ProductListSerializer, ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = Product.objects.select_related("player").prefetch_related("images")
        if self.action == "list":
            return queryset.order_by("-date_posted")
        return queryset

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