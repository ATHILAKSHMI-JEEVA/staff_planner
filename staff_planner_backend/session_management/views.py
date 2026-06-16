from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Session, Attendance
from .serializers import SessionSerializer
from leaves.models import LeaveRequest
from users.models import User
from notifications.models import Notification
from django.utils import timezone
import uuid
from datetime import datetime, date as date_type

RESCHEDULE_MONTHLY_LIMIT = 2
ADVANCE_NOTICE_HOURS     = 48  # 48hrs advance notice required


# ✅ 1. ALL SESSIONS — with attendance info including arrived_at + assigned_staff
class SessionListView(APIView):
    def get(self, request):
        date      = request.query_params.get("date")
        branch_id = request.query_params.get("branch_id")
        qs = Session.objects.all().order_by("date", "start_time")
        if date:
            qs = qs.filter(date=date)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        data = []
        for s in qs:
            att = getattr(s, 'attendance', None)
            data.append({
                "id": str(s.id),
                "teacher_id": str(s.teacher_id),
                "teacher_name": s.teacher.name if s.teacher else "",
                "child_id": str(s.child_id),
                "child_name": s.child.name if s.child else "",
                "branch_id": str(s.branch_id) if s.branch_id else None,
                "date": str(s.date),
                "start_time": str(s.start_time)[:5],
                "end_time": str(s.end_time)[:5],
                "status": s.status,
                "attendance_marked": att is not None,
                "arrived_at": att.arrived_at.isoformat() if att else None,
                "left_at":        att.left_at.isoformat() if att and att.left_at else None,
                "assigned_staff_id": str(att.assigned_staff_id) if att and att.assigned_staff_id else None,
                "assigned_staff_name": att.assigned_staff.name if att and att.assigned_staff else None,
            })
        return Response({"sessions": data})


# ✅ 2. CREATE SESSION
class CreateSessionView(APIView):
    def post(self, request):
        data = request.data
        session = Session.objects.create(
            teacher_id=data["teacher_id"],
            child_id=data["child_id"],
            branch_id=data.get("branch_id"),
            date=data["date"],
            start_time=data["start_time"],
            end_time=data["end_time"],
        )
        return Response({"session": SessionSerializer(session).data}, status=201)


# ✅ 3. SUBSTITUTE TEACHERS
class SubstitutesView(APIView):
    def get(self, request):
        date      = request.query_params.get("date")
        branch_id = request.query_params.get("branch_id")
        on_leave  = LeaveRequest.objects.filter(date=date, status="approved").values_list("teacher_id", flat=True)
        teachers  = User.objects.filter(roles__contains=["teacher"]).exclude(id__in=on_leave)
        if branch_id:
            branch_teachers  = teachers.filter(branch_id=branch_id)
            cross_teachers   = teachers.exclude(branch_id=branch_id)
        else:
            branch_teachers  = teachers
            cross_teachers   = User.objects.none()
        result = []
        for t in list(branch_teachers) + list(cross_teachers):
            load = Session.objects.filter(teacher=t, date=date).count()
            result.append({
                "id":             str(t.id),
                "name":           t.name,
                "load":           load,
                "is_cross_branch": t not in branch_teachers,
            })
        return Response({"substitutes": result})


# ✅ 4. MY SESSIONS
class MySessionsView(APIView):
    def get(self, request):
        date    = request.query_params.get("date")
        teacher = request.user
        qs      = Session.objects.filter(teacher=teacher)
        if date:
            qs = qs.filter(date=date)
        data = []
        for s in qs:
            att = getattr(s, 'attendance', None)
            data.append({
                "id": str(s.id),
                "teacher_id": str(s.teacher_id),
                "teacher_name": s.teacher.name if s.teacher else "",
                "child_id": str(s.child_id),
                "child_name": s.child.name if s.child else "",
                "branch_id": str(s.branch_id) if s.branch_id else None,
                "date": str(s.date),
                "start_time": str(s.start_time)[:5],
                "end_time": str(s.end_time)[:5],
                "status": s.status,
                "attendance_marked": att is not None,
                "arrived_at": att.arrived_at.isoformat() if att else None,
                "left_at":        att.left_at.isoformat() if att and att.left_at else None,
                "assigned_staff_id": str(att.assigned_staff_id) if att and att.assigned_staff_id else None,
                "assigned_staff_name": att.assigned_staff.name if att and att.assigned_staff else None,
            })
        return Response({"sessions": data})


