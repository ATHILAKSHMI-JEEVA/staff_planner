// src/features/teacher/components/TeacherAttendancePage.tsx
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAvailableStaff, useAssignStaffOnArrival } from "@/features/admin/hooks/useAdmin";
import { CardSkeleton, PageHeader, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon, UserCheck, Clock, BookOpen,
  CheckCircle2, Undo2, Users, ChevronDown, ChevronUp, LogOut,
} from "lucide-react";
import { format } from "date-fns";
import { fmtTime, todayISO } from "@/utils/date.utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import apiClient from "@/api/axiosClient";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BranchClient {
  child_id: string;
  child_name: string;
  parent_name: string;
  assigned_teacher_id: string | null;
  assigned_teacher_name: string;
  session_id: string | null;
  session_start: string | null;
  session_end: string | null;
  attendance_marked: boolean;
  arrived_at: string | null;
  left_at?: string | null;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  session_teacher_name: string;
}

// ── Hook: fetch all branch clients with attendance ────────────────────────────
function useBranchClients(date: string, branchId: string) {
  return useQuery({
    queryKey: ["branch-clients", date, branchId],
    enabled: !!date && !!branchId,
    queryFn: async () => {
      const { data } = await apiClient.get("/children/branch/", {
        params: { branch_id: branchId, date },
      });
      return (data.children ?? []) as BranchClient[];
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function timeSince(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

// ── Staff Assign Panel ────────────────────────────────────────────────────────
function StaffAssignPanel({
  sessionId, childName, date, branchId, onClose,
}: {
  sessionId: string; childName: string; date: string; branchId: string; onClose: () => void;
}) {
  const { data: staffList, isLoading } = useAvailableStaff(date, branchId, true);
  const assign = useAssignStaffOnArrival();

  const sameBranchStaff = useMemo(
    () => (staffList ?? []).filter((s) => !s.is_cross_branch),
    [staffList]
  );

  const handleAssign = async (staffId: string, staffName: string) => {
    try {
      await assign.mutateAsync({ sessionId, staff_id: staffId });
      toast.success(`Assigned ${staffName} to ${childName}`);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to assign staff");
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Assign staff for <span className="text-blue-900 ml-1">{childName}</span>
        </p>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      {isLoading ? (
        <CardSkeleton count={2} />
      ) : sameBranchStaff.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">No staff available.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white overflow-hidden shadow-sm">
          {sameBranchStaff.map((staff) => (
            <li key={staff.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[11px] font-bold flex-shrink-0">
                  {initials(staff.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{staff.name}</p>
                  <p className="text-[11px] text-muted-foreground">{staff.load} session{staff.load === 1 ? "" : "s"} today</p>
                </div>
              </div>
              <Button
                size="sm"
                disabled={assign.isPending}
                onClick={() => handleAssign(String(staff.id), staff.name)}
                className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs shrink-0"
              >
                Assign
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Client Card ───────────────────────────────────────────────────────────────
function ClientCard({
  client, isToday, date, branchId,
}: {
  client: BranchClient; isToday: boolean; date: string; branchId: string;
}) {
  const [showAssign, setShowAssign] = useState(false);
  const qc = useQueryClient();

  const arrived = client.attendance_marked;
  const leftAt  = client.left_at as string | null | undefined;

  // Mark arrived — uses /children/:child_id/attendance/
  const handleMarkArrived = async () => {
    try {
      await apiClient.post(`/children/${client.child_id}/attendance/`, {
        date,
        branch_id: branchId,
      });
      toast.success(`${client.child_name} marked as arrived`);
      qc.invalidateQueries({ queryKey: ["branch-clients"] });
      setShowAssign(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Failed to mark attendance";
      if (msg.includes("already")) {
        toast.info("Already marked as arrived");
        qc.invalidateQueries({ queryKey: ["branch-clients"] });
      } else {
        toast.error(msg);
      }
    }
  };

  // Undo arrival — uses session attendance delete
  const handleUndoArrival = async () => {
    if (!client.session_id) return;
    try {
      await apiClient.delete(`/sessions/${client.session_id}/attendance/`);
      toast.success("Attendance undone");
      qc.invalidateQueries({ queryKey: ["branch-clients"] });
      setShowAssign(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to undo");
    }
  };

  // Checkout
  const handleCheckout = async () => {
    if (!client.session_id) return;
    try {
      await apiClient.post(`/sessions/${client.session_id}/checkout/`);
      toast.success(`${client.child_name} checked out`);
      qc.invalidateQueries({ queryKey: ["branch-clients"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to checkout");
    }
  };

  // Undo checkout
  const handleUndoCheckout = async () => {
    if (!client.session_id) return;
    try {
      await apiClient.delete(`/sessions/${client.session_id}/checkout/`);
      toast.success("Checkout undone");
      qc.invalidateQueries({ queryKey: ["branch-clients"] });
    } catch (e: any) {
      toast.error("Failed to undo checkout");
    }
  };

  return (
    <div className={cn("rounded-xl border transition-all", arrived ? "bg-emerald-50 border-emerald-200" : "bg-card border-border")}>
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Avatar */}
        <div className={cn("h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
          arrived ? "bg-emerald-200 text-emerald-800" : "bg-slate-100 text-slate-700")}>
          {initials(client.child_name || "?")}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{client.child_name}</p>

          {/* Session time or arrived time */}
          {client.arrived_at ? (
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                <Clock className="h-2.5 w-2.5" />
                IN {new Date(client.arrived_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
              </span>
              <span className="text-[10px] text-muted-foreground">→</span>
              {leftAt ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 border border-orange-200 text-[10px] font-semibold text-orange-700">
                  <LogOut className="h-2.5 w-2.5" />
                  OUT {new Date(leftAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-500">
                  {client.session_end && client.session_end !== client.session_start ? `OUT ${fmtTime(client.session_end)}` : "In session"}
                </span>
              )}
            </div>
          ) : client.session_start ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              {fmtTime(client.session_start)} – {fmtTime(client.session_end!)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">No session scheduled</p>
          )}

          {/* Arrived time ago */}
          {arrived && client.arrived_at && (
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              ✓ Arrived {timeSince(client.arrived_at)}
            </p>
          )}

          {/* Assigned staff */}
          {arrived && (
            <p className="text-xs mt-0.5 flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-500" />
              <span className={cn("font-medium", client.assigned_staff_name ? "text-blue-700" : "text-amber-600")}>
                {client.assigned_staff_name
                  ? `Handled by: ${client.assigned_staff_name}`
                  : "⚠ No staff assigned"}
              </span>
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {isToday ? (
            arrived ? (
              <>
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Present
                </span>

                {client.session_id && (
                  !leftAt ? (
                    <Button
                      size="sm"
                      onClick={handleCheckout}
                      className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 h-8 text-xs"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Left?
                    </Button>
                  ) : (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                        <LogOut className="h-3 w-3" /> Checked Out
                      </span>
                      <button
                        onClick={handleUndoCheckout}
                        className="text-[10px] text-muted-foreground hover:text-rose-500 flex items-center gap-0.5"
                      >
                        <Undo2 className="h-3 w-3" /> Undo
                      </button>
                    </div>
                  )
                )}

                <button
                  onClick={() => setShowAssign((v) => !v)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                  <Users className="h-3 w-3" />
                  {showAssign ? "Hide" : "Assign Staff"}
                  {showAssign ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                {client.session_id && (
                  <button
                    onClick={handleUndoArrival}
                    className="text-[11px] text-muted-foreground hover:text-rose-500 flex items-center gap-1"
                  >
                    <Undo2 className="h-3 w-3" /> Undo arrival
                  </button>
                )}
              </>
            ) : (
              <Button
                size="sm"
                onClick={handleMarkArrived}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs"
              >
                <UserCheck className="h-3.5 w-3.5" /> Arrived?
              </Button>
            )
          ) : (
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border",
              arrived ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-slate-500 bg-slate-50 border-slate-200")}>
              {arrived ? "Present" : "Absent"}
            </span>
          )}
        </div>
      </div>

      {/* Staff assign panel */}
      {isToday && arrived && showAssign && client.session_id && (
        <div className="px-5 pb-4">
          <StaffAssignPanel
            sessionId={client.session_id}
            childName={client.child_name}
            date={date}
            branchId={branchId}
            onClose={() => setShowAssign(false)}
          />
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function TeacherAttendancePage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateStr  = format(selectedDate, "yyyy-MM-dd");
  const isToday  = dateStr === todayISO();
  const branchId = user?.branch_id ?? user?.branch_ids?.[0] ?? "";

  const { data: clients = [], isLoading } = useBranchClients(dateStr, branchId);

  const arrived = clients.filter((c) => c.attendance_marked);
  const pending = clients.filter((c) => !c.attendance_marked);

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Client Attendance"
        description="Mark client arrivals and assign staff for your branch"
        action={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                {isToday ? "Today" : format(selectedDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} />
            </PopoverContent>
          </Popover>
        }
      />

      {/* Stats */}
      {isLoading ? (
        <CardSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: <BookOpen className="h-5 w-5 text-blue-600" />, label: "Total Clients", value: clients.length, bg: "bg-blue-50", color: "text-blue-700" },
            { icon: <UserCheck className="h-5 w-5 text-emerald-600" />, label: "Arrived", value: arrived.length, bg: "bg-emerald-50", color: "text-emerald-700" },
            { icon: <Clock className="h-5 w-5 text-amber-500" />, label: "Pending", value: pending.length, bg: "bg-amber-50", color: "text-amber-700" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-4 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", s.bg)}>{s.icon}</div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isToday && clients.length > 0 && (
        <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
          💡 Press <strong>Arrived?</strong> when a client walks in, then assign a staff member.
        </p>
      )}

      {/* Pending */}
      {isToday && pending.length > 0 && (
        <SectionCard title={`⏳ Waiting to Arrive (${pending.length})`} description="Clients not yet marked as arrived">
          <div className="p-4 space-y-2">
            {pending.map((c) => (
              <ClientCard key={c.child_id} client={c} isToday={isToday} date={dateStr} branchId={branchId} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Arrived */}
      {arrived.length > 0 && (
        <SectionCard title={`✅ Arrived (${arrived.length})`} description="Clients present — assign or reassign staff if needed">
          <div className="p-4 space-y-2">
            {arrived.map((c) => (
              <ClientCard key={c.child_id} client={c} isToday={isToday} date={dateStr} branchId={branchId} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Past date view */}
      {!isToday && clients.length > 0 && (
        <SectionCard title={`Sessions on ${format(selectedDate, "MMM d, yyyy")} (${clients.length})`} description="Attendance record for this date">
          <div className="p-4 space-y-2">
            {clients.map((c) => (
              <ClientCard key={c.child_id} client={c} isToday={false} date={dateStr} branchId={branchId} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Empty state */}
      {!isLoading && clients.length === 0 && (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No clients in this branch</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {branchId ? "No clients have been added to your branch yet." : "Branch not assigned to your account."}
          </p>
        </div>
      )}
    </div>
  );
}

export default TeacherAttendancePage;