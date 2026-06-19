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
    # When a reschedule is approved, `date` gets overwritten with the NEW session date
    # (which can land in a different month/year). Monthly quota must be based on when
    # the reschedule was actually *used*, not on the resulting session date — so we
    # track that separately here.
    last_reschedule_at = models.DateTimeField(null=True, blank=True)
    rejection_reason   = models.TextField(null=True, blank=True)
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


class RecurringSchedule(models.Model):
    """
    A child's weekly recurring class schedule.
    days_of_week stores integers: 0=Monday ... 6=Sunday (Python's date.weekday()).
    Sessions are auto-generated from this on a rolling basis.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    child        = models.ForeignKey('users.Child', related_name='recurring_schedules', on_delete=models.CASCADE)
    teacher      = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='recurring_schedules', on_delete=models.CASCADE)
    branch       = models.ForeignKey('users.Branch', null=True, blank=True, on_delete=models.SET_NULL)
    days_of_week = models.JSONField(default=list)
    start_time   = models.TimeField()
    end_time     = models.TimeField()
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.child} — {self.teacher} ({self.start_time}-{self.end_time})"