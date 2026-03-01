from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.CreateRoomView.as_view(), name='create-room'),
    path('join/', views.JoinRoomView.as_view(), name='join-room'),
    path('<str:code>/', views.RoomDetailView.as_view(), name='room-detail'),
    path('<str:code>/leave/', views.LeaveRoomView.as_view(), name='leave-room'),
    path('<str:code>/playback/', views.UpdatePlaybackView.as_view(), name='update-playback'),
    path('<str:code>/members/', views.RoomMembersView.as_view(), name='room-members'),
]
