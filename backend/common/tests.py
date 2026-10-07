from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from common.images import normalize_imagefield_to_webp


class ImageNormalizationTests(SimpleTestCase):
    @patch("common.images.default_storage.exists", return_value=False)
    def test_skips_normalization_when_committed_image_is_missing(self, storage_exists):
        missing_path = "player_photos/70448_Awd2XZJ.png"
        player = SimpleNamespace(
            photo=SimpleNamespace(name=missing_path, _committed=True),
        )

        result = normalize_imagefield_to_webp(
            player,
            "photo",
            stem="70448",
            upload_to="player_photos",
        )

        self.assertFalse(result)
        storage_exists.assert_called_once_with(missing_path)
