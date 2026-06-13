// src/features/admin/components/AttendancePage.tsx
// Admin/Manager view: see today's client arrivals and decide which staff handles which client

import { useState, useMemo } from "react";
import { useAttendanceList } from "@/features/teacher/hooks/useSessions";
import { useAllSessions } from "@/features/teacher/hooks/useSessions";
import { useBranches } from "@/features/admin/hooks/useBranches";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { CardSkeleton, PageHeader, SectionCard } from "@/components/shared";
import { format } from "date-fns";
import { todayISO, fmtDateLong, fmtTime } from "@/utils/date.utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon, UserCheck, Users, BookOpen, Clock, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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

export function AttendancePage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isToday = dateStr === todayISO();

  const branches = useBranches();
  const branchId = selectedBranch === "all" ? (user?.branch_id || "") : selectedBranch;
  const attendance = useAttendanceList(dateStr, branchId || undefined);
  const sessions = useAllSessions(dateStr, branchId);

  // Sessions without attendance = clients not yet arrived
  const attendedSessionIds = useMemo(
    () => new Set((attendance.data ?? []).map((a) => a.session_id)),
    [attendance.data]
  );

  const sessionsWithAttendance = useMemo(
    () => (sessions.data ?? []).filter((s) => attendedSessionIds.has(s.id)),
    [sessions.data, attendedSessionIds]
  );
  const sessionsWithout = useMemo(
    () => (sessions.data ?? []).filter((s) => !attendedSessionIds.has(s.id)),
    [sessions.data, attendedSessionIds]
  );

  // Group attendance by staff (for the "who is handling what" view)
  const byStaff = useMemo(() => {
    const map: Record<string, { staff_name: string; records: typeof attendance.data }> = {};
    (attendance.data ?? []).forEach((att) => {
      if (!map[att.staff_id]) map[att.staff_id] = { staff_name: att.staff_name, records: [] };
      map[att.staff_id].records!.push(att);
    });
    return Object.entries(map);
  }, [attendance.data]);

  const isLoading = attendance.isLoading || sessions.isLoading;

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Attendance & Client Arrivals"
        description="See which clients have arrived and which staff are handling sessions"
        action={
          <div className="flex items-center gap-2">
            {branches.data && branches.data.length > 1 && (
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.data.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
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
      />

      {/* Summary stats */}
      {isLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              icon: <BookOpen className="h-5 w-5 text-slate-600" />,
              label: "Total Sessions",
              value: sessions.data?.length ?? 0,
              bg: "bg-slate-50",
              color: "text-slate-800",
            },
            {
              icon: <UserCheck className="h-5 w-5 text-emerald-600" />,
              label: "Clients Arrived",
              value: attendance.data?.length ?? 0,
              bg: "bg-emerald-50",
              color: "text-emerald-700",
            },
            {
              icon: <Clock className="h-5 w-5 text-amber-500" />,
              label: "Not Yet Arrived",
              value: sessionsWithout.length,
              bg: "bg-amber-50",
              color: "text-amber-700",
            },
            {
              icon: <Users className="h-5 w-5 text-blue-600" />,
              label: "Staff Active",
              value: byStaff.length,
              bg: "bg-blue-50",
              color: "text-blue-700",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-4 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", s.bg)}>
                {s.icon}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clients who have arrived — staff handling view */}
      <SectionCard
        title={`✅ Clients Arrived (${attendance.data?.length ?? 0})`}
      >
        <div className="p-5">
          {isLoading ? (
            <CardSkeleton count={3} />
          ) : (attendance.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {isToday ? "No clients have arrived yet." : "No attendance records for this date."}
            </p>
          ) : (
            <div className="space-y-4">
              {byStaff.map(([staffId, { staff_name, records }]) => (
                <div key={staffId} className="rounded-xl border border-border overflow-hidden">
                  {/* Staff header */}
                  <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[11px] font-bold">
                      {initials(staff_name)}
                    </div>
                    <span className="text-white font-semibold text-sm">{staff_name}</span>
                    <span className="ml-auto text-slate-300 text-xs">
                      {records!.length} client{records!.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Client rows */}
                  <div className="divide-y divide-border">
                    {records!.map((att) => (
                      <div key={att.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-[11px] font-bold">
                          {initials(att.child_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{att.child_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Session {att.session_start}–{att.session_end} · Arrived {timeSince(att.arrived_at)}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <UserCheck className="h-3 w-3" /> Present
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Clients not yet arrived */}
      {sessionsWithout.length > 0 && (
        <SectionCard
          title={`⏳ Not Yet Arrived (${sessionsWithout.length})`}
        >
          <div className="p-5">
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Staff</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessionsWithout.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                            {initials(s.child_name || "?")}
                          </div>
                          <span className="font-medium">{s.child_name || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.teacher_name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                          {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}