# ✅ 5. SHORTFALLS
class ShortfallsView(APIView):
    def get(self, request):
        date = request.query_params.get("date")
        if not date:
            return Response({"message": "date is required"}, status=400)
        leaves = LeaveRequest.objects.filter(date=date, status="approved")
        result = []
        for leave in leaves:
            teacher  = leave.teacher
            sessions = Session.objects.filter(date=date, teacher=teacher)
            pending  = []
            confirmed_count = 0
            for s in sessions:
                child = s.child
                if child:
                    parent = User.objects.filter(id=child.parent_user_id).first()
                    pending.append({
                        "session_id":   str(s.id),
                        "child_id":     str(child.id),
                        "child_name":   child.name,
                        "parent_name":  parent.name if parent else "",
                        "parent_phone": parent.phone if parent else "",
                    })
                if s.status == "confirmed":
                    confirmed_count += 1
            result.append({
                "leave_id":       str(leave.id),
                "teacher_id":     str(teacher.id),
                "teacher_name":   teacher.name,
                "date":           str(date),
                "affected_count": sessions.count(),
                "confirmed_count": confirmed_count,
                "pending":        pending,
            })
        return Response({"shortfalls": result})


# ✅ 6. AVAILABLE SLOTS
class AvailableSlotsView(APIView):
    def get(self, request):
        date = request.query_params.get("date")
        if not date:
            return Response({"message": "date is required"}, status=400)
        teachers        = User.objects.filter(roles__contains=["teacher"], is_active=True)
        booked_sessions = Session.objects.filter(date=date)
        booked_map      = {}
        for s in booked_sessions:
            tid = str(s.teacher_id)
            if tid not in booked_map:
                booked_map[tid] = []
            booked_map[tid].append(str(s.start_time)[:5])
        on_leave_ids = set(
            str(l.teacher_id)
            for l in LeaveRequest.objects.filter(date=date, status="approved")
        )
        data = []
        for teacher in teachers:
            tid = str(teacher.id)
            if tid in on_leave_ids:
                continue
            teacher_booked = booked_map.get(tid, [])
            for h in range(10, 20):
                start_str = f"{h:02d}:00"
                end_str   = f"{h+1:02d}:00"
                is_booked = start_str in teacher_booked
                # ✅ Skip already booked slots — only return FREE slots
                if is_booked:
                    continue
                data.append({
                    "id":           f"free-{tid}-{h}",
                    "teacher_id":   tid,
                    "teacher_name": teacher.name,
                    "date":         date,
                    "start_time":   start_str,
                    "end_time":     end_str,
                    "spots_taken":  0,
                    "max_children": 1,
                })
        return Response({"slots": data, "_debug": {"teachers_found": teachers.count(), "booked_count": len(booked_map)}})


# ✅ 7. PARENT — MY CHILD SESSIONS
class MyChildSessionsView(APIView):
    def get(self, request):
        child_id  = request.query_params.get("child_id")
        from_date = request.query_params.get("from")
        if not child_id:
            return Response({"message": "child_id is required"}, status=400)
        qs = Session.objects.filter(child_id=child_id).order_by("date", "start_time")
        if from_date:
            qs = qs.filter(date__gte=from_date)
        data = []
        for s in qs:
            try:
                session_dt  = datetime.combine(s.date, s.start_time)
                hours_until = (session_dt - datetime.now()).total_seconds() / 3600
            except Exception:
                hours_until = 999
            att = getattr(s, 'attendance', None)
            data.append({
                "id":                str(s.id),
                "child_id":          str(s.child_id),
                "child_name":        s.child.name if s.child else "",
                "teacher_id":        str(s.teacher_id),
                "teacher_name":      s.teacher.name if s.teacher else "",
                "branch_id":         str(s.branch_id) if s.branch_id else None,
                "date":              str(s.date),
                "start_time":        str(s.start_time)[:5],
                "end_time":          str(s.end_time)[:5],
                "status":            s.status,
                "reschedule_status": s.reschedule_status,
                "reschedule_count":  s.reschedule_count,
                "hours_until":       round(hours_until, 1),
                "attendance_marked": att is not None,
                "arrived_at":        att.arrived_at.isoformat() if att else None,
            })
        return Response({"sessions": data})


