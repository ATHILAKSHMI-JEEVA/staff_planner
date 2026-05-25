import { useState } from "react";
import { toast } from "sonner";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAvailableSlots, useReschedule, useConfirmReschedule } from "../hooks/useSessions";
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
  Calendar as CalendarIcon, Clock, Users, Palmtree, ArrowLeft, Loader2,
  CheckCircle2, XCircle,
} from "lucide-react";
import { fmtTime, isSunday, todayISO } from "@/utils/date.utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

  const handleDecision = async (decision: "approved" | "rejected") => {
    try {
      const result = await confirm.mutateAsync({ session_id: sessionId, decision });
      if (result.confirmed) {
        toast.success("Reschedule confirmed! Session has been updated.");
        onConfirmed();
      } else {
        toast.info("Reschedule cancelled. You can pick a different slot.");
        onClose();
      }
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
          {/* Reject = go back and pick another */}
          <Button
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => handleDecision("rejected")}
            disabled={confirm.isPending}
          >
            <XCircle className="h-4 w-4 text-destructive" />
            No, go back
          </Button>

          {/* Approve = confirm the reschedule */}
          <Button
            className="flex-1 gap-1.5"
            onClick={() => handleDecision("approved")}
            disabled={confirm.isPending}
          >
            {confirm.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Yes, confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Reschedule Page ───────────────────────────────────────────────────────────
export function Reschedule() {
  const { session, child } = useSearch({ from: "/_app/parent/reschedule" });
  const [pickDate, setPickDate] = useState(todayISO());
  const [reason, setReason] = useState("");
  const [picking, setPicking] = useState<string | null>(null);

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

  // Step 1: Parent clicks "Choose This Slot" → save as pending, open confirm dialog
  const handleChooseSlot = async (slotId: string) => {
    if (!session || !child) {
      toast.error("Missing session or child reference");
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

      // Show confirm dialog with the chosen slot details
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
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today || isSunday(format(date, "yyyy-MM-dd"));
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </SectionCard>

      {/* Available slots */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Available Slots — {format(new Date(pickDate), "EEEE, MMM d")}
        </h2>

        {sunday ? (
          <EmptyState
            icon={<Palmtree className="h-5 w-5" />}
            title="This is a holiday"
            description="No sessions available on Sundays."
          />
        ) : slots.isLoading ? (
          <CardSkeleton count={3} />
        ) : !slots.data || slots.data.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className="h-5 w-5" />}
            title="No slots available"
            description="Try selecting a different date."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slots.data.map((s) => {
              const remaining = Math.max(0, (s.max_children || 0) - (s.spots_taken || 0));
              const full = remaining === 0;
              const isLoading = picking === s.id;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-xl border bg-card p-5 transition-all duration-150",
                    full ? "opacity-60" : "hover:shadow-md hover:border-primary/30"
                  )}
                >
                  <p className="font-semibold text-sm">{s.teacher_name}</p>
                  <div className="space-y-1.5 mt-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                    </p>
                    <p className={cn(
                      "text-xs flex items-center gap-1.5 font-medium",
                      full ? "text-red-600" : remaining <= 2 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      <Users className="h-3.5 w-3.5" />
                      {full ? "No spots left" : `${remaining} spot${remaining !== 1 ? "s" : ""} remaining`}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleChooseSlot(s.id)}
                    disabled={full || !!picking}
                    size="sm"
                    className="mt-4 w-full gap-1.5 text-xs font-semibold"
                    variant={full ? "outline" : "default"}
                  >
                    {isLoading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</>
                    ) : full ? "Fully Booked" : "Choose This Slot"}
                  </Button>
                </div>
              );
            })}
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