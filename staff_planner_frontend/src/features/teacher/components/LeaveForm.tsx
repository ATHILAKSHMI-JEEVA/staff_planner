import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { useApplyLeave } from "@/features/teacher/hooks/useLeaves";
import { isSunday, todayISO } from "@/utils/date.utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  leave_type: z.enum(["Full Day", "Half Day Morning", "Half Day Afternoon", "Custom Hours"]),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

type LeaveFormData = z.infer<typeof schema>;

export function LeaveForm() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [open, setOpen] = useState(false);
  const applyLeave = useApplyLeave();

  const form = useForm<LeaveFormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: "", leave_type: "Full Day", reason: "" },
  });

  const leaveType = form.watch("leave_type");
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  // Penalty Logic
  const getPenaltyInfo = () => {
    if (!selectedDateStr || selectedDateStr !== todayISO()) return null;
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= 11) return { days: 2.5, message: "After shift start — 2.5 penalty days" };
    if (currentHour >= 8) return { days: 1.5, message: "Emergency leave — 1.5 penalty days" };
    return { days: 1, message: "Same day leave — 1 penalty day" };
  };

  const penalty = getPenaltyInfo();

  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || isSunday(format(date, "yyyy-MM-dd"));
  };

  const onSubmit = async (data: LeaveFormData) => {
    if (!selectedDate) return;

    if (penalty) {
      const confirmMsg = `Same day leave!\nPenalty: ${penalty.days} days salary deduction.\n\nProceed?`;
      if (!confirm(confirmMsg)) return;
    }

    try {
      await applyLeave.mutateAsync({
        date: selectedDateStr,
        leave_type: data.leave_type,
        start_time: data.start_time || undefined,
        end_time: data.end_time || undefined,
        reason: data.reason,
      });

      toast.success("Leave request submitted successfully!");
      form.reset();
      setSelectedDate(undefined);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to submit leave");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {penalty && (
        <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-sm">
          ⚠️ <span className="font-semibold text-red-600">Emergency Leave</span> — {penalty.message}
        </div>
      )}

      <div>
        <Label>Leave Date</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full mt-2 justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date && !isDateDisabled(date)) {
                  setSelectedDate(date);
                  form.setValue("date", format(date, "yyyy-MM-dd"));
                  setOpen(false);
                }
              }}
              disabled={isDateDisabled}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label>Leave Type</Label>
        <Select onValueChange={(v) => form.setValue("leave_type", v as any)} value={leaveType}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Full Day">Full Day</SelectItem>
            <SelectItem value="Half Day Morning">Half Day Morning</SelectItem>
            <SelectItem value="Half Day Afternoon">Half Day Afternoon</SelectItem>
            <SelectItem value="Custom Hours">Custom Hours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {leaveType === "Custom Hours" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Start Time</Label>
            <Input type="time" {...form.register("start_time")} className="mt-2" />
          </div>
          <div>
            <Label>End Time</Label>
            <Input type="time" {...form.register("end_time")} className="mt-2" />
          </div>
        </div>
      )}

      <div>
        <Label>Reason</Label>
        <Textarea
          {...form.register("reason")}
          placeholder="Brief reason for leave..."
          className="mt-2"
          rows={3}
        />
        {form.formState.errors.reason && (
          <p className="text-destructive text-sm mt-1">{form.formState.errors.reason.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={applyLeave.isPending || !selectedDate}>
        {applyLeave.isPending ? "Submitting..." : "Submit Leave Request"}
      </Button>
    </form>
  );
}