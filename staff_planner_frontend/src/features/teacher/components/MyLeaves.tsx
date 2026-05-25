import { useState, useMemo } from "react";
import { useMyLeaves, useUpdateLeave } from "../hooks/useLeaves";
import {
  CardSkeleton,
  EmptyState,
  ShortfallChip,
  StatusBadge,
  PageHeader,
  SectionCard,
  FilterTabs,
} from "@/components/shared";
import { fmtDateLong, fmtRelative, isSunday } from "@/utils/date.utils";
import { FileText, RotateCw, Search, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { LeaveRequest } from "@/types";

type ExtendedLeave = LeaveRequest & {
  leave_type?: string;
  start_time?: string;
  end_time?: string;
  rotation_streak?: number;
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all",      label: "All"      },
  { value: "pending",  label: "Pending"  },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditLeaveModal({
  leave,
  open,
  onClose,
}: {
  leave: ExtendedLeave;
  open: boolean;
  onClose: () => void;
}) {
  const updateLeave = useUpdateLeave();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    leave.date ? parseISO(leave.date) : undefined
  );
  const [calOpen, setCalOpen]   = useState(false);
  const [reason, setReason]     = useState(leave.reason ?? "");
  const [leaveType, setLeaveType] = useState(leave.leave_type ?? "Full Day");
  const [startTime, setStartTime] = useState(leave.start_time ?? "");
  const [endTime, setEndTime]   = useState(leave.end_time ?? "");

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || isSunday(format(date, "yyyy-MM-dd"));
  };

  const handleSave = async () => {
    if (!selectedDate) { toast.error("Please select a date"); return; }
    if (reason.trim().length < 10) { toast.error("Reason must be at least 10 characters"); return; }

    try {
      await updateLeave.mutateAsync({
        id: leave.id,
        date: format(selectedDate, "yyyy-MM-dd"),
        reason: reason.trim(),
        leave_type: leaveType,
        start_time: leaveType === "Custom Hours" ? startTime : undefined,
        end_time:   leaveType === "Custom Hours" ? endTime   : undefined,
      });
      toast.success("Leave request updated!");
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update leave");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Leave Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Date */}
          <div>
            <Label>Leave Date</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
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
                      setCalOpen(false);
                    }
                  }}
                  disabled={isDateDisabled}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Leave Type */}
          <div>
            <Label>Leave Type</Label>
            <Select onValueChange={setLeaveType} value={leaveType}>
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

          {/* Custom Hours */}
          {leaveType === "Custom Hours" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-2" />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-2" />
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason for leave..."
              className="mt-2"
              rows={3}
            />
            {reason.trim().length > 0 && reason.trim().length < 10 && (
              <p className="text-destructive text-sm mt-1">Reason must be at least 10 characters</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={updateLeave.isPending}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={updateLeave.isPending}>
              {updateLeave.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── MyLeaves Page ────────────────────────────────────────────────────────────
export function MyLeaves() {
  const q = useMyLeaves();
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editingLeave, setEditingLeave] = useState<ExtendedLeave | null>(null);

  const counts = useMemo(() => {
    if (!q.data) return {} as Record<StatusFilter, number>;
    return {
      all:      q.data.length,
      pending:  q.data.filter(l => l.status.toLowerCase() === "pending").length,
      approved: q.data.filter(l => l.status.toLowerCase() === "approved").length,
      rejected: q.data.filter(l => l.status.toLowerCase() === "rejected").length,
    };
  }, [q.data]);

  const filtered = useMemo(() => {
    if (!q.data) return [];
    return q.data.filter((l) => {
      const matchStatus = statusFilter === "all" || l.status.toLowerCase() === statusFilter;
      const matchSearch =
        search === "" ||
        l.reason?.toLowerCase().includes(search.toLowerCase()) ||
        l.date?.includes(search) ||
        (l as ExtendedLeave).leave_type?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [q.data, search, statusFilter]);

  return (
    <div className="space-y-5 page-enter">
      <PageHeader title="My Leaves" description="All your leave requests" />

      {q.isLoading ? (
        <CardSkeleton />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No leaves yet"
          description="Your submitted leave requests will appear here."
        />
      ) : (
        <SectionCard>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reason, date, type…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <FilterTabs tabs={TABS} active={statusFilter} onChange={setStatusFilter} counts={counts} />
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No results match your filter.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b bg-muted/20">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wide">Reason</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wide">Submitted</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const el = l as ExtendedLeave;
                  return (
                    <TableRow key={l.id} className="transition-colors">
                      <TableCell className="font-medium text-sm whitespace-nowrap">
                        {fmtDateLong(l.date)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/20">
                          {el.leave_type || "Full Day"}
                          {el.leave_type === "Custom Hours" && el.start_time && el.end_time
                            ? ` (${el.start_time}–${el.end_time})` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs">
                        <p className="truncate text-sm text-muted-foreground">{l.reason}</p>
                        {el.rotation_streak && el.rotation_streak >= 3 && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1">
                            <RotateCw className="h-3 w-3" /> Rotation recommended
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {l.shortfall_detected && <ShortfallChip />}
                          <StatusBadge status={l.status} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {fmtRelative(l.created_at)}
                      </TableCell>

                      {/* ✅ Edit button — only for pending */}
                      <TableCell>
                        {l.status.toLowerCase() === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Edit leave"
                            onClick={() => setEditingLeave(el)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      )}

      {/* Edit Modal */}
      {editingLeave && (
        <EditLeaveModal
          leave={editingLeave}
          open={!!editingLeave}
          onClose={() => setEditingLeave(null)}
        />
      )}
    </div>
  );
}