from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from datetime import date, timedelta

from users.models import User, Branch, Child
from session_management.models import Session
from leaves.models import LeaveRequest
from notifications.models import Notification
from roles.models import RBACRole


class Command(BaseCommand):
    help = "Seed database with realistic test data"

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Clearing old data..."))

        from django.db import connection
        from admin_ops.models import AuditLog

        # Fix: session_id column in auditlog is varchar but Session.id is UUID.
        # Raw SQL to null out the bad FK before Django tries SET_NULL via CASCADE.
        with connection.cursor() as cursor:
            cursor.execute("UPDATE admin_ops_auditlog SET session_id = NULL WHERE session_id IS NOT NULL")

        AuditLog.objects.all().delete()
        Notification.objects.all().delete()
        LeaveRequest.objects.all().delete()
        Session.objects.all().delete()
        Child.objects.all().delete()
        User.objects.all().delete()
        RBACRole.objects.all().delete()
        Branch.objects.all().delete()

        self.stdout.write("Creating branches...")
        chennai = Branch.objects.create(name="Chennai Branch", code="CHN")
        bangalore = Branch.objects.create(name="Bangalore Branch", code="BLR")

        self.stdout.write("Creating roles...")
        admin_role = RBACRole.objects.create(
            name="admin", permissions=[{"resource": "*", "action": "*"}]
        )
        manager_role = RBACRole.objects.create(
            name="manager", permissions=[{"resource": "leaves", "action": "approve"}]
        )
        teacher_role = RBACRole.objects.create(name="teacher", permissions=[])
        parent_role = RBACRole.objects.create(name="parent", permissions=[])

        self.stdout.write("Creating users...")

        # Admin
        admin = User.objects.create(
            email="admin1@demo.test",
            name="System Admin",
            password=make_password("Demo1234!"),
            roles=["admin"],
            branch=chennai,
        )

        # Manager
        manager = User.objects.create(
            email="manager1@demo.test",
            name="Manager User",
            password=make_password("Demo1234!"),
            roles=["manager"],
            branch=chennai,
        )

        # Richard Flores — main teacher shown in dashboard
        richard = User.objects.create(
            email="richard@demo.test",
            name="Richard Flores",
            password=make_password("Demo1234!"),
            roles=["teacher"],
            branch=chennai,
        )

        # Extra teachers
        alice = User.objects.create(
            email="teacher1@demo.test",
            name="Alice Johnson",
            password=make_password("Demo1234!"),
            roles=["teacher"],
            branch=chennai,
        )
        bob = User.objects.create(
            email="teacher2@demo.test",
            name="Bob Smith",
            password=make_password("Demo1234!"),
            roles=["teacher"],
            branch=bangalore,
        )

        # Parents
        parent1 = User.objects.create(
            email="parent1@demo.test",
            name="Charlie Parent",
            password=make_password("Demo1234!"),
            roles=["parent"],
            branch=chennai,
            phone="9876543210",
        )
        parent2 = User.objects.create(
            email="parent2@demo.test",
            name="Priya Parent",
            password=make_password("Demo1234!"),
            roles=["parent"],
            branch=chennai,
            phone="9123456789",
        )

        self.stdout.write("Creating children...")

        # Children assigned to Richard
        emma = Child.objects.create(
            name="Emma", parent_user=parent1,
            assigned_teacher=richard, branch=chennai
        )
        liam = Child.objects.create(
            name="Liam", parent_user=parent1,
            assigned_teacher=richard, branch=chennai
        )
        arjun = Child.objects.create(
            name="Arjun", parent_user=parent2,
            assigned_teacher=richard, branch=chennai
        )
        # Child assigned to Alice
        sofia = Child.objects.create(
            name="Sofia", parent_user=parent2,
            assigned_teacher=alice, branch=chennai
        )

        self.stdout.write("Creating sessions...")

        today = date.today()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)
        day_after = today + timedelta(days=2)
        day3 = today + timedelta(days=3)
        day4 = today + timedelta(days=4)
        day5 = today + timedelta(days=5)

        # Richard's sessions — TODAY (3 sessions so "Today's Sessions: 3")
        Session.objects.create(
            teacher=richard, child=emma, branch=chennai,
            date=today, start_time="09:00", end_time="10:00", status="scheduled"
        )
        Session.objects.create(
            teacher=richard, child=liam, branch=chennai,
            date=today, start_time="10:30", end_time="11:30", status="scheduled"
        )
        Session.objects.create(
            teacher=richard, child=arjun, branch=chennai,
            date=today, start_time="14:00", end_time="15:00", status="scheduled"
        )

        # Richard's sessions — TOMORROW
        Session.objects.create(
            teacher=richard, child=emma, branch=chennai,
            date=tomorrow, start_time="09:00", end_time="10:00", status="scheduled"
        )
        Session.objects.create(
            teacher=richard, child=arjun, branch=chennai,
            date=tomorrow, start_time="11:00", end_time="12:00", status="scheduled"
        )

        # Richard's sessions — DAY AFTER
        Session.objects.create(
            teacher=richard, child=liam, branch=chennai,
            date=day_after, start_time="09:30", end_time="10:30", status="scheduled"
        )

        # Richard's sessions — DAY 3, 4, 5 (future — for reschedule testing)
        Session.objects.create(
            teacher=richard, child=emma, branch=chennai,
            date=day3, start_time="10:00", end_time="11:00", status="scheduled"
        )
        Session.objects.create(
            teacher=richard, child=liam, branch=chennai,
            date=day3, start_time="11:00", end_time="12:00", status="scheduled"
        )
        Session.objects.create(
            teacher=richard, child=emma, branch=chennai,
            date=day4, start_time="14:00", end_time="15:00", status="scheduled"
        )
        Session.objects.create(
            teacher=richard, child=liam, branch=chennai,
            date=day5, start_time="10:00", end_time="11:00", status="scheduled"
        )

        # Richard's sessions — YESTERDAY
        Session.objects.create(
            teacher=richard, child=emma, branch=chennai,
            date=yesterday, start_time="09:00", end_time="10:00", status="scheduled"
        )

        # Alice's sessions
        Session.objects.create(
            teacher=alice, child=sofia, branch=chennai,
            date=today, start_time="10:00", end_time="11:00", status="scheduled"
        )

        self.stdout.write("Creating leave requests...")

        # Richard's approved leaves (so Approved Leaves = 3)
        LeaveRequest.objects.create(
            teacher=richard,
            date=yesterday,
            reason="Medical appointment",
            leave_type="full_day",
            status="approved",
            shortfall_detected=False,
        )
        LeaveRequest.objects.create(
            teacher=richard,
            date=today - timedelta(days=3),
            reason="Family function",
            leave_type="full_day",
            status="approved",
            shortfall_detected=True,
        )
        LeaveRequest.objects.create(
            teacher=richard,
            date=today - timedelta(days=5),
            reason="Fever",
            leave_type="full_day",
            status="approved",
            shortfall_detected=False,
        )
        # One pending leave for Alice
        LeaveRequest.objects.create(
            teacher=alice,
            date=tomorrow,
            reason="Personal work",
            leave_type="full_day",
            status="pending",
            shortfall_detected=False,
        )

        self.stdout.write(self.style.SUCCESS("\n✅ Database seeded successfully!\n"))
        self.stdout.write("Login credentials (password: Demo1234!):")
        self.stdout.write("  Admin:           admin1@demo.test")
        self.stdout.write("  Manager:         manager1@demo.test")
        self.stdout.write("  Richard Flores:  richard@demo.test   ← dashboard user")
        self.stdout.write("  Alice:           teacher1@demo.test")
        self.stdout.write("  Bob:             teacher2@demo.test")
        self.stdout.write("  Parent Charlie:  parent1@demo.test")
        self.stdout.write("  Parent Priya:    parent2@demo.test")
        self.stdout.write(f"\n  Today's date: {today}")