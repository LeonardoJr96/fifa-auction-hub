from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.core.files.base import ContentFile
from django.test import SimpleTestCase

from fifa_data.models import Player
from fifa_data.serializers import PlayerSerializer
from fifa_data.services import fetch_photo_as_file


class PhotoBackfillTests(SimpleTestCase):
    def test_serializer_builds_data_uri_from_image_field(self):
        player = Player()
        player.photo = ContentFile(b"fake-image", name="player.png")

        serializer = PlayerSerializer(instance=player)
        result = serializer.get_photo_data_uri(player)

        self.assertEqual(result, "data:image/png;base64,ZmFrZS1pbWFnZQ==")

    @patch("fifa_data.services.urlopen")
    def test_fetch_photo_as_file_returns_content_file(self, mock_urlopen):
        mock_response = Mock()
        mock_response.read.return_value = b"photo-bytes"
        mock_urlopen.return_value.__enter__.return_value = mock_response

        result = fetch_photo_as_file("https://example.com/player.png", 123)

        self.assertIsInstance(result, ContentFile)
        self.assertEqual(result.name, "123.png")
        self.assertEqual(result.read(), b"photo-bytes")

    @patch("products.models.Product.objects.update_or_create")
    @patch("products.models.ProductImage.objects.get_or_create")
    def test_missing_player_photo_does_not_break_product_sync(
        self,
        get_or_create_image,
        update_or_create_product,
    ):
        photo = SimpleNamespace(
            name="player_photos/70448_Awd2XZJ.png",
            storage=Mock(),
        )
        photo.storage.exists.return_value = False
        player = SimpleNamespace(
            photo=photo,
            common_name="",
            first_name="Test",
            last_name="Player",
            price=0,
            positions_list=[],
        )
        update_or_create_product.return_value = (Mock(), True)

        from fifa_data.models import sync_product

        sync_product(None, player, created=True)

        get_or_create_image.assert_not_called()
