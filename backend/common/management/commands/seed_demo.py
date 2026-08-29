from django.core.management.base import BaseCommand

from common.seed import (
    is_database_seeded,
    load_fifa_fixture,
    resolve_seed_dir,
    seed_test_users,
    sync_seed_media,
)


class Command(BaseCommand):
    help = "Carrega usuários de teste, jogadores e fotos do diretório setups/seed (Docker)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--seed-dir",
            default=None,
            help="Diretório com fifa_data.json.gz e media/ (padrão: SEED_DIR ou setups/seed)",
        )
        parser.add_argument(
            "--if-empty",
            action="store_true",
            help="Só importa jogadores se o banco ainda não tiver nenhum Player",
        )
        parser.add_argument(
            "--skip-users",
            action="store_true",
            help="Não recria os 10 usuários de teste",
        )
        parser.add_argument(
            "--skip-players",
            action="store_true",
            help="Não importa o fixture de jogadores",
        )
        parser.add_argument(
            "--skip-media",
            action="store_true",
            help="Não copia fotos para MEDIA_ROOT",
        )
        parser.add_argument(
            "--force-users",
            action="store_true",
            help="Recria usuários de teste que já existem",
        )

    def handle(self, *args, **options):
        seed_dir = resolve_seed_dir(options["seed_dir"])
        self.stdout.write(f"Seed dir: {seed_dir}")

        if not options["skip_users"]:
            created = seed_test_users(seed_dir, force=options["force_users"])
            self.stdout.write(self.style.SUCCESS(f"Usuários de teste criados: {created}"))

        if not options["skip_players"]:
            if options["if_empty"] and is_database_seeded():
                self.stdout.write("Jogadores já existem — pulando importação (--if-empty).")
            elif load_fifa_fixture(seed_dir):
                self.stdout.write(self.style.SUCCESS("Fixture fifa_data importado."))
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Fixture não encontrado em {seed_dir / 'fifa_data.json.gz'}. "
                        "Rode setups/export-seed.sh no ambiente local primeiro."
                    )
                )

        if not options["skip_media"]:
            copied = sync_seed_media(seed_dir)
            self.stdout.write(self.style.SUCCESS(f"Fotos copiadas para media: {copied}"))

        self.stdout.write(self.style.SUCCESS("Seed concluído."))