# ✅ 8. PARENT — RESCHEDULE INFO
class RescheduleInfoView(APIView):
    def get(self, request):
        child_id   = request.query_params.get("child_id")
        session_id = request.query_params.get("session_id")
        if not child_id:
            return Response({"message": "child_id is required"}, status=400)
        today = date_type.today()
        used_this_month = Session.objects.filter(
            child_id=child_id,
            reschedule_count__gt=0,
            date__year=today.year,
            date__month=today.month,
        ).aggregate(total=__import__('django.db.models', fromlist=['Sum']).Sum('reschedule_count'))['total'] or 0
        limit_reached = used_this_month >= RESCHEDULE_MONTHLY_LIMIT
        hours_until   = None
        notice_ok     = True
        if session_id:
            try:
                s           = Session.objects.get(id=session_id)
                session_dt  = datetime.combine(s.date, s.start_time)
                hours_until = (session_dt - datetime.now()).total_seconds() / 3600
                notice_ok   = hours_until >= ADVANCE_NOTICE_HOURS
            except Session.DoesNotExist:
                pass
        return Response({
            "monthly_limit":        RESCHEDULE_MONTHLY_LIMIT,
            "used_this_month":      used_this_month,
            "limit_reached":        limit_reached,
            "advance_notice_hours": ADVANCE_NOTICE_HOURS,
            "hours_until_session":  round(hours_until, 1) if hours_until is not None else None,
            "notice_ok":            notice_ok,
        })


# ✅ 9. PARENT — SUBMIT RESCHEDULE REQUEST
class RescheduleSessionView(APIView):
    def post(self, request, id):
        try:
            session = Session.objects.get(id=id)
        except Session.DoesNotExist:
            return Response({"message": "Session not found"}, status=404)

        today = date_type.today()
        from django.db.models import Sum
        used_this_month = Session.objects.filter(
            child_id=session.child_id,
            reschedule_count__gt=0,
            date__year=today.year,
            date__month=today.month,
        ).aggregate(total=Sum('reschedule_count'))['total'] or 0

        limit_exceeded = used_this_month >= RESCHEDULE_MONTHLY_LIMIT

        # ── Advance notice check (always required) ──────────────────
        try:
            session_dt  = datetime.combine(session.date, session.start_time)
            hours_until = (session_dt - datetime.now()).total_seconds() / 3600
        except Exception:
            hours_until = 999

        if hours_until < ADVANCE_NOTICE_HOURS:
            return Response({
                "message": f"Reschedule requires at least {ADVANCE_NOTICE_HOURS} hours advance notice. Your session is in {round(hours_until, 1)} hours.",
                "error_code": "NOTICE_TOO_SHORT",
                "hours_until": round(hours_until, 1),
                "required_hours": ADVANCE_NOTICE_HOURS,
            }, status=400)

        # ── Already pending check ───────────────────────────────────
        rs = session.reschedule_status or ""
        if rs.startswith("pending"):
            return Response({"message": "A reschedule request is already pending.", "error_code": "ALREADY_PENDING"}, status=400)

        # ── Resolve new slot details ────────────────────────────────
        new_slot_id = request.data.get("new_slot_id", "")
        child_id    = request.data.get("child_id")
        reason      = request.data.get("reason", "")

        if str(new_slot_id).startswith("free-"):
            parts      = new_slot_id.split("-")
            hour       = int(parts[-1])
            teacher_id = "-".join(parts[1:-1])
            new_date   = request.data.get("date") or str(session.date)
            start_str  = f"{hour:02d}:00"
            end_str    = f"{hour+1:02d}:00"
            try:
                teacher = User.objects.get(id=teacher_id)
            except User.DoesNotExist:
                return Response({"message": "Teacher not found"}, status=404)
            teacher_name = teacher.name
            slot_info    = {"id": new_slot_id, "teacher_name": teacher_name, "date": new_date, "start_time": start_str, "end_time": end_str}
        else:
            try:
                new_slot = Session.objects.get(id=new_slot_id)
            except Session.DoesNotExist:
                return Response({"message": "Selected slot not found"}, status=404)
            new_date  = str(new_slot.date)
            start_str = str(new_slot.start_time)[:5]
            end_str   = str(new_slot.end_time)[:5]
            teacher_name = new_slot.teacher.name if new_slot.teacher else ""
            slot_info = {"id": str(new_slot.id), "teacher_name": teacher_name, "date": new_date, "start_time": start_str, "end_time": end_str}

        # ── COMBINATION LOGIC ───────────────────────────────────────
        # If limit exceeded → require admin approval (send notification, don't confirm yet)
        if limit_exceeded:
            session.reschedule_status = f"pending-admin:{new_slot_id}:{new_date}:{start_str}:{end_str}:{teacher_id if str(new_slot_id).startswith('free-') else ''}"
            session.save()
            # Notify admin/manager for approval
            if session.branch:
                from django.db.models import Q
                managers    = User.objects.filter(roles__contains=["manager"], is_active=True).filter(Q(managed_branches=session.branch) | Q(branch=session.branch)).distinct()
                child_name  = session.child.name if session.child else "Child"
                parent_name = session.child.parent_user.name if session.child and session.child.parent_user else "Parent"
                for manager in managers:
                    Notification.objects.create(
                        user=manager,
                        type="reschedule_admin_approval",
                        title="⚠️ Reschedule Needs Approval",
                        message=f"{parent_name} has exceeded the monthly reschedule limit ({used_this_month}/{RESCHEDULE_MONTHLY_LIMIT}). Their request for {child_name}'s session on {session.date} requires your approval.",
                        meta_json={"session_id": str(session.id), "reason": reason}
                    )
            return Response({
                "session_id": str(session.id),
                "pending": True,
                "needs_admin_approval": True,
                "used_this_month": used_this_month,
                "limit": RESCHEDULE_MONTHLY_LIMIT,
                "slot": slot_info,
                "message": f"You have used {used_this_month}/{RESCHEDULE_MONTHLY_LIMIT} reschedules. This request has been sent to the admin for approval."
            })

        # ── Normal flow (within limit) ──────────────────────────────
        if str(new_slot_id).startswith("free-"):
            session.reschedule_status = f"pending-virtual:{teacher_id}:{new_date}:{start_str}:{end_str}"
        else:
            session.reschedule_status = f"pending:{new_slot_id}"
        session.save()

        # Notify manager
        if session.branch:
            from django.db.models import Q
            managers    = User.objects.filter(roles__contains=["manager"], is_active=True).filter(Q(managed_branches=session.branch) | Q(branch=session.branch)).distinct()
            child_name  = session.child.name if session.child else "Child"
            parent_name = session.child.parent_user.name if session.child and session.child.parent_user else "Parent"
            for manager in managers:
                Notification.objects.create(
                    user=manager,
                    type="reschedule_requested",
                    title="New Reschedule Request 🔄",
                    message=f"{parent_name} has requested a reschedule for {child_name}'s session on {session.date}.",
                    meta_json={"session_id": str(session.id), "reason": reason}
                )

        return Response({
            "session_id": str(session.id),
            "pending": True,
            "needs_admin_approval": False,
            "used_this_month": used_this_month + 1,
            "limit": RESCHEDULE_MONTHLY_LIMIT,
            "slot": slot_info,
        })


