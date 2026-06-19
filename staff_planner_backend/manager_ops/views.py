from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from session_management.models import Session
from notifications.models import Notification


def get_manager_branch_ids(user):
    """Returns branch UUIDs this manager is incharge of."""
    if "manager" not in (user.roles or []):
        return []
    ids = list(user.managed_branches.values_list("id", flat=True))
    if user.branch_id and user.branch_id not in ids:
        ids.append(user.branch_id)
    return ids


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": "Manager dashboard API working"})


class ManagerReschedulesView(APIView):
    """
    GET /api/manager/reschedules/
    Only shows reschedule requests for sessions in this manager's branches.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if "manager" not in (user.roles or []):
            return Response(
                {"message": "Only branch incharges (managers) can view reschedule requests."},
                status=403,
            )

        branch_ids = get_manager_branch_ids(user)
        if not branch_ids:
            return Response({"sessions": []})

        sessions = Session.objects.filter(
            reschedule_status__isnull=False,
            branch_id__in=branch_ids,
        ).order_by("-updated_at")

        data = []
        for s in sessions:
            data.append({
                "id":               str(s.id),
                "teacher_id":       str(s.teacher_id),
                "teacher_name":     s.teacher.name if s.teacher else "",
                "child_id":         str(s.child_id),
                "child_name":       s.child.name if s.child else "",
                "parent_name":      (
                    s.child.parent_user.name
                    if s.child and s.child.parent_user else ""
                ),
                "branch_id":        str(s.branch_id) if s.branch_id else None,
                "date":             str(s.date),
                "start_time":       str(s.start_time)[:5],
                "end_time":         str(s.end_time)[:5],
                "status":           s.status,
                "reschedule_status": s.reschedule_status,
                "reschedule_count": s.reschedule_count,
                "updated_at":       str(s.updated_at),
                "created_at":       str(s.created_at),
            })
        return Response({"sessions": data})


class ManagerRescheduleDecisionView(APIView):
    """
    PATCH /api/manager/reschedules/<id>/decision
    Body: { "decision": "approved" | "rejected" }

    Rules enforced:
    - Caller must be a manager (branch incharge).
    - Session's branch must be in their managed branches.
    - Session must still be in a pending state.
    - On approval: session date/time/teacher is updated + reschedule_count incremented.
    - On rejection: reschedule_status = "rejected", session unchanged.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, id):
        user = request.user

        # ── Role check ─────────────────────────────────────────────────────────
        if "manager" not in (user.roles or []):
            return Response(
                {"message": "Only branch incharges (managers) can approve or reject reschedule requests."},
                status=403,
            )

        decision = request.data.get("decision")
        if decision not in ["approved", "rejected"]:
            return Response({"message": "Invalid decision. Must be 'approved' or 'rejected'."}, status=400)

        try:
            session = Session.objects.get(id=id)
        except Session.DoesNotExist:
            return Response({"message": "Session not found."}, status=404)

        # ── Branch ownership check ─────────────────────────────────────────────
        manager_branch_ids = [str(b) for b in get_manager_branch_ids(user)]
        session_branch_id  = str(session.branch_id) if session.branch_id else None

        if session_branch_id not in manager_branch_ids:
            return Response(
                {
                    "message": (
                        "You are not the incharge of this session's branch. "
                        "Only the branch incharge can approve or reject this request."
                    )
                },
                status=403,
            )

        # ── State check ────────────────────────────────────────────────────────
        rs = session.reschedule_status or ""
        if not rs.startswith("pending"):
            return Response(
                {"message": f"This request is already '{rs}'. No further action needed."},
                status=400,
            )

        # ── Apply decision ─────────────────────────────────────────────────────
        if decision == "approved":
            from users.models import User as UserModel

            if rs.startswith("pending-virtual:"):
                # format: pending-virtual:{teacher_id}:{date}:{start}:{end}
                parts      = rs.split(":")
                teacher_id = parts[1]
                new_date   = parts[2]
                new_start  = parts[3]
                new_end    = parts[4] if len(parts) > 4 else "00:00"
                try:
                    session.teacher = UserModel.objects.get(id=teacher_id)
                except UserModel.DoesNotExist:
                    return Response({"message": "Referenced teacher no longer exists."}, status=400)
                session.date       = new_date
                session.start_time = new_start
                session.end_time   = new_end

            elif rs.startswith("pending:"):
                new_slot_id = rs.split("pending:")[1]
                try:
                    new_slot = Session.objects.get(id=new_slot_id)
                    session.date       = new_slot.date
                    session.start_time = new_slot.start_time
                    session.end_time   = new_slot.end_time
                    session.teacher    = new_slot.teacher
                except Session.DoesNotExist:
                    return Response({"message": "Referenced slot no longer exists."}, status=400)

            session.reschedule_status = "approved"
            session.status            = "rescheduled"
            session.reschedule_count  = (session.reschedule_count or 0) + 1  # track usage
            session.last_reschedule_at = timezone.now()  # quota is based on when it was used, not the new session date
            session.save()

            # Notify parent
            if session.child and session.child.parent_user:
                Notification.objects.create(
                    user=session.child.parent_user,
                    type="reschedule_approved",
                    title="Reschedule Approved ✅",
                    message=(
                        f"Your reschedule request for {session.child.name}'s session "
                        f"on {session.date} has been approved by your branch incharge."
                    ),
                    meta_json={"session_id": str(session.id)},
                )

            return Response({
                "message":    "Reschedule approved — session has been updated.",
                "session_id": str(session.id),
            })

        else:  # rejected
            session.reschedule_status = "rejected"
            session.save()

            # Notify parent
            if session.child and session.child.parent_user:
                Notification.objects.create(
                    user=session.child.parent_user,
                    type="reschedule_rejected",
                    title="Reschedule Rejected ❌",
                    message=(
                        f"Your reschedule request for {session.child.name}'s session "
                        f"on {session.date} was not approved by your branch incharge."
                    ),
                    meta_json={"session_id": str(session.id)},
                )

            return Response({
                "message":    "Reschedule request rejected.",
                "session_id": str(session.id),
            })