from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from common.images import canonical_webp_path, normalize_imagefield_to_webp
from fifa_data.models import Player
from products.models import ProductImage


@receiver(pre_save, sender=Player)
def player_photo_to_webp(sender, instance: Player, **kwargs):
    if not instance.photo or not instance.fifa_id:
        return
    normalize_imagefield_to_webp(
        instance,
        "photo",
        stem=str(instance.fifa_id),
        upload_to="player_photos",
    )


@receiver(post_save, sender=ProductImage)
def product_image_to_webp(sender, instance: ProductImage, **kwargs):
    if not instance.image or not instance.product_id:
        return
    target = canonical_webp_path("product_images", f"{instance.product_id}_{instance.id}")
    if instance.image.name == target:
        return
    if normalize_imagefield_to_webp(
        instance,
        "image",
        stem=f"{instance.product_id}_{instance.id}",
        upload_to="product_images",
    ):
        ProductImage.objects.filter(pk=instance.pk).update(image=instance.image.name)