# ✅ 10. PARENT — CANCEL RESCHEDULE
class ConfirmRescheduleView(APIView):
    def post(self, request, id):
        try:
            session = Session.objects.get(id=id)
        except Session.DoesNotExist:
            return Response({"message": "Session not found"}, status=404)
        decision = request.data.get("decision")
        if decision == "approved":
            return Response({"message": "Parents cannot approve reschedule requests."}, status=403)
        if decision == "rejected":
            rs = session.reschedule_status or ""
            if not rs.startswith("pending"):
                return Response({"message": "No pending reschedule request to cancel."}, status=400)
            session.reschedule_status = None
            session.save()
            return Response({"confirmed": False, "cancelled": True, "session_id": str(session.id)})
        return Response({"message": "Invalid decision"}, status=400)


# ✅ 11. ATTENDANCE — Mark client arrived
class MarkAttendanceView(APIView):
    def post(self, request, id):
        try:
            session = Session.objects.get(id=id)
        except Session.DoesNotExist:
            return Response({"message": "Session not found"}, status=404)
        if hasattr(session, 'attendance'):
            att = session.attendance
            return Response({"already_marked": True, "attendance_id": str(att.id), "arrived_at": att.arrived_at.isoformat(), "message": "Attendance already marked."})
        now = timezone.now()
        att = Attendance.objects.create(
            session=session,
            staff=request.user,
            child=session.child,
            branch=session.branch,
            date=session.date,
            arrived_at=now,
        )
        if session.branch:
            from django.db.models import Q
            managers   = User.objects.filter(roles__contains=["manager"], is_active=True).filter(Q(managed_branches=session.branch) | Q(branch=session.branch)).distinct()
            child_name  = session.child.name if session.child else "Client"
            teacher_name = request.user.name if request.user else "Staff"
            for manager in managers:
                Notification.objects.create(user=manager, type="client_arrived", title="Client Arrived ✅", message=f"{child_name} has arrived for their session with {teacher_name}.", meta_json={"session_id": str(session.id), "attendance_id": str(att.id)})
        return Response({"attendance_id": str(att.id), "session_id": str(session.id), "child_name": session.child.name if session.child else "", "staff_name": request.user.name if request.user else "", "arrived_at": att.arrived_at.isoformat(), "marked": True}, status=201)

    def delete(self, request, id):
        try:
            session = Session.objects.get(id=id)
        except Session.DoesNotExist:
            return Response({"message": "Session not found"}, status=404)
        if not hasattr(session, 'attendance'):
            return Response({"message": "No attendance record found."}, status=404)
        att        = session.attendance
        user_roles = getattr(request.user, 'roles', []) or []
        if str(att.staff_id) != str(request.user.id) and 'admin' not in user_roles:
            return Response({"message": "Not authorized to undo this attendance."}, status=403)
        att.delete()
        return Response({"undone": True, "session_id": str(session.id)})



