"""
Converte imagens de media para WebP, normaliza nomes e remove duplicatas órfãs.

Uso:
    python manage.py optimize_media
    python manage.py optimize_media --dry-run
    python manage.py optimize_media --purge-only
"""

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from common.images import (
    canonical_webp_path,
    convert_path_to_webp,
    fifa_id_from_filename,
    normalize_imagefield_to_webp,
    purge_unreferenced_files,
)
from fifa_data.models import Player
from products.models import ProductImage


class Command(BaseCommand):
    help = "Converte PNG/JPEG em WebP, padroniza nomes e remove arquivos duplicados/órfãos."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Simula sem alterar arquivos")
        parser.add_argument(
            "--purge-only",
            action="store_true",
            help="Só remove arquivos não referenciados no banco",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        purge_only = options["purge_only"]

        if dry_run:
            self.stdout.write(self.style.WARNING("Modo dry-run — nenhuma alteração será salva."))

        referenced = set()

        if not purge_only:
            referenced |= self._sync_player_photos(dry_run)
            referenced |= self._sync_product_images(dry_run)

        referenced |= self._collect_referenced_from_db()
        removed_players = self._purge_folder("player_photos", referenced, dry_run)
        removed_products = self._purge_folder("product_images", referenced, dry_run)
        deduped = self._dedupe_by_fifa_id("player_photos", dry_run)

        self.stdout.write(
            self.style.SUCCESS(
                f"Concluído. Referenciados: {len(referenced)} | "
                f"Removidos player_photos: {removed_players} | "
                f"Removidos product_images: {removed_products} | "
                f"Dedup por fifa_id: {deduped}"
            )
        )

    def _sync_player_photos(self, dry_run: bool) -> set[str]:
        referenced: set[str] = set()
        qs = Player.objects.exclude(photo="").exclude(photo__isnull=True)
        total = qs.count()
        self.stdout.write(f"Jogadores com foto: {total}")

        for index, player in enumerate(qs.iterator(), start=1):
            target = canonical_webp_path("player_photos", player.fifa_id)
            referenced.add(target)

            if dry_run:
                continue

            changed = normalize_imagefield_to_webp(
                player,
                "photo",
                stem=str(player.fifa_id),
                upload_to="player_photos",
            )
            if changed or player.photo.name != target:
                player.photo.name = target
                player.save(update_fields=["photo"])
            referenced.add(player.photo.name)

            if index % 500 == 0:
                self.stdout.write(f"  players {index}/{total}")

        return referenced

    def _sync_product_images(self, dry_run: bool) -> set[str]:
        referenced: set[str] = set()
        qs = ProductImage.objects.select_related("product").all()
        total = qs.count()
        self.stdout.write(f"Imagens de produto: {total}")

        for index, product_image in enumerate(qs.iterator(), start=1):
            stem = f"{product_image.product_id}_{product_image.id}"
            target = canonical_webp_path("product_images", stem)
            referenced.add(target)

            if dry_run:
                continue

            changed = normalize_imagefield_to_webp(
                product_image,
                "image",
                stem=stem,
                upload_to="product_images",
            )
            if changed or product_image.image.name != target:
                product_image.image.name = target
                product_image.save(update_fields=["image"])
            referenced.add(product_image.image.name)

            if index % 500 == 0:
                self.stdout.write(f"  products {index}/{total}")

        return referenced

    def _collect_referenced_from_db(self) -> set[str]:
        referenced: set[str] = set()
        for name in Player.objects.exclude(photo="").exclude(photo__isnull=True).values_list("photo", flat=True):
            if name:
                referenced.add(name)
        for name in ProductImage.objects.values_list("image", flat=True):
            if name:
                referenced.add(name)
        return referenced

    def _purge_folder(self, folder: str, referenced: set[str], dry_run: bool) -> int:
        if dry_run:
            media_dir = Path(settings.MEDIA_ROOT) / folder
            if not media_dir.exists():
                return 0
            return sum(
                1 for path in media_dir.iterdir() if path.is_file() and f"{folder}/{path.name}" not in referenced
            )
        return purge_unreferenced_files(folder, referenced)

    def _dedupe_by_fifa_id(self, folder: str, dry_run: bool) -> int:
        """
        Agrupa arquivos por fifa_id numérico (ex.: 259751.png, 259751_abc.png)
        e mantém só `{fifa_id}.webp`, removendo o restante do grupo.
        """
        media_dir = Path(settings.MEDIA_ROOT) / folder
        if not media_dir.exists():
            return 0

        groups: dict[str, list[Path]] = {}
        for path in media_dir.iterdir():
            if not path.is_file():
                continue
            fifa_id = fifa_id_from_filename(path.name)
            if not fifa_id:
                continue
            groups.setdefault(fifa_id, []).append(path)

        removed = 0
        for fifa_id, paths in groups.items():
            canonical = media_dir / f"{fifa_id}.webp"
            if not canonical.exists():
                source = max(paths, key=lambda item: item.stat().st_size)
                if not dry_run:
                    convert_path_to_webp(
                        f"{folder}/{source.name}",
                        target_path=f"{folder}/{fifa_id}.webp",
                        delete_source=True,
                    )
                removed += len(paths) - 1
                continue

            for path in paths:
                if path.name == canonical.name:
                    continue
                if not dry_run:
                    path.unlink(missing_ok=True)
                removed += 1

        return removed
