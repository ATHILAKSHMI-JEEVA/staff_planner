from .models import Session


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