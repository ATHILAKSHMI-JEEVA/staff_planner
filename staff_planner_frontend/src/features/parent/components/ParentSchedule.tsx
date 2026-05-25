import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock, Users } from "lucide-react";
import { CardSkeleton, EmptyState, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useMyChildren, useChildSessions } from "@/features/parent/hooks/useSessions";
import { fmtDateLong, fmtTime, todayISO } from "@/utils/date.utils";
import type { Session } from "@/types";
import { cn } from "@/lib/utils";

/** Group sessions by date into an ordered map */
function groupByDate(sessions: Session[]): Map<string, Session[]> {
  return sessions.reduce((acc, s) => {
    const list = acc.get(s.date) ?? [];
    list.push(s);
    acc.set(s.date, list);
    return acc;
  }, new Map<string, Session[]>());
}

export function ParentSchedule() {
  const today = todayISO();
  const navigate = useNavigate();

  const { data: children, isLoading: childrenLoading } = useMyChildren();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedChild = children?.[selectedIdx];

  const { data: sessions, isLoading: sessionsLoading } = useChildSessions(
    selectedChild?.id,
    today,
    !!selectedChild?.id
  );

  const grouped = groupByDate(sessions ?? []);

  // ── Loading: children ──────────────────────────────────────────
  if (childrenLoading) return <CardSkeleton count={3} />;

  // ── Empty: no children found ───────────────────────────────────
  if (!children || children.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8" />}
        title="No children found"
        description="No children are linked to your account yet."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Child selector tabs (only when multiple children) ── */}
      {children.length > 1 && (
        <div className="flex gap-1 border-b pb-0 overflow-x-auto">
          {children.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setSelectedIdx(i)}
              className={cn(
                "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                i === selectedIdx
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Sessions list ─────────────────────────────────────── */}
      {sessionsLoading ? (
        <CardSkeleton count={3} />
      ) : !sessions || sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="No upcoming sessions"
          description="Sessions will appear here once scheduled."
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([date, dateSessions]) => (
            <div key={date}>
              {/* Date header */}
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                {fmtDateLong(date)}
              </p>

              {/* Session cards */}
              <div className="space-y-3">
                {dateSessions.map((s) => {
                  const canReschedule = s.status === "scheduled" && s.date >= today;
                  return (
                    <div
                      key={s.id}
                      className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {(s as any).teacher_name || "Teacher"}
                        </p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                        </p>
                        <StatusBadge status={s.status} />
                      </div>

                      {canReschedule && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() =>
                            navigate({
                              to: "/parent/reschedule" as any,
                              search: {
                                session: s.id,
                                child: selectedChild?.id,
                                date: s.date,
                              } as any,
                            })
                          }
                        >
                          Reschedule
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
