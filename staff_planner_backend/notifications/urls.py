from django.urls import path
from .views import MyNotificationsView, UnreadCountView, MarkNotificationReadView

urlpatterns = [
    path('notifications/my/',           MyNotificationsView.as_view()),
    path('notifications/my',            MyNotificationsView.as_view()),
    path('notifications/unread-count/', UnreadCountView.as_view()),
    path('notifications/unread-count',  UnreadCountView.as_view()),
    path('notifications/<uuid:pk>/read/', MarkNotificationReadView.as_view()),
    path('notifications/<uuid:pk>/read',  MarkNotificationReadView.as_view()),
]