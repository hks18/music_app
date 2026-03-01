from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Room, RoomMember
from .serializers import RoomSerializer, PlaybackStateSerializer


def get_or_create_session(request):
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key


@method_decorator(csrf_exempt, name='dispatch')
class CreateRoomView(APIView):
    """
    POST /api/rooms/create/
    Creates a room with a random 6-char code. Creator becomes host.
    """
    authentication_classes = []

    def post(self, request):
        session_key = get_or_create_session(request)
        room = Room.objects.create(host_session_key=session_key)
        RoomMember.objects.get_or_create(
            room=room, session_key=session_key, defaults={'is_active': True}
        )
        serializer = RoomSerializer(room, context={'request': request})
        return Response({
            'message': 'Room created successfully',
            'room': serializer.data,
            'host_session_key': session_key # Return to host for header-auth
        }, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class JoinRoomView(APIView):
    """
    POST /api/rooms/join/
    Body: { "code": "ABC123" }
    """
    authentication_classes = []

    def post(self, request):
        session_key = get_or_create_session(request)
        code = request.data.get('code', '').upper().strip()
        if not code:
            return Response({'error': 'Room code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        room = get_object_or_404(Room, code=code, is_active=True)
        member, created = RoomMember.objects.get_or_create(
            room=room, session_key=session_key, defaults={'is_active': True}
        )
        if not created:
            member.is_active = True
            member.save()

        member_count = room.members.filter(is_active=True).count()

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'room_{room.code}',
            {'type': 'member_joined', 'member_count': member_count, 'session_key': session_key[:8] + '...'}
        )

        serializer = RoomSerializer(room, context={'request': request})
        return Response({'message': 'Joined room successfully', 'room': serializer.data})


@method_decorator(csrf_exempt, name='dispatch')
class LeaveRoomView(APIView):
    """POST /api/rooms/<code>/leave/"""
    authentication_classes = []

    def post(self, request, code):
        session_key = get_or_create_session(request)
        room = get_object_or_404(Room, code=code.upper(), is_active=True)
        RoomMember.objects.filter(room=room, session_key=session_key).update(is_active=False)
        channel_layer = get_channel_layer()

        if room.host_session_key == session_key:
            room.is_active = False
            room.save()
            async_to_sync(channel_layer.group_send)(
                f'room_{room.code}',
                {'type': 'room_closed', 'message': 'Host left. Room has been closed.'}
            )
            return Response({'message': 'Room closed as you were the host.'})

        member_count = room.members.filter(is_active=True).count()
        async_to_sync(channel_layer.group_send)(
            f'room_{room.code}', {'type': 'member_left', 'member_count': member_count}
        )
        return Response({'message': 'Left room successfully.'})


class RoomDetailView(APIView):
    """GET /api/rooms/<code>/"""
    def get(self, request, code):
        room = get_object_or_404(Room, code=code.upper(), is_active=True)
        serializer = RoomSerializer(room, context={'request': request})
        return Response(serializer.data)


@method_decorator(csrf_exempt, name='dispatch')
class UpdatePlaybackView(APIView):
    """
    POST /api/rooms/<code>/playback/
    Host pushes YouTube video ID + playback state → broadcast to all members.

    Body:
    {
        "video_id":    "dQw4w9WgXcQ",
        "video_title": "Never Gonna Give You Up",
        "video_channel": "Rick Astley",
        "thumbnail":   "https://...",
        "is_playing":  true,
        "progress_ms": 12000,
        "duration_ms": 213000
    }
    """
    authentication_classes = []

    def post(self, request, code):
        room = get_object_or_404(Room, code=code.upper(), is_active=True)

        serializer = PlaybackStateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        room.current_video_id      = data.get('video_id', room.current_video_id)
        room.current_video_title   = data.get('video_title', room.current_video_title)
        room.current_video_channel = data.get('video_channel', room.current_video_channel)
        room.current_thumbnail     = data.get('thumbnail', room.current_thumbnail)
        room.is_playing            = data.get('is_playing', room.is_playing)
        room.progress_ms           = data.get('progress_ms', room.progress_ms)
        room.duration_ms           = data.get('duration_ms', room.duration_ms)
        room.save()

        payload = {
            'type':          'playback_update',
            'video_id':      room.current_video_id,
            'video_title':   room.current_video_title,
            'video_channel': room.current_video_channel,
            'thumbnail':     room.current_thumbnail,
            'is_playing':    room.is_playing,
            'progress_ms':   room.progress_ms,
            'duration_ms':   room.duration_ms,
        }

        # Broadcast via WebSocket to all room members
        channel_layer = get_channel_layer()
        print(f"DEBUG: [UpdatePlaybackView] Broadcasting playback_update to room_{room.code}")
        try:
            async_to_sync(channel_layer.group_send)(f'room_{room.code}', payload)
            print(f"DEBUG: [UpdatePlaybackView] Broadcast success for room_{room.code}")
        except Exception as e:
            print(f"DEBUG: [UpdatePlaybackView] Broadcast FAILED for room_{room.code}: {str(e)}")

        return Response({'message': 'Playback updated and broadcast to room.'})


class RoomMembersView(APIView):
    """GET /api/rooms/<code>/members/"""
    def get(self, request, code):
        room = get_object_or_404(Room, code=code.upper(), is_active=True)
        members = room.members.filter(is_active=True)
        return Response({
            'room_code': room.code,
            'member_count': members.count(),
            'members': [
                {
                    'session_key': m.session_key[:8] + '...',
                    'joined_at': m.joined_at,
                    'is_host': m.session_key == room.host_session_key
                }
                for m in members
            ]
        })
