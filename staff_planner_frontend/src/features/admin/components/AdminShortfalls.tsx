import { useState } from "react";
import { useShortfalls } from "@/features/admin/hooks/useShortfalls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, AlertTriangle, CheckCircle, Clock, Users, UserPlus } from "lucide-react";
import { format, isSunday } from "date-fns";
import { SubstitutePicker } from "./SubstitutePicker";
import { CardSkeleton, PageHeader } from "@/components/shared";
import { cn } from "@/lib/utils";

function StatCard({ icon, label, value, color, iconBg }: { icon: React.ReactNode; label: string; value: number; color: string; iconBg: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>{icon}</div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={cn("text-3xl font-bold tracking-tight mt-1", color)}>{value}</p>
      </div>
    </div>
  );
}

export function AdminShortfalls() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expandedShortfall, setExpandedShortfall] = useState<string | null>(null);
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: shortfalls = [], isLoading } = useShortfalls(dateStr);
  const isHoliday = isSunday(selectedDate);

  const total = shortfalls.length;
  const pending = shortfalls.filter(s => s.pending && s.pending.length > 0).length;
  const resolved = total - pending;

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Shortfalls"
        description="Pending sessions due to teacher leaves"
        action={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} />
            </PopoverContent>
          </Popover>
        }
      />

      {/* KPI cards */}
      {!isHoliday && !isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-600" />} label="Total Shortfalls" value={total} color="text-red-600" iconBg="bg-red-50" />
          <StatCard icon={<Clock className="h-5 w-5 text-amber-600" />} label="Pending Assignment" value={pending} color="text-amber-600" iconBg="bg-amber-50" />
          <StatCard icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} label="Resolved" value={resolved} color="text-emerald-600" iconBg="bg-emerald-50" />
        </div>
      )}

      {isHoliday ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-4xl mb-4">🏖️</p>
          <p className="text-lg font-semibold">Sunday / Holiday</p>
          <p className="text-sm text-muted-foreground mt-1">No sessions scheduled on this day</p>
        </div>
      ) : isLoading ? (
        <CardSkeleton count={2} />
      ) : shortfalls.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="font-semibold text-emerald-700">No shortfalls for this date</p>
          <p className="text-sm text-muted-foreground mt-1">All sessions are covered</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shortfalls.map((s) => (
            <div key={s.leave_id} className="rounded-xl border bg-card overflow-hidden shadow-sm">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b bg-red-50/40">
                <div>
                  <p className="font-semibold text-sm">{s.teacher_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(s.date), "PPP")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Users className="h-4 w-4" />{s.affected_count} affected
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Shortfall
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-2.5">
                {s.pending?.map((p, i) => (
                  <div key={i} className="rounded-lg border bg-muted/20 p-3.5">
                    <div className="flex justify-between items-center gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-sm">{p.child_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Parent: {p.parent_name}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={expandedShortfall === `${s.leave_id}-${i}` ? "default" : "outline"}
                        className="h-8 gap-1.5 text-xs font-semibold"
                        onClick={() => setExpandedShortfall(
                          expandedShortfall === `${s.leave_id}-${i}` ? null : `${s.leave_id}-${i}`
                        )}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {expandedShortfall === `${s.leave_id}-${i}` ? "Close" : "Assign Sub"}
                      </Button>
                    </div>
                    {expandedShortfall === `${s.leave_id}-${i}` && (
                      <div className="mt-3 pt-3 border-t">
                        <SubstitutePicker
                          sessionId={p.session_id || s.leave_id}
                          childName={p.child_name}
                          date={s.date}
                          branchId={p.branch_id}
                          onDone={() => setExpandedShortfall(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
