from __future__ import annotations

import gzip
import os
import re
import shutil
from datetime import date
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import serializers
from django.core.management import call_command

from fifa_data.models import Player

TEST_USER_LINE = re.compile(
    r"^(?P<username>\S+)\s*\|\s*(?P<email>\S+)\s*\|\s*(?P<password>\S+)\s*$"
)


def resolve_seed_dir(seed_dir: str | Path | None = None) -> Path:
    if seed_dir:
        return Path(seed_dir)
    return Path(os.environ.get("SEED_DIR", settings.BASE_DIR.parent / "setups" / "seed"))


def resolve_test_users_file(seed_dir: Path) -> Path | None:
    candidates = [
        seed_dir.parent / "test-users.txt",
        settings.BASE_DIR.parent / "setups" / "test-users.txt",
        seed_dir.parent / "test-users.example.txt",
        settings.BASE_DIR.parent / "setups" / "test-users.example.txt",
        seed_dir / "test-users.txt",
    ]
    for path in candidates:
        if path.is_file():
            return path
    return None


def parse_test_users(path: Path) -> list[dict[str, str]]:
    users: list[dict[str, str]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        match = TEST_USER_LINE.match(stripped)
        if not match:
            continue
        users.append(match.groupdict())
    return users


def _default_cpf(index: int) -> str:
    return f"{index:011d}"


def seed_test_users(seed_dir: Path | None = None, *, force: bool = False) -> int:
    User = get_user_model()
    users_file = resolve_test_users_file(resolve_seed_dir(seed_dir))
    if users_file is None:
        return 0

    created = 0
    for index, entry in enumerate(parse_test_users(users_file), start=1):
        username = entry["username"]
        if User.objects.filter(username=username).exists() and not force:
            continue

        if force:
            User.objects.filter(username=username).delete()

        User.objects.create_user(
            username=username,
            email=entry["email"],
            password=entry["password"],
            cpf=_default_cpf(index),
            cellphone="11999990000",
            address="Rua de Teste, 100",
            town="São Paulo",
            post_code="01000-000",
            country="Brasil",
            birth_date=date(1995, 1, 1),
            balance=1000,
        )
        created += 1
    return created


def load_fifa_fixture(seed_dir: Path) -> bool:
    fixture = seed_dir / "fifa_data.json.gz"
    if not fixture.is_file():
        return False

    call_command("loaddata", str(fixture), verbosity=0)
    return True


def sync_seed_media(seed_dir: Path, *, overwrite: bool = False) -> int:
    source_root = seed_dir / "media"
    if not source_root.is_dir():
        return 0

    copied = 0
    for src in source_root.rglob("*"):
        if not src.is_file():
            continue
        relative = src.relative_to(source_root)
        dest = Path(settings.MEDIA_ROOT) / relative
        if dest.exists() and not overwrite:
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        copied += 1
    return copied


def export_fifa_fixture(seed_dir: Path) -> int:
    seed_dir.mkdir(parents=True, exist_ok=True)
    fixture = seed_dir / "fifa_data.json.gz"

    app_config = apps.get_app_config("fifa_data")
    objects = []
    for model in app_config.get_models():
        objects.extend(model.objects.iterator())

    payload = serializers.serialize(
        "json",
        objects,
        indent=2,
        use_natural_foreign_keys=True,
        use_natural_primary_keys=True,
    )
    with gzip.open(fixture, "wt", encoding="utf-8") as dest:
        dest.write(payload)
    return len(objects)


def export_referenced_media(seed_dir: Path) -> int:
    target_root = seed_dir / "media"
    target_root.mkdir(parents=True, exist_ok=True)
    copied = 0

    for photo_name in (
        Player.objects.exclude(photo="")
        .exclude(photo__isnull=True)
        .values_list("photo", flat=True)
        .distinct()
    ):
        src = Path(settings.MEDIA_ROOT) / photo_name
        if not src.is_file():
            continue
        dest = target_root / photo_name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        copied += 1
    return copied


def is_database_seeded() -> bool:
    return Player.objects.exists()
