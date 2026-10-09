from rest_framework import serializers

from fifa_data.serializers import PlayerSerializer
from .models import Product, ProductImage


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'is_cover', 'order']


class ProductListSerializer(serializers.ModelSerializer):
    player = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'player', 'title', 'description', 'quantity', 'category', 'price', 'date_posted']

    def get_player(self, obj):
        player = getattr(obj, 'player', None)
        if not player:
            return None

        photo_url = getattr(player, 'photo_url', None)
        photo = getattr(player, 'photo', None)
        if photo and hasattr(photo, 'url'):
            photo_url = photo.url

        return {
            'id': player.id,
            'common_name': player.common_name,
            'age': player.age,
            'overall_rating': player.overall_rating,
            'potential': player.potential,
            'best_position': player.best_position,
            'positions': player.positions,
            'foot': player.foot,
            'photo_url': photo_url,
        }


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, required=False)
    image = serializers.ImageField(write_only=True, required=False)
    player = PlayerSerializer(read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'player', 'title', 'description', 'quantity', 'category', 'price', 'date_posted', 'images', 'image']

    def create(self, validated_data):
        images_data = validated_data.pop('images', [])
        uploaded_image = validated_data.pop('image', None)
        product = Product.objects.create(**validated_data)

        if uploaded_image:
            ProductImage.objects.create(product=product, image=uploaded_image)

        for image_data in images_data:
            ProductImage.objects.create(product=product, **image_data)
        return product

    def update(self, instance, validated_data):
        images_data = validated_data.pop('images', None)
        uploaded_image = validated_data.pop('image', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if uploaded_image:
            ProductImage.objects.create(product=instance, image=uploaded_image)
        if images_data is not None:
            for image_data in images_data:
                ProductImage.objects.create(product=instance, **image_data)
        return instance