from rest_framework import serializers
from .models import Session


class SessionSerializer(serializers.ModelSerializer):
    teacher_id = serializers.SerializerMethodField()
    child_id = serializers.SerializerMethodField()
    branch_id = serializers.SerializerMethodField()

    def get_teacher_id(self, obj):
        return str(obj.teacher_id)

    def get_child_id(self, obj):
        return str(obj.child_id)

    def get_branch_id(self, obj):
        return str(obj.branch_id) if obj.branch_id else None

    class Meta:
        model = Session
        fields = [
            'id',
            'teacher_id',
            'child_id',
            'branch_id',
            'date',
            'start_time',
            'end_time',
            'status',
            'reschedule_status',
            'created_at',
            'updated_at',
        ]