import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAvailableSlots, useReschedule, useConfirmReschedule, useRescheduleInfo } from "../hooks/useSessions";
import { CardSkeleton, EmptyState, PageHeader, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon, Clock, Footprints, Sunrise, Sunset, Palmtree, ArrowLeft, Loader2,
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Info,
} from "lucide-react";
import { fmtTime, isSunday, todayISO } from "@/utils/date.utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AvailableSlot } from "@/types";

// ── time helpers (page-local) ───────────────────────────────────────────────
const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

const fmtHourShort = (mins: number) => {
  const d = new Date();
  d.setHours(Math.floor(mins / 60), 0, 0, 0);
  return format(d, "h a");
};

// One accent per teacher — cycles if more than 5 are open on a given day.
// All static class strings are written out in full so Tailwind can see them.
const TEACHER_ACCENTS = [
  { chipBg: "bg-indigo-50", chipText: "text-indigo-700", border: "border-indigo-200", hoverBg: "group-hover:bg-indigo-50", solid: "bg-indigo-500" },
  { chipBg: "bg-teal-50",   chipText: "text-teal-700",   border: "border-teal-200",   hoverBg: "group-hover:bg-teal-50",   solid: "bg-teal-500" },
  { chipBg: "bg-violet-50", chipText: "text-violet-700", border: "border-violet-200", hoverBg: "group-hover:bg-violet-50", solid: "bg-violet-500" },
  { chipBg: "bg-amber-50",  chipText: "text-amber-700",  border: "border-amber-200",  hoverBg: "group-hover:bg-amber-50",  solid: "bg-amber-500" },
  { chipBg: "bg-rose-50",   chipText: "text-rose-700",   border: "border-rose-200",   hoverBg: "group-hover:bg-rose-50",   solid: "bg-rose-500" },
] as const;

interface TeacherGroup {
  teacherId: string;
  name: string;
  slots: AvailableSlot[];
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  slot: {
    teacher_name: string;
    date: string;
    start_time: string;
    end_time: string;
  } | null;
  sessionId: string;
  onClose: () => void;
  onConfirmed: () => void;
}

