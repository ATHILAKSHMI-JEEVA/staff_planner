import uuid
from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action = models.CharField(max_length=200)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='audit_logs')
    # Rich context fields
    performer_role = models.CharField(max_length=50, blank=True)   # e.g. "manager"
    performer_branch_name = models.CharField(max_length=100, blank=True)
    target_user_id = models.UUIDField(null=True, blank=True)
    target_user_name = models.CharField(max_length=150, blank=True)
    target_branch_name = models.CharField(max_length=100, blank=True)
    leave_date = models.DateField(null=True, blank=True)
    leave_type = models.CharField(max_length=50, blank=True)
    # Session / slot refs
    session = models.ForeignKey('session_management.Session', null=True, blank=True, on_delete=models.SET_NULL)
    old_slot_id = models.UUIDField(null=True, blank=True)
    new_slot_id = models.UUIDField(null=True, blank=True)
    meta_json = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)