from datetime import date, timedelta

from django.db.models import Q

from .models import Session, RecurringSchedule


def get_branch_approvers(branch):
    """
    Return the active managers (branch incharges) responsible for a given branch.
    A manager is considered responsible for a branch if it's in their
    managed_branches (M2M) OR it's their primary branch (FK).
    """
    if not branch:
        return []
    from users.models import User
    return User.objects.filter(
        roles__contains=["manager"],
        is_active=True,
    ).filter(
        Q(managed_branches=branch) | Q(branch=branch)
    ).distinct()


def generate_sessions_from_schedule(schedule: RecurringSchedule, weeks_ahead: int = 4):
    """
    Create Session rows for the next `weeks_ahead` weeks based on a
    RecurringSchedule's days_of_week + start_time/end_time.
    Skips dates that already have a session for this child at this start_time
    (so calling this repeatedly is always safe / idempotent).
    """
    if not schedule.is_active:
        return []

    created = []
    today = date.today()
    for i in range(weeks_ahead * 7):
        d = today + timedelta(days=i)
        if d.weekday() not in schedule.days_of_week:
            continue

        already_exists = Session.objects.filter(
            child=schedule.child,
            date=d,
            start_time=schedule.start_time,
        ).exists()
        if already_exists:
            continue

        session = Session.objects.create(
            teacher=schedule.teacher,
            child=schedule.child,
            branch=schedule.branch,
            date=d,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            status='scheduled',
        )
        created.append(session)

    return created


def detect_shortfalls(leave):
    try:
        sessions = Session.objects.filter(
            teacher=leave.teacher,
            date=leave.date,
            status='scheduled',
        )
        if sessions.exists():
            leave.shortfall_detected = True
            leave.save(update_fields=['shortfall_detected'])
    except Exception as e:
        print(f"detect_shortfalls error: {e}")