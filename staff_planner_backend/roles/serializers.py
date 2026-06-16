from rest_framework import serializers
from .models import RBACRole


class RBACRoleSerializer(serializers.ModelSerializer):
    _id = serializers.SerializerMethodField()

    def get__id(self, obj):
        return str(obj.id)

    class Meta:
        model = RBACRole
        fields = [
            'id',
            '_id',   # Frontend uses _id (MongoDB style)
            'name',
            'description',
            'permissions',
            'is_system',
            'created_at',
            'updated_at',
        ]