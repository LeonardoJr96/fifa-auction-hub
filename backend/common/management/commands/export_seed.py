from django.core.management.base import BaseCommand

from common.seed import export_fifa_fixture, export_referenced_media, resolve_seed_dir


class Command(BaseCommand):
    help = "Exporta jogadores e fotos referenciadas para setups/seed (usar antes do deploy Docker)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--seed-dir",
            default=None,
            help="Destino do export (padrão: SEED_DIR ou setups/seed)",
        )
        parser.add_argument(
            "--skip-players",
            action="store_true",
            help="Não exporta o fixture JSON dos jogadores",
        )
        parser.add_argument(
            "--skip-media",
            action="store_true",
            help="Não copia fotos referenciadas no banco",
        )

    def handle(self, *args, **options):
        seed_dir = resolve_seed_dir(options["seed_dir"])
        seed_dir.mkdir(parents=True, exist_ok=True)
        self.stdout.write(f"Exportando para: {seed_dir}")

        if not options["skip_players"]:
            count = export_fifa_fixture(seed_dir)
            self.stdout.write(self.style.SUCCESS(f"Fixture exportado: {count} registros"))

        if not options["skip_media"]:
            copied = export_referenced_media(seed_dir)
            self.stdout.write(self.style.SUCCESS(f"Fotos exportadas: {copied}"))

        self.stdout.write(self.style.SUCCESS("Export concluído."))
