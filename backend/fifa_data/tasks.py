from celery import shared_task


@shared_task(name="fifa_data.tasks.import_players_bulk_task", bind=True, max_retries=3)
def import_players_bulk_task(self, rows: list) -> dict:
    """
    Importa jogadores de forma assíncrona via Celery.

    Desacopla a escrita pesada do request HTTP: a view recebe os dados,
    enfileira a task e retorna 202 imediatamente.
    """
    try:
        from .services import import_players_bulk
        players = import_players_bulk(rows)
        return {"imported": len(players)}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
