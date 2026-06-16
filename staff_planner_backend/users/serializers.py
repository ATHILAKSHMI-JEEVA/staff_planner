from rest_framework import serializers
from .models import User, Branch


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'code']


class UserSerializer(serializers.ModelSerializer):
    branch_id = serializers.SerializerMethodField()
    branch_ids = serializers.SerializerMethodField()

    def get_branch_id(self, obj):
        return str(obj.branch_id) if obj.branch_id else None

    def get_branch_ids(self, obj):
        return obj.branch_ids

    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'phone',
            'roles', 'role_id', 'branch_id', 'branch_ids',
            'is_active',
        ]