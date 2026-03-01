from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def root_view(request):
    return JsonResponse({
        "status": "running",
        "message": "Music Sync Backend API is online.",
        "endpoints": {
            "rooms": "/api/rooms/",
            "youtube": "/youtube/"
        }
    })

urlpatterns = [
    path('', root_view, name='root'),
    path('admin/', admin.site.urls),
    path('api/rooms/', include('rooms.urls')),
    path('youtube/', include('youtube.urls')),
]
