// src/features/teacher/components/TeacherDashboard.tsx

import { useState, useMemo } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAllSessions } from "@/features/teacher/hooks/useSessions";
import { useMyLeaves } from "@/features/teacher/hooks/useLeaves";
import { useBranch } from "@/features/admin/hooks/useBranches";
import { useMarkAttendance, useUndoAttendance } from "@/features/teacher/hooks/useSessions";
import { CardSkeleton, PageHeader, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon, Clock, Plus, BookOpen,
  FileText, CheckCircle, AlertTriangle, Users, UserCheck, Undo2,
} from "lucide-react";
import { fmtDateLong, fmtTime, todayISO } from "@/utils/date.utils";
import { LeaveForm } from "./LeaveForm";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import type { Session, LeaveRequest } from "@/types";

// ── Shift 10 AM – 8 PM ───────────────────────────────────────────────────────
const SHIFT_START_H = 10;
const SHIFT_END_H   = 20;

const SLOTS = Array.from({ length: SHIFT_END_H - SHIFT_START_H }, (_, i) => {
  const h = SHIFT_START_H + i;
  const fmt12 = (n: number) => {
    const mer = n < 12 ? "AM" : "PM";
    const h12 = n % 12 === 0 ? 12 : n % 12;
    return `${h12}${mer}`;
  };
  return {
    label: `${fmt12(h)}-${fmt12(h + 1)}`,
    startMins: h * 60,
    endMins:   h * 60 + 60,
    hour: h,
  };
});

function toMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function overlaps(s: Session, start: number, end: number) {
  return toMins(s.start_time) < end && toMins(s.end_time) > start;
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// Format arrived_at time nicely: "4:20 PM"
function fmtArrivedTime(isoStr: string) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// Is session currently live (now is between start and end)
function isSessionLive(s: Session) {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return toMins(s.start_time) <= nowMins && toMins(s.end_time) > nowMins;
}

// Is session finished (now is past the session end time)
function isSessionFinished(s: Session) {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= toMins(s.end_time);
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, valueColor, iconBg }: {
  icon: React.ReactNode; label: string; value: React.ReactNode;
  sub?: string; valueColor: string; iconBg: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 flex items-start gap-4 hover:shadow-md transition-shadow duration-200">
      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0", iconBg)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={cn("text-3xl font-bold mt-1 tracking-tight", valueColor)}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{sub}</p>}
      </div>
    </div>
  );
}

// ── Attendance Button ─────────────────────────────────────────────────────────
function AttendanceBtn({
  session,
  isMySession,
  isToday,
}: {
  session: Session & { attendance_marked?: boolean; arrived_at?: string };
  isMySession: boolean;
  isToday: boolean;
}) {
  const markAtt = useMarkAttendance();
  const undoAtt = useUndoAttendance();

  if (!isMySession || !isToday) return null;

  if (session.attendance_marked) {
    return (
      <button
        onClick={() => undoAtt.mutate(session.id, {
          onSuccess: () => toast.success("Attendance undone"),
          onError:   () => toast.error("Failed to undo"),
        })}
        disabled={undoAtt.isPending}
        className="mt-1 text-[9px] text-muted-foreground hover:text-rose-500 flex items-center gap-0.5 transition-colors mx-auto"
        title="Undo attendance"
      >
        <Undo2 className="h-2.5 w-2.5" /> Undo
      </button>
    );
  }

  return (
    <button
      onClick={() => markAtt.mutate(session.id, {
        onSuccess: () => toast.success(`${session.child_name || "Client"} marked as arrived`),
        onError:   () => toast.error("Failed to mark attendance"),
      })}
      disabled={markAtt.isPending}
      className="mt-1 w-full text-[10px] font-semibold py-1 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
    >
      <UserCheck className="h-3 w-3" />
      {markAtt.isPending ? "Marking…" : "Mark Arrived"}
    </button>
  );
}

