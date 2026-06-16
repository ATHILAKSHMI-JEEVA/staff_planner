from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    performed_by_id = serializers.SerializerMethodField()
    performed_by_name = serializers.SerializerMethodField()
    session_id = serializers.SerializerMethodField()

    def get_performed_by_id(self, obj):
        return str(obj.performed_by_id) if obj.performed_by_id else None

    def get_performed_by_name(self, obj):
        return obj.performed_by.name if obj.performed_by else obj.target_user_name or 'Unknown'

    def get_session_id(self, obj):
        return str(obj.session_id) if obj.session_id else None

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'action',
            'performed_by_id',
            'performed_by_name',
            'performer_role',
            'performer_branch_name',
            'target_user_id',
            'target_user_name',
            'target_branch_name',
            'leave_date',
            'leave_type',
            'session_id',
            'old_slot_id',
            'new_slot_id',
            'meta_json',
            'created_at',
        ]