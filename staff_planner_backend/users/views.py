# staff_planner_backend/users/views.py
# Role-based Login - reads user role, returns JWT token + redirect_to

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authentication import BaseAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import UserSerializer
from .models import User, Child


class NoAuthentication(BaseAuthentication):
    """
    Skips all token validation entirely.
    Used on public endpoints (login) so a stale/expired token in the client's
    Authorization header does not cause JWTAuthentication to raise 401 before
    the view logic runs.  AllowAny only controls *permission*; the authenticator
    runs first and can still reject the request — this prevents that.
    """
    def authenticate(self, request):
        return None  # returns (user, auth) = None → anonymous, no error raised


# Role -> frontend route mapping
ROLE_REDIRECT = {
    "admin":   "/admin",
    "teacher": "/teacher",
    "parent":  "/parent",
    "manager": "/manager",
}


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Body: { name, email, phone?, role, password }

    Creates a new user account with the given role, then returns JWT tokens
    exactly like LoginView so the frontend can auto-login immediately.
    """
    authentication_classes = [NoAuthentication]
    permission_classes     = [AllowAny]

    ALLOWED_ROLES = {"teacher", "parent", "admin", "manager"}

    def post(self, request):
        name     = request.data.get("name", "").strip()
        email    = request.data.get("email", "").strip().lower()
        phone    = request.data.get("phone", "").strip()
        role     = request.data.get("role", "").strip().lower()
        password = request.data.get("password", "")

        # ── Validate required fields ──────────────────────────────────────────
        if not name:
            return Response({"message": "Name is required."}, status=400)
        if not email:
            return Response({"message": "Email is required."}, status=400)
        if not password or len(password) < 6:
            return Response({"message": "Password must be at least 6 characters."}, status=400)
        if role not in self.ALLOWED_ROLES:
            return Response(
                {"message": f"Invalid role. Choose from: {', '.join(sorted(self.ALLOWED_ROLES))}."},
                status=400,
            )

        # ── Check for duplicate email ─────────────────────────────────────────
        if User.objects.filter(email=email).exists():
            return Response({"message": "An account with this email already exists."}, status=409)

        # ── Create user ───────────────────────────────────────────────────────
        user = User.objects.create_user(
            email=email,
            password=password,
            name=name,
            phone=phone,
            roles=[role],
        )

        # ── Issue JWT tokens ──────────────────────────────────────────────────
        redirect_to = ROLE_REDIRECT.get(role, "/teacher")
        refresh     = RefreshToken.for_user(user)

        return Response(
            {
                "token":         str(refresh.access_token),
                "refresh_token": str(refresh),
                "user":          UserSerializer(user).data,
                "redirect_to":   redirect_to,
            },
            status=201,
        )


class LoginView(APIView):
    """
    POST /api/auth/login/
    Body: { email, password }

    Success response:
    {
        "token":         "<access_jwt>",
        "refresh_token": "<refresh_jwt>",
        "user":          { ...UserSerializer fields... },
        "redirect_to":   "/admin"   <- role-based redirect URL
    }
    """
    # NoAuthentication: prevents JWTAuthentication from rejecting the request
    # if the client sends a stale/expired token in the Authorization header.
    # Without this, a bad token causes 401 before AllowAny even runs.
    authentication_classes = [NoAuthentication]
    permission_classes     = [AllowAny]

    def post(self, request):
        email    = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        # Validate input
        if not email or not password:
            return Response(
                {"message": "Email and password are required."},
                status=400,
            )

        # Authenticate user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"message": "Invalid credentials."}, status=401)

        if not user.check_password(password):
            return Response({"message": "Invalid credentials."}, status=401)

        if not user.is_active:
            return Response({"message": "Account is disabled."}, status=403)

        # Determine primary role and redirect route
        roles        = user.roles or []
        primary_role = roles[0] if roles else None
        redirect_to  = ROLE_REDIRECT.get(primary_role, "/teacher")

        # Issue JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            "token":         str(refresh.access_token),
            "refresh_token": str(refresh),
            "user":          UserSerializer(user).data,
            "redirect_to":   redirect_to,  # frontend uses this to navigate
        })


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Body: { refresh_token }

    Blacklists the refresh token and logs the user out.
    Always succeeds — even with an expired/missing access token — so the
    client can clean up its local state regardless of server-side token validity.
    """
    authentication_classes = [NoAuthentication]
    permission_classes     = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh_token")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass  # Already blacklisted or invalid - still proceed
        return Response({"message": "Logged out successfully."})