# ✅ 12. CHECKOUT — Mark client as left
# POST /api/sessions/:id/checkout/
class CheckoutView(APIView):
    def post(self, request, id):
        from django.utils import timezone
        try:
            session = Session.objects.get(id=id)
        except Session.DoesNotExist:
            return Response({"message": "Session not found"}, status=404)
        if not hasattr(session, 'attendance'):
            return Response({"message": "Client has not arrived yet."}, status=400)
        att = session.attendance
        if att.left_at:
            return Response({
                "already_checked_out": True,
                "left_at": att.left_at.isoformat(),
                "message": "Client already checked out."
            })
        att.left_at = timezone.now()
        att.save(update_fields=['left_at'])
        return Response({
            "checked_out": True,
            "session_id": str(session.id),
            "arrived_at": att.arrived_at.isoformat(),
            "left_at": att.left_at.isoformat(),
        }, status=200)

    def delete(self, request, id):
        """Undo checkout — clear left_at"""
        try:
            session = Session.objects.get(id=id)
        except Session.DoesNotExist:
            return Response({"message": "Session not found"}, status=404)
        if not hasattr(session, 'attendance'):
            return Response({"message": "No attendance record."}, status=404)
        att = session.attendance
        att.left_at = None
        att.save(update_fields=['left_at'])
        return Response({"undone": True, "session_id": str(session.id)})


# ✅ 13. ATTENDANCE LIST
class AttendanceListView(APIView):
    def get(self, request):
        date      = request.query_params.get("date")
        branch_id = request.query_params.get("branch_id")
        staff_id  = request.query_params.get("staff_id")
        qs        = Attendance.objects.select_related('session', 'staff', 'child', 'branch', 'assigned_staff')
        if date:
            qs = qs.filter(date=date)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        data = []
        for att in qs:
            data.append({
                "id":                  str(att.id),
                "session_id":          str(att.session_id),
                "staff_id":            str(att.staff_id),
                "staff_name":          att.staff.name if att.staff else "",
                "child_id":            str(att.child_id),
                "child_name":          att.child.name if att.child else "",
                "branch_id":           str(att.branch_id) if att.branch_id else None,
                "date":                str(att.date),
                "arrived_at":          att.arrived_at.isoformat(),
                "left_at":             att.left_at.isoformat() if att.left_at else None,
                "marked_at":           att.marked_at.isoformat(),
                "session_start":       str(att.session.start_time)[:5] if att.session else None,
                "session_end":         str(att.session.end_time)[:5] if att.session else None,
                "assigned_staff_id":   str(att.assigned_staff_id) if att.assigned_staff_id else None,
                "assigned_staff_name": att.assigned_staff.name if att.assigned_staff else None,
            })
        return Response({"attendances": data, "count": len(data)})


# ✅ 13. ASSIGN STAFF — Branch incharge assigns staff after client arrives
# POST /api/sessions/:id/assign/  { staff_id }
class AssignStaffView(APIView):
    def post(self, request, id):
        try:
            session = Session.objects.get(id=id)
        except Session.DoesNotExist:
            return Response({"message": "Session not found"}, status=404)

        if not hasattr(session, 'attendance'):
            return Response({"message": "Client has not arrived yet. Mark attendance first."}, status=400)

        staff_id = request.data.get("staff_id")
        if not staff_id:
            return Response({"message": "staff_id is required"}, status=400)

        try:
            staff = User.objects.get(id=staff_id)
        except User.DoesNotExist:
            return Response({"message": "Staff not found"}, status=404)

        att = session.attendance
        att.assigned_staff = staff
        att.save()

        return Response({
            "assigned":            True,
            "session_id":          str(session.id),
            "assigned_staff_id":   str(staff.id),
            "assigned_staff_name": staff.name,
            "child_name":          session.child.name if session.child else "",
        })