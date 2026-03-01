import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room


class RoomConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for a music room.
    Connection URL: ws://localhost:8000/ws/room/<ROOM_CODE>/

    Messages TO client:
      current_state   — sent on connect with current YouTube video + state
      playback_update — host pushed new video/play state
      member_joined   — someone joined
      member_left     — someone left
      room_closed     — host left, room is gone
      sync_request    — asks host to re-push current state

    Messages FROM client:
      ping            — keep-alive
    """

    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code'].upper()
        self.room_group_name = f'room_{self.room_code}'
        self.session_key = self.scope['session'].session_key

        if not self.session_key:
            await self.close()
            return

        room = await self.get_room(self.room_code)
        if not room:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Send current video state immediately on connect
        await self.send(text_data=json.dumps({
            'type':          'current_state',
            'video_id':      room.current_video_id,
            'video_title':   room.current_video_title,
            'video_channel': room.current_video_channel,
            'thumbnail':     room.current_thumbnail,
            'is_playing':    room.is_playing,
            'progress_ms':   room.progress_ms,
            'duration_ms':   room.duration_ms,
        }))

        # Ask host to re-sync latest state for the new joiner
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'sync_request', 'requester': self.session_key[:8]}
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except json.JSONDecodeError:
            pass

    # ── Group message handlers ──────────────────────────────────

    async def playback_update(self, event):
        await self.send(text_data=json.dumps({
            'type':          'playback_update',
            'video_id':      event.get('video_id'),
            'video_title':   event.get('video_title'),
            'video_channel': event.get('video_channel'),
            'thumbnail':     event.get('thumbnail'),
            'is_playing':    event.get('is_playing'),
            'progress_ms':   event.get('progress_ms'),
            'duration_ms':   event.get('duration_ms'),
        }))

    async def member_joined(self, event):
        await self.send(text_data=json.dumps({
            'type':         'member_joined',
            'member_count': event.get('member_count'),
            'session_key':  event.get('session_key'),
        }))

    async def member_left(self, event):
        await self.send(text_data=json.dumps({
            'type':         'member_left',
            'member_count': event.get('member_count'),
        }))

    async def room_closed(self, event):
        await self.send(text_data=json.dumps({
            'type':    'room_closed',
            'message': event.get('message'),
        }))
        await self.close()

    async def sync_request(self, event):
        await self.send(text_data=json.dumps({
            'type':      'sync_request',
            'requester': event.get('requester'),
        }))

    # ── DB helpers ──────────────────────────────────────────────

    @database_sync_to_async
    def get_room(self, code):
        try:
            return Room.objects.get(code=code, is_active=True)
        except Room.DoesNotExist:
            return None
