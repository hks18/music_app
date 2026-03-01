from rest_framework import serializers
from .models import Room, RoomMember


class RoomSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    is_host      = serializers.SerializerMethodField()

    class Meta:
        model  = Room
        fields = [
            'id', 'code', 'created_at', 'is_active',
            'current_video_id', 'current_video_title',
            'current_video_channel', 'current_thumbnail',
            'is_playing', 'progress_ms', 'duration_ms',
            'member_count', 'is_host',
        ]
        read_only_fields = ['code', 'created_at']

    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()

    def get_is_host(self, obj):
        request = self.context.get('request')
        if request:
            return obj.host_session_key == request.session.session_key
        return False


class PlaybackStateSerializer(serializers.Serializer):
    video_id      = serializers.CharField(required=False, allow_blank=True)
    video_title   = serializers.CharField(required=False, allow_blank=True)
    video_channel = serializers.CharField(required=False, allow_blank=True)
    thumbnail     = serializers.URLField(required=False, allow_blank=True)
    is_playing    = serializers.BooleanField(required=False)
    progress_ms   = serializers.IntegerField(required=False)
    duration_ms   = serializers.IntegerField(required=False)
