from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    user_id = serializers.SerializerMethodField()

    def get_user_id(self, obj):
        return str(obj.user_id)

    class Meta:
        model = Notification
        fields = [
            'id',
            'user_id',
            'type',
            'title',
            'message',
            'is_read',
            'meta_json',
            'created_at',
        ]