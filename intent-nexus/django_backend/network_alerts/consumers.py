
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import NetworkAlert
from .serializers import NetworkAlertSerializer

class AlertConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add('alerts', self.channel_name)
        await self.accept()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard('alerts', self.channel_name)
    
    async def alert_message(self, event):
        await self.send(text_data=json.dumps(event['message']))
