from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import LeaveRequest
from .serializers import LeaveRequestSerializer
from notifications.models import Notification
from users.models import User


def _get_admins_and_managers():
    results = []
    for user in User.objects.filter(is_active=True):
        roles = user.roles if isinstance(user.roles, list) else []
        if 'admin' in roles or 'manager' in roles:
            results.append(user)
    return results


def _notify_admins_and_managers(leave, exclude_user=None):
    targets = _get_admins_and_managers()
    for target in targets:
        if exclude_user and target.id == exclude_user.id:
            continue
        Notification.objects.create(
            user=target,
            type='leave_applied',
            title='New Leave Request',
            message=f"{leave.teacher.name} has applied for leave on {leave.date} ({leave.leave_type}).",
            meta_json={'leave_id': str(leave.id), 'teacher_id': str(leave.teacher.id)},
        )


def _notify_decision_cross(leave, decided_by):
    decided_by_roles = decided_by.roles if isinstance(decided_by.roles, list) else []
    decision_label = leave.status.capitalize()

    for user in User.objects.filter(is_active=True):
        roles = user.roles if isinstance(user.roles, list) else []
        if user.id == decided_by.id:
            continue
        should_notify = False
        if 'admin' in decided_by_roles and 'manager' in roles:
            should_notify = True
        elif 'manager' in decided_by_roles and 'admin' in roles:
            should_notify = True
        if should_notify:
            Notification.objects.create(
                user=user,
                type='leave_decision',
                title=f'Leave {decision_label} by {decided_by.name}',
                message=(
                    f"{decided_by.name} has {leave.status} the leave request of "
                    f"{leave.teacher.name} for {leave.date}."
                ),
                meta_json={'leave_id': str(leave.id), 'decided_by': str(decided_by.id)},
            )

    Notification.objects.create(
        user=leave.teacher,
        type='leave_decision',
        title=f'Your Leave has been {decision_label}',
        message=(
            f"Your leave request for {leave.date} ({leave.leave_type}) "
            f"has been {leave.status} by {decided_by.name}."
        ),
        meta_json={'leave_id': str(leave.id), 'decided_by': str(decided_by.id)},
    )


