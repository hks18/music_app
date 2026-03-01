from django.urls import path
from . import views

urlpatterns = [
    path('search/', views.SearchVideosView.as_view(), name='youtube-search'),
    path('video/<str:video_id>/', views.VideoDetailView.as_view(), name='youtube-video-detail'),
]