class MeView(APIView):
    """
    GET /api/auth/me/
    Returns current user info along with their role-based redirect route.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        roles        = request.user.roles or []
        primary_role = roles[0] if roles else None
        redirect_to  = ROLE_REDIRECT.get(primary_role, "/teacher")

        return Response({
            "user":        UserSerializer(request.user).data,
            "redirect_to": redirect_to,
        })


class ChildrenMyView(APIView):
    """
    GET /api/children/my/
    Returns the list of children belonging to the logged-in parent.
    Auto-creates a Child record if one doesn't exist yet.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        children = Child.objects.filter(parent_user=user)

        # ✅ Auto-create Child record if parent has none yet
        if not children.exists() and "parent" in (user.roles or []):
            from .models import Branch
            # Try to find the branch this parent belongs to
            branch = getattr(user, 'branch', None)
            child = Child.objects.create(
                name=user.name,
                parent_user=user,
                branch=branch,
            )
            children = Child.objects.filter(parent_user=user)

        data = [
            {
                "id":                  str(c.id),
                "name":                c.name,
                "parent_user_id":      str(c.parent_user_id),
                "assigned_teacher_id": str(c.assigned_teacher_id) if c.assigned_teacher_id else None,
            }
            for c in children
        ]
        return Response({"children": data})


class ManagerBranchesView(APIView):
    """
    GET /api/managers/<user_id>/branches/  -- list managed branches
    PUT /api/managers/<user_id>/branches/  -- replace managed branches
    Body for PUT: { branch_ids: ["uuid", ...] }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"message": "User not found."}, status=404)

        from .models import Branch
        from .serializers import BranchSerializer
        branches = user.managed_branches.all()
        return Response({"managed_branches": BranchSerializer(branches, many=True).data})

    def put(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"message": "User not found."}, status=404)

        if "manager" not in (user.roles or []):
            return Response({"message": "User is not a manager."}, status=400)

        from .models import Branch
        branch_ids = request.data.get("branch_ids", [])
        branches   = Branch.objects.filter(id__in=branch_ids)
        user.managed_branches.set(branches)
        user.save()
        return Response({"message": "Managed branches updated.", "count": branches.count()})

class BranchChildrenView(APIView):
    """
    GET /api/children/branch/?branch_id=<uuid>&date=<YYYY-MM-DD>
    Returns all CLIENTS (parent-role users) in the branch with attendance info.
    Each client maps to their Child record (auto-created when added to branch).
    Falls back to using the user directly if no Child record exists.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from session_management.models import Session, Attendance
        import datetime

        branch_id = request.query_params.get("branch_id") or str(getattr(request.user, 'branch_id', '') or '')
        date_str  = request.query_params.get("date") or str(datetime.date.today())

        if not branch_id:
            return Response({"children": []})

        # Get all parent-role users in this branch (these are the "clients")
        branch_clients = User.objects.filter(
            branch_id=branch_id,
            roles__contains=["parent"]
        ).order_by("name")

        # Get all Child records for this branch
        children_qs = Child.objects.filter(branch_id=branch_id).select_related('assigned_teacher')
        # Map parent_user_id -> Child
        parent_to_child = {str(c.parent_user_id): c for c in children_qs}

        # Get all sessions for this branch+date
        sessions = Session.objects.filter(
            branch_id=branch_id, date=date_str
        ).select_related('attendance__assigned_staff', 'teacher')
        session_by_child = {str(s.child_id): s for s in sessions}

        # Get all attendances for this branch+date
        attendances = Attendance.objects.filter(
            branch_id=branch_id, date=date_str
        ).select_related('assigned_staff')
        att_by_child = {str(a.child_id): a for a in attendances}

        data = []
        seen_child_ids = set()

        for client_user in branch_clients:
            child = parent_to_child.get(str(client_user.id))

            # If no Child record, auto-create one now
            if not child:
                child = Child.objects.create(
                    name=client_user.name,
                    parent_user=client_user,
                    branch_id=branch_id,
                )

            child_id_str = str(child.id)
            seen_child_ids.add(child_id_str)

            session = session_by_child.get(child_id_str)
            att = att_by_child.get(child_id_str)
            if not att and session:
                att = getattr(session, 'attendance', None)

            data.append({
                "child_id":              child_id_str,
                "child_name":            client_user.name,  # Use client user's name directly
                "parent_name":           client_user.name,
                "assigned_teacher_id":   str(child.assigned_teacher_id) if child.assigned_teacher_id else None,
                "assigned_teacher_name": child.assigned_teacher.name if child.assigned_teacher else "",
                "session_id":            str(session.id) if session else None,
                "session_start":         str(session.start_time)[:5] if session else None,
                "session_end":           str(session.end_time)[:5] if session else None,
                "attendance_marked":     att is not None,
                "arrived_at":            att.arrived_at.isoformat() if att else None,
                "left_at":               att.left_at.isoformat() if att and att.left_at else None,
                "assigned_staff_id":     str(att.assigned_staff_id) if att and att.assigned_staff_id else None,
                "assigned_staff_name":   att.assigned_staff.name if att and att.assigned_staff else None,
                "session_teacher_name":  session.teacher.name if session and session.teacher else "",
            })

        return Response({"children": data, "date": date_str, "branch_id": branch_id})