class MyLeavesView(generics.ListAPIView):
    serializer_class = LeaveRequestSerializer

    def get_queryset(self):
        return LeaveRequest.objects.filter(teacher=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response({'leaves': LeaveRequestSerializer(qs, many=True).data})


class PendingLeavesView(generics.ListAPIView):
    serializer_class = LeaveRequestSerializer

    def get_queryset(self):
        return LeaveRequest.objects.all().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response({'leaves': LeaveRequestSerializer(qs, many=True).data})


class ApplyLeaveView(APIView):
    def post(self, request):
        print("✅ ApplyLeave hit")
        print("✅ User:", request.user)
        print("✅ Roles:", getattr(request.user, 'roles', 'NO ROLES FIELD'))
        print("✅ Data:", request.data)

        data = request.data.copy()

        try:
            leave = LeaveRequest.objects.create(
                teacher=request.user,
                date=data['date'],
                reason=data['reason'],
                leave_type=data.get('leave_type', 'full_day'),
            )
            print("✅ Leave created:", leave.id)
        except Exception as e:
            print("❌ Leave create error:", e)
            return Response({'message': str(e)}, status=400)

        try:
            _notify_admins_and_managers(leave, exclude_user=request.user)
            print("✅ Notifications sent")
        except Exception as e:
            print("❌ Notification error:", e)

        return Response({'leave': LeaveRequestSerializer(leave).data}, status=201)


class LeaveDecisionView(APIView):
    def patch(self, request, pk):
        user_roles = request.user.roles if isinstance(request.user.roles, list) else []
        if 'admin' not in user_roles and 'manager' not in user_roles:
            return Response(
                {'message': 'Permission denied. Only admin or manager can approve/reject leaves.'},
                status=403
            )

        try:
            leave = LeaveRequest.objects.get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response({'message': 'Not found'}, status=404)

        decision = request.data.get('decision')
        if decision not in ('approved', 'rejected'):
            return Response({'message': 'Invalid decision'}, status=400)

        leave.status = decision
        leave.approved_by = request.user
        leave.save()

        from admin_ops.utils import log_action
        log_action(f'Leave {decision}', request.user, meta={'leave_id': str(leave.id)}, leave=leave)

        _notify_decision_cross(leave, decided_by=request.user)

        if decision == 'approved':
            from session_management.utils import detect_shortfalls
            detect_shortfalls(leave)

        return Response({'leave': LeaveRequestSerializer(leave).data})

# ── Permission Requests (Custom Hours / Short Leave) ──────────────────────────
from .models import PermissionRequest
from .serializers import PermissionRequestSerializer


class MyPermissionsView(generics.ListAPIView):
    serializer_class = PermissionRequestSerializer

    def get_queryset(self):
        return PermissionRequest.objects.filter(teacher=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response({'permissions': PermissionRequestSerializer(qs, many=True).data})


class ApplyPermissionView(APIView):
    def post(self, request):
        data = request.data
        try:
            perm = PermissionRequest.objects.create(
                teacher=request.user,
                date=data['date'],
                start_time=data['start_time'],
                end_time=data['end_time'],
                reason=data.get('reason', ''),
            )
        except Exception as e:
            return Response({'message': str(e)}, status=400)

        # Notify admins/managers
        _notify_admins_and_managers_permission(perm, exclude_user=request.user)
        return Response({'permission': PermissionRequestSerializer(perm).data}, status=201)


class PermissionDecisionView(APIView):
    def patch(self, request, pk):
        user_roles = request.user.roles if isinstance(request.user.roles, list) else []
        if 'admin' not in user_roles and 'manager' not in user_roles:
            return Response({'message': 'Permission denied.'}, status=403)
        try:
            perm = PermissionRequest.objects.get(pk=pk)
        except PermissionRequest.DoesNotExist:
            return Response({'message': 'Not found'}, status=404)
        decision = request.data.get('decision')
        if decision not in ('approved', 'rejected'):
            return Response({'message': 'Invalid decision'}, status=400)
        perm.status = decision
        perm.approved_by = request.user
        perm.save()
        from admin_ops.utils import log_action
        log_action(f'Permission {decision}', request.user, meta={'permission_id': str(perm.id)})
        _notify_permission_decision(perm, decided_by=request.user)
        return Response({'permission': PermissionRequestSerializer(perm).data})


class AllPermissionsView(generics.ListAPIView):
    serializer_class = PermissionRequestSerializer

    def get_queryset(self):
        return PermissionRequest.objects.all().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response({'permissions': PermissionRequestSerializer(qs, many=True).data})


def _notify_admins_and_managers_permission(perm, exclude_user=None):
    targets = _get_admins_and_managers()
    for target in targets:
        if exclude_user and target.id == exclude_user.id:
            continue
        Notification.objects.create(
            user=target,
            type='permission_applied',
            title='New Permission Request',
            message=f"{perm.teacher.name} has requested permission on {perm.date} ({perm.start_time} – {perm.end_time}).",
            meta_json={'permission_id': str(perm.id), 'teacher_id': str(perm.teacher.id)},
        )


def _notify_permission_decision(perm, decided_by):
    """Notify teacher when their permission is approved/rejected. Also cross-notify admin/manager."""
    decision_label = perm.status.capitalize()
    decided_by_roles = decided_by.roles if isinstance(decided_by.roles, list) else []

    # Notify the teacher
    Notification.objects.create(
        user=perm.teacher,
        type='permission_decision',
        title=f'Your Permission has been {decision_label}',
        message=(
            f"Your permission request for {perm.date} ({perm.start_time} – {perm.end_time}) "
            f"has been {perm.status} by {decided_by.name}."
        ),
        meta_json={'permission_id': str(perm.id), 'decided_by': str(decided_by.id)},
    )

    # Cross-notify: if admin decided → notify managers, if manager decided → notify admins
    from users.models import User
    for user in User.objects.filter(is_active=True):
        roles = user.roles if isinstance(user.roles, list) else []
        if user.id == decided_by.id:
            continue
        should_notify = (
            ('admin' in decided_by_roles and 'manager' in roles) or
            ('manager' in decided_by_roles and 'admin' in roles)
        )
        if should_notify:
            Notification.objects.create(
                user=user,
                type='permission_decision',
                title=f'Permission {decision_label} by {decided_by.name}',
                message=(
                    f"{decided_by.name} has {perm.status} the permission request of "
                    f"{perm.teacher.name} for {perm.date} ({perm.start_time} – {perm.end_time})."
                ),
                meta_json={'permission_id': str(perm.id), 'decided_by': str(decided_by.id)},
            )

class AllLeavesByDateView(APIView):
    """GET /leaves/all/?date=YYYY-MM-DD&branch_id=<id>
    Returns approved leaves for that date (optionally filtered by branch).
    Used by ManagerDashboard to mark ON LEAVE columns."""
    def get(self, request):
        date      = request.query_params.get("date")
        branch_id = request.query_params.get("branch_id")

        qs = LeaveRequest.objects.filter(status="approved")
        if date:
            qs = qs.filter(date=date)
        if branch_id:
            qs = qs.filter(teacher__branch_id=branch_id)

        return Response({"leaves": LeaveRequestSerializer(qs, many=True).data})