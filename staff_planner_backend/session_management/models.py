import uuid
from django.db import models
from django.conf import settings


class Session(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('rescheduled', 'Rescheduled'),
        ('cancelled', 'Cancelled'),
    ]
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher          = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='teaching_sessions', on_delete=models.CASCADE)
    child            = models.ForeignKey('users.Child', on_delete=models.CASCADE)
    branch           = models.ForeignKey('users.Branch', null=True, blank=True, on_delete=models.SET_NULL)
    date             = models.DateField()
    start_time       = models.TimeField()
    end_time         = models.TimeField()
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    reschedule_status  = models.CharField(max_length=500, null=True, blank=True)
    reschedule_count   = models.PositiveSmallIntegerField(default=0)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)


class Attendance(models.Model):
    """
    Records when a client arrives.
    assigned_staff = who will actually handle this session (set by branch incharge after arrival).
    """
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session        = models.OneToOneField(Session, on_delete=models.CASCADE, related_name='attendance')
    staff          = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='marked_attendances', on_delete=models.CASCADE)
    assigned_staff = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='assigned_attendances', on_delete=models.SET_NULL, null=True, blank=True)
    child          = models.ForeignKey('users.Child', on_delete=models.CASCADE)
    branch         = models.ForeignKey('users.Branch', null=True, blank=True, on_delete=models.SET_NULL)
    date           = models.DateField()
    arrived_at     = models.DateTimeField()
    left_at        = models.DateTimeField(null=True, blank=True)
    marked_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-arrived_at']

    def __str__(self):
        return f"{self.staff} → {self.child} on {self.date}"