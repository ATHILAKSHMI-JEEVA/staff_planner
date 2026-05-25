import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useMySessions } from "@/hooks/useSessions";
import { useMyLeaves } from "@/features/teacher/hooks/useLeaves";
import { CardSkeleton, EmptyState, StatusBadge, PageHeader, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Clock, Plus, BookOpen, FileText, CheckCircle } from "lucide-react";
import { fmtDateLong, fmtTime, todayISO } from "@/utils/date.utils";
import { LeaveForm } from "./LeaveForm";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

function StatCard({
  icon, label, value, sub, color, iconBg,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode;
  sub?: string; color: string; iconBg: string;
}) {
  return (
    <div className={cn("stat-card rounded-xl border bg-card p-5 flex items-start gap-4 cursor-default transition-shadow")}>
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={cn("text-3xl font-bold mt-1 tracking-tight", color)}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export function TeacherDashboard() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const sessions = useMySessions(dateStr);
  const myLeaves = useMyLeaves();

  const { canWrite: canWriteLeaves, canRead: canReadLeaves } = usePermissions();
  const canApplyLeave = canWriteLeaves("leaves");
  const canViewLeaves = canReadLeaves("leaves");

  const pendingLeaves = myLeaves.data?.filter(l => l.status === "pending")?.length ?? 0;
  const approvedLeaves = myLeaves.data?.filter(l => l.status === "approved")?.length ?? 0;
  const todaySessions = sessions.data?.length ?? 0;

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title={`Hello, ${user?.name?.split(" ")[0] || "Teacher"} 👋`}
        description={fmtDateLong(todayISO())}
        action={
          canApplyLeave ? (
            <Button onClick={() => setShowLeaveForm(v => !v)} size="sm" className="gap-2 shadow-sm shadow-indigo-500/20">
              <Plus className="h-4 w-4" />
              Apply Leave
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sessions.isLoading || myLeaves.isLoading ? (
          <div className="col-span-3"><CardSkeleton count={3} /></div>
        ) : (
          <>
            <StatCard
              icon={<BookOpen className="h-5 w-5 text-blue-600" />}
              label="Today's Sessions"
              value={todaySessions}
              sub={todaySessions === 1 ? "1 session scheduled" : `${todaySessions} sessions scheduled`}
              color="text-blue-600"
              iconBg="bg-blue-50"
            />
            {canViewLeaves && (
              <StatCard
                icon={<FileText className="h-5 w-5 text-amber-600" />}
                label="Pending Leaves"
                value={pendingLeaves}
                sub={pendingLeaves === 0 ? "Nothing awaiting review" : "Awaiting admin review"}
                color="text-amber-600"
                iconBg="bg-amber-50"
              />
            )}
            {canViewLeaves && (
              <StatCard
                icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
                label="Approved Leaves"
                value={approvedLeaves}
                sub="Total this period"
                color="text-emerald-600"
                iconBg="bg-emerald-50"
              />
            )}
          </>
        )}
      </div>

      {showLeaveForm && (
        <SectionCard title="Apply for Leave" action={
          <button
            onClick={() => setShowLeaveForm(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        }>
          <div className="p-5">
            <LeaveForm />
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="My Sessions"
        action={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(selectedDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md"
              />
            </PopoverContent>
          </Popover>
        }
      >
        <div className="p-5">
          {sessions.isLoading ? (
            <CardSkeleton count={2} />
          ) : !sessions.data || sessions.data.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon className="h-5 w-5" />}
              title="No sessions on this date"
              description="No scheduled sessions found. Try selecting a different date."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sessions.data.map((s) => (
                <div key={s.id} className="rounded-lg border bg-muted/20 p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{s.child_name || "Child"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}