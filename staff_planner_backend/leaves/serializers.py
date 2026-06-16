from rest_framework import serializers
from .models import LeaveRequest


class LeaveRequestSerializer(serializers.ModelSerializer):
    teacher_id = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()
    approved_by_id = serializers.SerializerMethodField()    # ← NEW
    approved_by_name = serializers.SerializerMethodField()  # ← NEW

    def get_teacher_id(self, obj):
        return str(obj.teacher_id)

    def get_teacher_name(self, obj):
        return obj.teacher.name

    def get_approved_by_id(self, obj):                      # ← NEW
        return str(obj.approved_by_id) if obj.approved_by_id else None

    def get_approved_by_name(self, obj):                    # ← NEW
        return obj.approved_by.name if obj.approved_by else None

    class Meta:
        model = LeaveRequest
        fields = [
            'id',
            'teacher_id',
            'teacher_name',
            'date',
            'reason',
            'leave_type',
            'start_time',
            'end_time',
            'status',
            'approved_by_id',    # ← NEW
            'approved_by_name',  # ← NEW
            'shortfall_detected',
            'created_at',
        ]

class PermissionRequestSerializer(serializers.ModelSerializer):
    teacher_id = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()

    def get_teacher_id(self, obj):
        return str(obj.teacher_id)

    def get_teacher_name(self, obj):
        return obj.teacher.name

    class Meta:
        from .models import PermissionRequest
        model = PermissionRequest
        fields = ['id', 'teacher_id', 'teacher_name', 'date', 'start_time', 'end_time', 'reason', 'status', 'created_at']