function ConfirmRescheduleDialog({
  open,
  slot,
  sessionId,
  onClose,
  onConfirmed,
}: ConfirmDialogProps) {
  const confirm = useConfirmReschedule();

  // "Yes" = parent is happy with the slot they picked. The request was
  // already submitted to the backend in handleChooseSlot (status=pending);
  // a parent is never allowed to "approve" their own reschedule (that's a
  // manager/admin action), so we just acknowledge and leave it pending.
  const handleConfirm = () => {
    toast.success("Reschedule request sent! Waiting for manager approval.");
    onConfirmed();
  };

  // "No, go back" = parent changed their mind → cancel the pending request
  // so they can pick a different slot.
  const handleReject = async () => {
    try {
      const result = await confirm.mutateAsync({ session_id: sessionId, decision: "rejected" });
      if (!result.confirmed) {
        toast.info("Reschedule cancelled. You can pick a different slot.");
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Something went wrong");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm Reschedule?</DialogTitle>
          <DialogDescription>
            Please review the new slot before confirming.
          </DialogDescription>
        </DialogHeader>

        {slot && (
          <div className="rounded-xl border bg-muted/40 p-4 space-y-2 my-1">
            <p className="font-semibold text-sm">{slot.teacher_name}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(new Date(slot.date), "EEEE, MMM d, yyyy")}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
            </p>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Are you sure you want to reschedule to this slot?
        </p>

        <div className="flex gap-2 pt-1">
          {/* Reject = cancel the pending request and go back and pick another */}
          <Button
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={handleReject}
            disabled={confirm.isPending}
          >
            {confirm.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            No, go back
          </Button>

          {/* Confirm = keep the pending request as submitted (manager will approve) */}
          <Button
            className="flex-1 gap-1.5"
            onClick={handleConfirm}
          >
            <CheckCircle2 className="h-4 w-4" />
            Yes, confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Teacher switcher (pill tabs) ───────────────────────────────────────────────
function TeacherSwitcher({
  groups,
  activeId,
  onSelect,
}: {
  groups: TeacherGroup[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative">
      <div
        className="flex gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {groups.map((g, i) => {
          const accent = TEACHER_ACCENTS[i % TEACHER_ACCENTS.length];
          const active = g.teacherId === activeId;
          return (
            <button
              key={g.teacherId}
              onClick={() => onSelect(g.teacherId)}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-full border pl-1.5 pr-3.5 py-1.5 text-sm transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0",
                  active ? "bg-white/20 text-white" : cn(accent.chipBg, accent.chipText)
                )}
              >
                {g.name.charAt(0).toUpperCase()}
              </span>
              <span className="font-semibold whitespace-nowrap">{g.name}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-white/20" : "bg-muted text-muted-foreground"
                )}
              >
                {g.slots.length}
              </span>
            </button>
          );
        })}
      </div>
      {/* edge fades hint that the row scrolls */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}

// ── Teacher timeline — the page's signature element ─────────────────────────────
// Renders a teacher's open hours as a literal path across the day: every
// available slot is a footprint a parent can tap, spaced at its real time of
// day, so gaps in a teacher's day are visible at a glance instead of hidden
// inside a uniform button grid.
function TeacherTimelineCard({
  group,
  accent,
  pickDate,
  picking,
  onPick,
}: {
  group: TeacherGroup;
  accent: typeof TEACHER_ACCENTS[number];
  pickDate: string;
  picking: string | null;
  onPick: (slotId: string) => void;
}) {
  const sorted = useMemo(
    () => [...group.slots].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time)),
    [group.slots]
  );

  const rangeStart = Math.max(0, Math.floor(toMinutes(sorted[0].start_time) / 60) * 60 - 30);
  const rawEnd = Math.max(...sorted.map((s) => toMinutes(s.end_time)));
  const rangeEnd = Math.min(24 * 60, Math.ceil(rawEnd / 60) * 60 + 30);
  const total = Math.max(60, rangeEnd - rangeStart);

  const hourSpan = total / 60;
  const step = hourSpan > 8 ? 2 : 1;
  const ticks: number[] = [];
  for (let h = Math.ceil(rangeStart / 60); h * 60 <= rangeEnd; h += step) ticks.push(h * 60);

  const isToday = pickDate === todayISO();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowPct =
    isToday && nowMin >= rangeStart && nowMin <= rangeEnd ? ((nowMin - rangeStart) / total) * 100 : null;

  const railWidth = Math.max(560, Math.round(hourSpan * 110));

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shrink-0", accent.chipBg, accent.chipText)}>
          {group.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{group.name}</p>
          <p className="text-xs text-muted-foreground">
            {sorted.length} open · earliest {fmtTime(sorted[0].start_time)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto px-6 py-9">
        <div className="relative" style={{ minWidth: railWidth, height: 120 }}>
          {/* the path */}
          <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-border" />
          <Sunrise className="absolute top-1/2 -translate-y-1/2 left-0 h-4 w-4 text-amber-400" />
          <Sunset className="absolute top-1/2 -translate-y-1/2 right-0 h-4 w-4 text-orange-400" />

          {/* "now" marker, only for today */}
          {nowPct !== null && (
            <div className="absolute flex flex-col items-center" style={{ left: `${nowPct}%`, top: 2, bottom: 26 }}>
              <span className="text-[10px] font-bold text-rose-500 leading-none mb-1 whitespace-nowrap">Now</span>
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="w-px flex-1 bg-rose-300" />
            </div>
          )}

          {/* footprints — one per open slot, positioned at its real time */}
          {sorted.map((s, idx) => {
            const startMin = toMinutes(s.start_time);
            const endMin = toMinutes(s.end_time);
            const centerPct = ((startMin + (endMin - startMin) / 2 - rangeStart) / total) * 100;
            const remaining = Math.max(0, (s.max_children || 0) - (s.spots_taken || 0));
            const full = remaining === 0;
            const loading = picking === s.id;
            const stagger = idx % 2 === 0 ? -6 : 6;

            return (
              <div
                key={s.id}
                className="absolute"
                style={{ left: `${centerPct}%`, top: "50%", transform: `translate(-50%, calc(-50% + ${stagger}px))` }}
              >
                <button
                  onClick={() => !full && !picking && onPick(s.id)}
                  disabled={full || !!picking}
                  className="group flex flex-col items-center gap-1.5 focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-sm transition-all duration-150",
                      full
                        ? "border-border bg-muted text-muted-foreground/40"
                        : loading
                        ? cn(accent.solid, "border-transparent text-white")
                        : cn("bg-card group-hover:-translate-y-1 group-hover:shadow-md focus-visible:-translate-y-1", accent.border, accent.hoverBg)
                    )}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Footprints className={cn("h-4 w-4", full ? "" : accent.chipText)} />
                    )}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[11px] font-semibold tabular-nums",
                      full ? "text-muted-foreground/50" : "text-foreground/80 group-hover:text-primary"
                    )}
                  >
                    {fmtTime(s.start_time)}
                  </span>
                  {full && <span className="text-[9px] font-bold uppercase tracking-wide text-red-400">Full</span>}
                </button>
              </div>
            );
          })}

          {/* hour ticks along the path */}
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute flex flex-col items-center text-[10px] font-mono text-muted-foreground/70"
              style={{ left: `${((t - rangeStart) / total) * 100}%`, top: 98 }}
            >
              <span className="mb-1 h-2 w-px bg-border" />
              {fmtHourShort(t)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Reschedule Page ───────────────────────────────────────────────────────────
export function Reschedule() {
  const { session, child, date: sessionDate } = useSearch({ from: "/_app/parent/reschedule" });
  // Start with the session's own date if provided (so parent sees that day's slots first)
  const [pickDate, setPickDate] = useState(() => sessionDate || todayISO());
  const [reason, setReason] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{
    id: string;
    teacher_name: string;
    date: string;
    start_time: string;
    end_time: string;
  } | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string>("");

  const sunday = isSunday(pickDate);
  const slots = useAvailableSlots(pickDate, !sunday);
  const reschedule = useReschedule();
  const navigate = useNavigate();

  // Load reschedule limits info
  const rescheduleInfo = useRescheduleInfo(child as string, session as string, !!child && !!session);

  // Group today's slots by teacher so they can be switched between, instead
  // of stacking every teacher's hours one below another.
  const groups: TeacherGroup[] = useMemo(() => {
    if (!slots.data) return [];
    const map = new Map<string, TeacherGroup>();
    for (const s of slots.data) {
      if (!map.has(s.teacher_id)) map.set(s.teacher_id, { teacherId: s.teacher_id, name: s.teacher_name, slots: [] });
      map.get(s.teacher_id)!.slots.push(s);
    }
    return Array.from(map.values());
  }, [slots.data]);

  // Keep the selected teacher valid as the date (and therefore the list of
  // teachers with openings) changes.
  useEffect(() => {
    if (groups.length === 0) return;
    if (!groups.some((g) => g.teacherId === selectedTeacherId)) {
      setSelectedTeacherId(groups[0].teacherId);
    }
  }, [groups, selectedTeacherId]);

  const activeGroup = groups.find((g) => g.teacherId === selectedTeacherId);
  const activeAccent = TEACHER_ACCENTS[Math.max(0, groups.findIndex((g) => g.teacherId === selectedTeacherId)) % TEACHER_ACCENTS.length];

  // If no session/child params, redirect to schedule page
  if (!session || !child) {
    return (
      <div className="space-y-5 page-enter">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate({ to: "/parent" as any })}
            className="h-8 w-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <PageHeader title="Pick a New Slot" description="Choose any available session below" />
        </div>
        <div className="rounded-xl border bg-amber-50 border-amber-200 p-5 text-center space-y-2">
          <p className="text-sm font-medium text-amber-800">No session selected</p>
          <p className="text-sm text-amber-600">Please go to your Schedule and click <strong>Reschedule</strong> on a session first.</p>
          <button
            onClick={() => navigate({ to: "/parent" as any })}
            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-2"
          >
            Go to Schedule →
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Parent clicks slot → submit reschedule request
  const handleChooseSlot = async (slotId: string) => {
    if (!session || !child) {
      toast.error("Please go to Schedule page and click Reschedule on a session.");
      return;
    }
    setPicking(slotId);
    try {
      const result = await reschedule.mutateAsync({
        session_id: session as string,
        new_slot_id: slotId,
        child_id: child as string,
        reason: reason.trim() || undefined,
      });

      // If limit exceeded → admin approval needed → go back directly with info toast
      if ((result as any).needs_admin_approval) {
        toast.info(result.message || "Your request has been sent to admin for approval.");
        navigate({ to: "/parent" as any });
        return;
      }

      // Normal flow → show confirm dialog
      setPendingSlot({ id: slotId, ...result.slot });
      setPendingSessionId(result.session_id);
      setConfirmOpen(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to select slot");
    } finally {
      setPicking(null);
    }
  };

  // Step 2a: Parent confirmed → go back to schedule page
  const handleConfirmed = () => {
    setConfirmOpen(false);
    navigate({ to: "/parent" as any });
  };

  // Step 2b: Parent rejected → stay on page to pick another slot
  const handleDialogClose = () => {
    setConfirmOpen(false);
    setPendingSlot(null);
    setPendingSessionId("");
  };

  const hasSlots = !!slots.data && slots.data.length > 0;

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => navigate({ to: "/parent" as any })}
          className="h-8 w-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader title="Pick a New Slot" description="Choose any available session below" />
      </div>

      {/* ── Reschedule limits info banner ─────────────────────────── */}
      {rescheduleInfo.data && (
        <div className="space-y-2">
          {/* Monthly usage */}
          <div className={cn(
            "rounded-xl border px-4 py-3 flex items-center gap-3 text-sm",
            rescheduleInfo.data.limit_reached
              ? "bg-orange-50 border-orange-200"
              : "bg-blue-50 border-blue-200"
          )}>
            {rescheduleInfo.data.limit_reached
              ? <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
              : <Info className="h-4 w-4 text-blue-500 shrink-0" />
            }
            <div className="flex-1">
              <span className={rescheduleInfo.data.limit_reached ? "text-orange-800 font-medium" : "text-blue-800"}>
                {rescheduleInfo.data.limit_reached
                  ? `Monthly limit reached (${rescheduleInfo.data.used_this_month}/${rescheduleInfo.data.monthly_limit}). Your request will need admin approval.`
                  : `Reschedules used this month: ${rescheduleInfo.data.used_this_month}/${rescheduleInfo.data.monthly_limit}`
                }
              </span>
            </div>
            {/* Progress dots */}
            <div className="flex gap-1 shrink-0">
              {Array.from({ length: rescheduleInfo.data.monthly_limit }).map((_, i) => (
                <div key={i} className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  i < rescheduleInfo.data.used_this_month ? "bg-orange-400" : "bg-blue-200"
                )} />
              ))}
            </div>
          </div>

          {/* Advance notice warning */}
          {rescheduleInfo.data.hours_until_session !== null && !rescheduleInfo.data.notice_ok && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3 text-sm">
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-red-800">
                Session is in {rescheduleInfo.data.hours_until_session}hrs. Minimum {rescheduleInfo.data.advance_notice_hours}hrs notice required — cannot reschedule.
              </span>
            </div>
          )}

          {rescheduleInfo.data.notice_ok && rescheduleInfo.data.hours_until_session !== null && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-emerald-800">
                {rescheduleInfo.data.advance_notice_hours}hrs advance notice ✓ — Reschedule is allowed.
              </span>
            </div>
          )}
        </div>
      )}

      <SectionCard title="Reschedule Details">
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Reason for rescheduling</Label>
            <Textarea
              id="reason"
              placeholder="Optional — describe why you're rescheduling…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="resize-none text-sm h-20"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Select date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 h-10 text-sm font-normal">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(pickDate), "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={new Date(pickDate)}
                  onSelect={(d) => {
                    if (d) {
                      const newDateStr = format(d, "yyyy-MM-dd");
                      if (isSunday(newDateStr)) {
                        toast.error("Sundays are holidays. Please select another date.");
                      } else {
                        setPickDate(newDateStr);
                      }
                    }
                  }}
                  disabled={(date) => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setHours(23, 59, 59, 999);
                    return date <= yesterday || isSunday(format(date, "yyyy-MM-dd"));
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </SectionCard>

      {/* Available slots */}
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Available Slots — {format(new Date(pickDate), "EEEE, MMM d")}
            </h2>
            {!sunday && !slots.isLoading && hasSlots && (
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{slots.data!.length}</span> open across{" "}
                <span className="font-semibold text-foreground">{groups.length}</span> teacher{groups.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {!sunday && !slots.isLoading && hasSlots && (
            <p className="text-xs text-muted-foreground/80">Tap a footprint on the path to claim that time.</p>
          )}
        </div>

        {sunday ? (
          <EmptyState
            icon={<Palmtree className="h-5 w-5" />}
            title="This is a holiday"
            description="No sessions available on Sundays."
          />
        ) : slots.isLoading ? (
          <CardSkeleton count={3} />
        ) : !hasSlots ? (
          <EmptyState
            icon={<CalendarIcon className="h-5 w-5" />}
            title="No slots available"
            description="Try selecting a different date."
          />
        ) : (
          <div className="space-y-4">
            <TeacherSwitcher groups={groups} activeId={selectedTeacherId} onSelect={setSelectedTeacherId} />
            {activeGroup && (
              <TeacherTimelineCard
                group={activeGroup}
                accent={activeAccent}
                pickDate={pickDate}
                picking={picking}
                onPick={handleChooseSlot}
              />
            )}
          </div>
        )}
      </div>

      {/* ✅ Confirm Dialog */}
      <ConfirmRescheduleDialog
        open={confirmOpen}
        slot={pendingSlot}
        sessionId={pendingSessionId}
        onClose={handleDialogClose}
        onConfirmed={handleConfirmed}
      />
    </div>
  );
}