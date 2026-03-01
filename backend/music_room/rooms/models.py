import random
import string
from django.db import models
from django.utils import timezone


def generate_room_code(length=6):
    """Generate a random uppercase alphanumeric room code e.g. X7K2MQ"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


class Room(models.Model):
    code                  = models.CharField(max_length=10, unique=True, default=generate_room_code)
    host_session_key      = models.CharField(max_length=100)
    created_at            = models.DateTimeField(default=timezone.now)
    is_active             = models.BooleanField(default=True)

    # Current YouTube playback state
    current_video_id      = models.CharField(max_length=20, blank=True, null=True)
    current_video_title   = models.CharField(max_length=300, blank=True, null=True)
    current_video_channel = models.CharField(max_length=200, blank=True, null=True)
    current_thumbnail     = models.URLField(blank=True, null=True)
    is_playing            = models.BooleanField(default=False)
    progress_ms           = models.IntegerField(default=0)
    duration_ms           = models.IntegerField(default=0)
    last_updated          = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Room {self.code}"

    class Meta:
        ordering = ['-created_at']


class RoomMember(models.Model):
    room        = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='members')
    session_key = models.CharField(max_length=100)
    joined_at   = models.DateTimeField(default=timezone.now)
    is_active   = models.BooleanField(default=True)

    class Meta:
        unique_together = ['room', 'session_key']

    def __str__(self):
        return f"Member {self.session_key[:8]} in Room {self.room.code}"
