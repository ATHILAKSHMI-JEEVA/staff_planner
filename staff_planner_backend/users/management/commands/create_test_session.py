"""
One-off helper: creates a test session for a parent who has a child but
no upcoming sessions yet (so you can test the Parent → Reschedule flow).

Usage:
    python manage.py create_test_session --parent-email <email>
    python manage.py create_test_session --parent-name "RAMYA S"

If no parent is specified, it picks the first parent that has a child
but zero upcoming sessions.
"""
from datetime import date, time, timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from users.models import User, Child
from session_management.models import Session


class Command(BaseCommand):
    help = "Create a test session for a parent's child (for testing Reschedule flow)."

    def add_arguments(self, parser):
        parser.add_argument("--parent-email", type=str, default=None)
        parser.add_argument("--parent-name", type=str, default=None)
        parser.add_argument("--days-ahead", type=int, default=3,
                             help="How many days from today the session should be (default 3, "
                                  "well past the 48hr advance-notice rule).")
        parser.add_argument("--list", action="store_true",
                             help="List all parents and their children (for debugging), then exit.")
        parser.add_argument("--set-password", type=str, default=None,
                             help="Set/reset this parent's login password to the given value.")
        parser.add_argument("--skip-session", action="store_true",
                             help="Don't create a session — use this with --set-password to only reset the password.")

    def handle(self, *args, **opts):
        if opts["list"]:
            parents = User.objects.filter(roles__contains=["parent"])
            if not parents.exists():
                self.stdout.write(self.style.WARNING("No users with role 'parent' found."))
                return
            for u in parents:
                children = list(Child.objects.filter(parent_user=u).values_list("name", flat=True))
                self.stdout.write(
                    f"- {u.name!r}  email={u.email!r}  roles={u.roles}  children={children}"
                )
            return

        parent = None

        if opts["parent_email"]:
            parent = User.objects.filter(email=opts["parent_email"]).first()
        elif opts["parent_name"]:
            qname = opts["parent_name"].strip()
            parent = (
                User.objects.filter(name__iexact=qname).first()
                or User.objects.filter(name__icontains=qname).first()
            )
            if parent and "parent" not in (parent.roles or []):
                self.stdout.write(self.style.WARNING(
                    f"Found user '{parent.name}' but roles={parent.roles} (no 'parent' role)."
                ))

        if not parent:
            # fall back: first parent with a child but no sessions
            for u in User.objects.filter(roles__contains=["parent"]):
                child = Child.objects.filter(parent_user=u).first()
                if child and not Session.objects.filter(child=child).exists():
                    parent = u
                    break

        if not parent:
            self.stderr.write(self.style.ERROR(
                "No matching parent found. Run with --list to see all parents in the DB."
            ))
            return

        if opts["set_password"]:
            parent.password = make_password(opts["set_password"])
            parent.save()
            self.stdout.write(self.style.SUCCESS(
                f"Password for '{parent.name}' ({parent.email}) has been reset."
            ))

        if opts["skip_session"]:
            return

        child = Child.objects.filter(parent_user=parent).first()
        if not child:
            self.stderr.write(self.style.ERROR(
                f"Parent '{parent.name}' (id={parent.id}, roles={parent.roles}) has no Child record. "
                f"Run with --list to inspect, or re-check the 'childNames' field when this parent was added."
            ))
            return

        teacher = User.objects.filter(roles__contains=["teacher"]).first()
        if not teacher:
            self.stderr.write(self.style.ERROR("No teacher found in the system."))
            return

        session_date = date.today() + timedelta(days=opts["days_ahead"])
        session = Session.objects.create(
            teacher=teacher,
            child=child,
            branch=child.branch,
            date=session_date,
            start_time=time(10, 0),
            end_time=time(11, 0),
        )

        self.stdout.write(self.style.SUCCESS(
            f"Created session {session.id} for child '{child.name}' "
            f"(parent: {parent.name}, {parent.email}) with teacher '{teacher.name}' "
            f"on {session_date} 10:00-11:00."
        ))