class MarkChildAttendanceView(APIView):
    """
    POST /api/children/<child_id>/attendance/
    Body: { date, branch_id }
    Marks a child as arrived. Creates a session if none exists for today.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, child_id):
        from session_management.models import Session, Attendance
        from django.utils import timezone
        import datetime as dt

        date_str  = request.data.get("date") or str(dt.date.today())
        branch_id = request.data.get("branch_id") or str(getattr(request.user, 'branch_id', '') or '')

        try:
            child = Child.objects.get(id=child_id)
        except Child.DoesNotExist:
            return Response({"message": "Child not found"}, status=404)

        session = Session.objects.filter(child_id=child_id, date=date_str).first()
        if not session:
            now = dt.datetime.now()
            start = now.time().replace(second=0, microsecond=0)
            end   = (now + dt.timedelta(hours=1)).time().replace(second=0, microsecond=0)
            teacher = child.assigned_teacher or request.user
            session = Session.objects.create(
                teacher=teacher,
                child=child,
                branch_id=branch_id or str(child.branch_id or ''),
                date=date_str,
                start_time=start,
                end_time=end,
            )

        if hasattr(session, 'attendance'):
            att = session.attendance
            return Response({"already_marked": True, "attendance_id": str(att.id), "arrived_at": att.arrived_at.isoformat()})

        now = timezone.now()
        att = Attendance.objects.create(
            session=session,
            staff=request.user,
            child=child,
            branch_id=branch_id or str(child.branch_id or ''),
            date=date_str,
            arrived_at=now,
        )

        return Response({
            "attendance_id": str(att.id),
            "session_id":    str(session.id),
            "child_name":    child.name,
            "arrived_at":    att.arrived_at.isoformat(),
            "marked":        True,
        }, status=201)


class AssignStaffToChildView(APIView):
    """
    POST /api/children/<child_id>/assign/
    Body: { staff_id, date }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, child_id):
        from session_management.models import Attendance
        import datetime

        date_str = request.data.get("date") or str(datetime.date.today())
        staff_id = request.data.get("staff_id")

        if not staff_id:
            return Response({"message": "staff_id is required"}, status=400)

        try:
            child = Child.objects.get(id=child_id)
        except Child.DoesNotExist:
            return Response({"message": "Child not found"}, status=404)

        try:
            staff = User.objects.get(id=staff_id)
        except User.DoesNotExist:
            return Response({"message": "Staff not found"}, status=404)

        att = Attendance.objects.filter(child_id=child_id, date=date_str).first()
        if not att:
            return Response({"message": "Mark arrival first."}, status=400)

        att.assigned_staff = staff
        att.save()

        return Response({
            "assigned":            True,
            "child_name":          child.name,
            "assigned_staff_id":   str(staff.id),
            "assigned_staff_name": staff.name,
        })