// ── Session Cell ──────────────────────────────────────────────────────────────
function SessionCell({
  s,
  isLeave,
  isMe,
  isToday,
}: {
  s: Session & { attendance_marked?: boolean; arrived_at?: string; assigned_staff_name?: string };
  isLeave: boolean;
  isMe: boolean;
  isToday: boolean;
}) {
  const live     = isToday && isSessionLive(s);
  const finished = isToday && isSessionFinished(s);
  const arrived  = !!s.attendance_marked;
  const arrivedAt = (s as any).arrived_at as string | undefined;

  // Pick card colour
  const cardCls = arrived
    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
    : live
    ? "bg-red-50 border-red-200 text-red-900"
    : finished
    ? "bg-slate-50 border-slate-200 text-slate-500"
    : isLeave
    ? "bg-rose-50 border-rose-200 text-rose-800"
    : isMe
    ? "bg-blue-50 border-blue-200 text-blue-900"
    : "bg-white border-slate-200 text-slate-800";

  // Status colour strip on left edge
  const stripCls = arrived
    ? "border-l-4 border-l-emerald-400"
    : live
    ? "border-l-4 border-l-red-400"
    : finished
    ? "border-l-4 border-l-slate-300"
    : "border-l-4 border-l-blue-300";

  const staffLabel = s.assigned_staff_name ?? null; // only show explicitly assigned staff

  return (
    <div className="w-full space-y-1">
      <div className={cn(
        "rounded-md border bg-white px-2 py-1.5 text-left w-full shadow-sm",
        arrived ? "border-emerald-200 bg-emerald-50/60"
          : live ? "border-red-200 bg-red-50/40"
          : finished ? "border-slate-200 bg-slate-50/60 opacity-70"
          : "border-slate-200",
        stripCls
      )}>
        {/* Name + status dot in one line */}
        <div className="flex items-center gap-1.5">
          {/* Status dot */}
          {live && !arrived ? (
            /* Live — red pulse */
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          ) : live && arrived ? (
            /* Live + arrived — green dot with red ring pulse */
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-red-400" />
            </span>
          ) : arrived ? (
            /* Arrived, done */
            <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
          ) : finished ? (
            /* Done, not arrived */
            <span className="h-2 w-2 rounded-full bg-slate-300 flex-shrink-0" />
          ) : (
            /* Upcoming */
            <span className="h-2 w-2 rounded-full bg-blue-300 flex-shrink-0" />
          )}
          <span className={cn("text-[11px] font-semibold truncate",
            arrived ? "text-emerald-900"
            : live ? "text-red-800"
            : finished ? "text-slate-400"
            : "text-slate-800"
          )}>
            {s.child_name || "Client"}
          </span>
          {arrived && <span className="ml-auto text-[9px] font-bold text-emerald-600">✓</span>}
          {live && !arrived && <span className="ml-auto text-[8px] font-bold text-red-500 animate-pulse">LIVE</span>}
        </div>

        {/* Time row: show scheduled only if NOT arrived */}
        {!arrived && (
          <div className="mt-0.5 text-[9px] text-muted-foreground leading-tight">
            {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
          </div>
        )}

        {/* IN / OUT — clean minimal style */}
        {arrived && arrivedAt && (
          <div className="mt-1 space-y-0.5">
            <div className="flex items-center gap-1 text-[9px] font-medium text-slate-600">
              <span className="w-6 text-[8px] font-bold text-slate-400 uppercase">IN</span>
              <span>{fmtArrivedTime(arrivedAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-medium">
              {(s as any).left_at ? (
                <>
                  <span className="w-6 text-[8px] font-bold text-slate-400 uppercase">OUT</span>
                  <span className="text-slate-600">{new Date((s as any).left_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</span>
                </>
              ) : (
                <>
                  <span className="w-6 text-[8px] font-bold text-slate-300 uppercase">OUT</span>
                  <span className="text-slate-300">{fmtTime(s.end_time)}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Staff — compact */}
        {arrived && (
          <div className="mt-0.5 text-[8px] truncate leading-tight">
            {staffLabel
              ? <span className="text-blue-600">{staffLabel.split(" ")[0]}</span>
              : <span className="text-amber-500">⚠ No staff</span>
            }
          </div>
        )}
      </div>

      {/* Arrived? button — only for my sessions */}
      <AttendanceBtn session={s} isMySession={isMe} isToday={isToday} />
    </div>
  );
}

// ── Branch Timetable Grid ─────────────────────────────────────────────────────
function BranchTimetableGrid({
  staffList,
  sessions,
  onLeaveIds,
  currentUserId,
  date,
}: {
  staffList: { id: string; name: string }[];
  sessions: (Session & { attendance_marked?: boolean; arrived_at?: string; assigned_staff_name?: string })[];
  onLeaveIds: Set<string>;
  currentUserId: string;
  date: string;
}) {
  const now      = new Date();
  const currentH = now.getHours();
  const isToday  = date === todayISO();

  const attendedToday = sessions.filter((s) => s.attendance_marked).length;

  return (
    <div className="space-y-3">
      {/* Stats strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
          <Clock className="h-3.5 w-3.5" />10 AM – 8 PM · 10 hr shift
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
          <Users className="h-3.5 w-3.5" />{staffList.length} staff
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
          <BookOpen className="h-3.5 w-3.5" />{sessions.length} sessions today
        </span>
        {isToday && attendedToday > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            <UserCheck className="h-3.5 w-3.5" />{attendedToday} clients arrived
          </span>
        )}
        {onLeaveIds.size > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
            <AlertTriangle className="h-3.5 w-3.5" />{onLeaveIds.size} on leave
          </span>
        )}
      </div>

      {isToday && (
        <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          💡 Press <strong>Arrived?</strong> when your client walks in to mark attendance.
        </p>
      )}

      {/* Legend */}
      {isToday && (
        <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            Live
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Arrived
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Done
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-300" />
            Upcoming
          </span>
        </div>
      )}

      {/* Table: rows = staff, columns = time slots */}
      <div className="rounded-xl border border-border overflow-auto">
        <table className="border-collapse" style={{ minWidth: 160 + SLOTS.length * 120 }}>

          {/* Header */}
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-slate-800 text-white px-4 py-3 text-left border-r border-slate-600 w-[160px] min-w-[160px]">
                <span className="text-[11px] font-bold uppercase tracking-wider">Trainers</span>
              </th>
              {SLOTS.map((slot) => {
                const isNowSlot = isToday && currentH === slot.hour;
                return (
                  <th
                    key={slot.hour}
                    className={cn(
                      "px-2 py-3 text-center border-r border-slate-600 last:border-r-0 min-w-[120px]",
                      isNowSlot ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-100"
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      {isNowSlot && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse mb-0.5" />}
                      <span className="text-[11px] font-semibold whitespace-nowrap">{slot.label}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={SLOTS.length + 1} className="py-12 text-center text-sm text-muted-foreground">
                  No staff found for this branch.
                </td>
              </tr>
            ) : (
              staffList.map((staff, rowIdx) => {
                const isLeave   = onLeaveIds.has(staff.id);
                const isMe      = staff.id === currentUserId;
                const isEven    = rowIdx % 2 === 0;

                return (
                  <tr
                    key={staff.id}
                    className={cn(
                      "border-b border-border last:border-b-0 transition-colors",
                      isLeave ? "bg-rose-50/40"
                        : isMe ? "bg-blue-50/40 dark:bg-blue-950/10"
                        : isEven ? "bg-background" : "bg-muted/10"
                    )}
                  >
                    {/* Staff name cell */}
                    <td className={cn(
                      "sticky left-0 z-10 px-3 py-3 border-r border-border",
                      isLeave ? "bg-rose-50/60"
                        : isMe ? "bg-blue-50/60 dark:bg-blue-950/20"
                        : isEven ? "bg-background" : "bg-muted/10"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                          isLeave ? "bg-rose-200 text-rose-700"
                            : isMe ? "bg-blue-600 text-white"
                            : "bg-slate-800 text-white"
                        )}>
                          {initials(staff.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-[12px] font-semibold text-foreground truncate max-w-[90px]">
                              {staff.name.split(" ")[0]}
                            </p>
                            {isMe && (
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1 py-0.5 rounded">You</span>
                            )}
                          </div>
                          {isLeave ? (
                            <span className="text-[9px] font-bold uppercase text-rose-500">On Leave</span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground">Staff</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* One cell per time slot */}
                    {SLOTS.map((slot) => {
                      const isNowSlot = isToday && currentH === slot.hour;
                      const matched   = sessions.filter((s: any) => {
                        const effectiveStaffId = s.assigned_staff_id || s.teacher_id;
                        // Always use scheduled start/end for column placement
                        const effectiveStart = toMins(s.start_time);
                        const effectiveEnd   = toMins(s.end_time);
                        return effectiveStaffId === staff.id && slot.startMins < effectiveEnd && slot.endMins > effectiveStart;
                      });

                      return (
                        <td
                          key={slot.hour}
                          className={cn(
                            "px-1.5 py-2 align-middle border-r border-border last:border-r-0 text-center",
                            isNowSlot ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                          )}
                        >
                          {matched.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {matched.map((s) => (
                                <SessionCell
                                  key={s.id}
                                  s={s}
                                  isLeave={isLeave}
                                  isMe={isMe}
                                  isToday={isToday}
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/20 text-base select-none">×</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main TeacherDashboard ─────────────────────────────────────────────────────
export function TeacherDashboard() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const branchId = user?.branch_id ?? "";

  const sessions     = useAllSessions(dateStr, branchId);
  const myLeaves     = useMyLeaves();
  const branchDetail = useBranch(branchId || null);

  const { canWrite: canWriteLeaves, canRead: canReadLeaves } = usePermissions();
  const canApplyLeave = canWriteLeaves("leaves");
  const canViewLeaves = canReadLeaves("leaves");

  const mySessions = useMemo(
    () => (sessions.data ?? []).filter((s) => s.teacher_id === user?.id),
    [sessions.data, user?.id]
  );

  const pendingLeaves  = myLeaves.data?.filter((l) => l.status === "pending")?.length  ?? 0;
  const approvedLeaves = myLeaves.data?.filter((l) => l.status === "approved")?.length ?? 0;

  const clientsArrived = useMemo(
    () => mySessions.filter((s: any) => s.attendance_marked).length,
    [mySessions]
  );

  const onLeaveIds = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    myLeaves.data?.forEach((l) => {
      if (l.status === "approved" && l.date === dateStr) set.add(l.teacher_id);
    });
    return set;
  }, [myLeaves.data, dateStr]);

  const leaveOnDate = useMemo<LeaveRequest | undefined>(() => {
    if (!myLeaves.data) return undefined;
    return myLeaves.data.find((l) => l.date === dateStr && l.status === "approved");
  }, [myLeaves.data, dateStr]);

  const isAbsent = !!leaveOnDate;
  const isToday  = dateStr === todayISO();

  const staffList = useMemo(() => {
    if (!branchDetail.data?.members) return [];
    return branchDetail.data.members
      .filter((m) => {
        const roles = m.roles ?? [];
        return roles.some((r: string) =>
          ["teacher", "staff", "incharge", "sub_incharge"].includes(r.toLowerCase())
        );
      })
      .map((m) => ({ id: m.id, name: m.name }));
  }, [branchDetail.data]);

  return (
    <div className="space-y-6 page-enter">

      <PageHeader
        title={`Hello, ${user?.name?.split(" ")[0] || "Teacher"} 👋`}
        description={fmtDateLong(todayISO())}
        action={
          canApplyLeave ? (
            <Button onClick={() => setShowLeaveForm((v) => !v)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Apply Leave
            </Button>
          ) : undefined
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {sessions.isLoading || myLeaves.isLoading ? (
          <div className="col-span-4"><CardSkeleton count={4} /></div>
        ) : (
          <>
            <StatCard
              icon={<BookOpen className="h-5 w-5 text-blue-600" />}
              label="My Sessions Today"
              value={mySessions.length}
              sub={mySessions.length === 0 ? "No sessions scheduled" : `${mySessions.length} scheduled`}
              valueColor="text-blue-600"
              iconBg="bg-blue-50"
            />
            {isToday && (
              <StatCard
                icon={<UserCheck className="h-5 w-5 text-emerald-600" />}
                label="Clients Arrived"
                value={clientsArrived}
                sub={`of ${mySessions.length} sessions`}
                valueColor="text-emerald-600"
                iconBg="bg-emerald-50"
              />
            )}
            {canViewLeaves && (
              <StatCard
                icon={<FileText className="h-5 w-5 text-amber-500" />}
                label="Pending Leaves"
                value={pendingLeaves}
                sub={pendingLeaves === 0 ? "Nothing awaiting review" : "Awaiting review"}
                valueColor="text-amber-500"
                iconBg="bg-amber-50"
              />
            )}
            {canViewLeaves && (
              <StatCard
                icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
                label="Approved Leaves"
                value={approvedLeaves}
                sub="Total this period"
                valueColor="text-emerald-600"
                iconBg="bg-emerald-50"
              />
            )}
          </>
        )}
      </div>

      {/* Leave form */}
      {showLeaveForm && (
        <SectionCard
          title="Apply for Leave"
          action={
            <button
              onClick={() => setShowLeaveForm(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          }
        >
          <div className="p-5"><LeaveForm /></div>
        </SectionCard>
      )}

      {/* Branch Timetable */}
      <SectionCard
        title="Branch Daily Timetable"
        action={
          <div className="flex items-center gap-2.5">
            {isAbsent && (
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />You're On Leave
              </span>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {isToday ? "Today" : format(selectedDate, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                />
              </PopoverContent>
            </Popover>
          </div>
        }
      >
        <div className="p-5">
          {sessions.isLoading || branchDetail.isLoading ? (
            <CardSkeleton count={5} />
          ) : (
            <BranchTimetableGrid
              staffList={staffList}
              sessions={sessions.data ?? []}
              
              onLeaveIds={onLeaveIds}
              currentUserId={user?.id ?? ""}
              date={dateStr}
            />
          )}
        </div>
      </SectionCard>

    </div>
  );
}

export default TeacherDashboard;