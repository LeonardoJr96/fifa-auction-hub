from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .models import Competition


class DraftConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        self.competition_id = self.scope["url_route"]["kwargs"]["competition_id"]
        if not user.is_authenticated or not await self._competition_exists():
            await self.close(code=4403)
            return
        self.group_name = f"draft_{self.competition_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def draft_event(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def _competition_exists(self):
        return Competition.objects.filter(pk=self.competition_id).exists()
