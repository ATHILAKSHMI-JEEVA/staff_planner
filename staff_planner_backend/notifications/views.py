from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class MyNotificationsView(APIView):
    def get(self, request):

        notifications = Notification.objects.filter(user=request.user).order_by(
            "-created_at"
        )

        return Response(
            {"notifications": NotificationSerializer(notifications, many=True).data}
        )


class UnreadCountView(APIView):
    def get(self, request):

        count = Notification.objects.filter(user=request.user, is_read=False).count()

        return Response({"count": count})


class MarkNotificationReadView(APIView):
    def patch(self, request, pk):

        try:
            notification = Notification.objects.get(pk=pk, user=request.user)

        except Notification.DoesNotExist:
            return Response({"message": "Notification not found"}, status=404)

        notification.is_read = True
        notification.save()

        return Response({"message": "Notification marked as read"})
