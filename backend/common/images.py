"""Utilitários de imagem — conversão PNG/JPEG → WebP e paths canônicos."""

from __future__ import annotations

import io
import re
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image

WEBP_QUALITY = 85
FIFA_ID_STEM = re.compile(r"^(\d+)")


def bytes_to_webp(data: bytes, *, quality: int = WEBP_QUALITY) -> bytes:
    with Image.open(io.BytesIO(data)) as image:
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")
        buffer = io.BytesIO()
        image.save(buffer, format="WEBP", quality=quality, method=6)
        return buffer.getvalue()


def content_file_to_webp(content_file, stem: str, *, quality: int = WEBP_QUALITY) -> ContentFile:
    raw = content_file.read()
    if hasattr(content_file, "seek"):
        content_file.seek(0)
    return ContentFile(bytes_to_webp(raw, quality=quality), name=f"{stem}.webp")


def canonical_webp_path(upload_to: str, stem: str) -> str:
    folder = upload_to.strip("/").replace("\\", "/")
    safe_stem = str(stem).strip().replace("/", "_")
    return f"{folder}/{safe_stem}.webp"


def fifa_id_from_filename(filename: str) -> str | None:
    stem = Path(filename).stem
    match = FIFA_ID_STEM.match(stem)
    return match.group(1) if match else None


def normalize_imagefield_to_webp(
    instance,
    field_name: str,
    *,
    stem: str,
    upload_to: str,
    quality: int = WEBP_QUALITY,
) -> bool:
    """Converte ImageField para `{upload_to}/{stem}.webp` e apaga o arquivo anterior."""
    field_file = getattr(instance, field_name)
    if not field_file:
        return False

    target_path = canonical_webp_path(upload_to, stem)
    if field_file.name == target_path and target_path.lower().endswith(".webp"):
        return False

    if field_file._committed:
        if not default_storage.exists(field_file.name):
            return False
        with field_file.open("rb") as handle:
            raw = handle.read()
    else:
        field_file.seek(0)
        raw = field_file.read()
        field_file.seek(0)

    if not raw:
        return False

    webp_bytes = bytes_to_webp(raw, quality=quality)
    old_name = field_file.name if field_file._committed else None

    if default_storage.exists(target_path):
        default_storage.delete(target_path)

    saved_path = default_storage.save(target_path, ContentFile(webp_bytes))
    setattr(instance, field_name, saved_path)

    if old_name and old_name != saved_path and default_storage.exists(old_name):
        default_storage.delete(old_name)

    return True


def convert_path_to_webp(relative_path: str, *, target_path: str | None = None, delete_source: bool = True) -> str:
    """Converte arquivo já salvo no storage. Retorna o path WebP final."""
    if not relative_path or relative_path.lower().endswith(".webp"):
        return relative_path

    if not default_storage.exists(relative_path):
        return relative_path

    with default_storage.open(relative_path, "rb") as handle:
        webp_bytes = bytes_to_webp(handle.read())

    destination = target_path or str(Path(relative_path).with_suffix(".webp"))
    if default_storage.exists(destination):
        default_storage.delete(destination)

    saved = default_storage.save(destination, ContentFile(webp_bytes))

    if delete_source and saved != relative_path and default_storage.exists(relative_path):
        default_storage.delete(relative_path)

    return saved


def purge_unreferenced_files(upload_to: str, referenced: set[str], *, dry_run: bool = False) -> int:
    """Remove arquivos em `upload_to/` que não estão no conjunto `referenced`."""
    folder = upload_to.strip("/")
    try:
        _, filenames = default_storage.listdir(folder)
    except FileNotFoundError:
        return 0

    removed = 0
    for filename in filenames:
        relative = f"{folder}/{filename}"
        if relative in referenced:
            continue
        if not dry_run:
            default_storage.delete(relative)
        removed += 1
    return removed
