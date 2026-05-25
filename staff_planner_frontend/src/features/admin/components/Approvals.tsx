import { useState, useMemo } from "react";
import { toast } from "sonner";
import { usePendingLeaves, useDecideLeave } from "@/features/teacher/hooks/useLeaves";
import { CardSkeleton, EmptyState, ShortfallChip, StatusBadge, PageHeader, SectionCard, FilterTabs } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDateLong, fmtRelative } from "@/utils/date.utils";
import { Inbox, Search, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type StatusFilter = "all" | "pending" | "approved" | "rejected";
const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all",      label: "All"      },
  { value: "pending",  label: "Pending"  },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function Approvals() {
  const q = usePendingLeaves();
  const decide = useDecideLeave();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [acting, setActing] = useState<string | null>(null);

  const counts = useMemo(() => {
    if (!q.data) return {} as Record<StatusFilter, number>;
    return {
      all: q.data.length,
      pending: q.data.filter(l => (l.status || "pending").toLowerCase() === "pending").length,
      approved: q.data.filter(l => (l.status || "").toLowerCase() === "approved").length,
      rejected: q.data.filter(l => (l.status || "").toLowerCase() === "rejected").length,
    };
  }, [q.data]);

  const filtered = useMemo(() => {
    if (!q.data) return [];
    return q.data.filter((l) => {
      const matchStatus = statusFilter === "all" || (l.status || "pending")?.toLowerCase() === statusFilter;
      const matchSearch = search === "" ||
        l.teacher_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.reason?.toLowerCase().includes(search.toLowerCase()) ||
        l.date?.includes(search);
      return matchStatus && matchSearch;
    });
  }, [q.data, search, statusFilter]);

  const act = async (id: string, decision: "approved" | "rejected") => {
    setActing(id + decision);
    try {
      await decide.mutateAsync({ id, decision });
      toast.success(`Leave ${decision}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-5 page-enter">
      <PageHeader
        title="Approvals"
        description="Manage teacher leave requests"
      />

      {q.isLoading ? (
        <CardSkeleton />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState icon={<Inbox className="h-5 w-5" />} title="Nothing to review" description="All leave requests have been handled." />
      ) : (
        <SectionCard>
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by teacher, reason, date…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <FilterTabs tabs={TABS} active={statusFilter} onChange={setStatusFilter} counts={counts} />
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No results match your filter.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b bg-muted/20">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Teacher</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Date</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wide">Reason</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wide">Submitted</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const isPending = (l.status || "pending").toLowerCase() === "pending";
                  return (
                    <TableRow key={l.id} className={isPending ? "bg-amber-50/30" : ""}>
                      <TableCell className="font-semibold text-sm">{l.teacher_name || "Teacher"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{fmtDateLong(l.date)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/15">
                          {l.leave_type || "Full Day"}
                          {l.leave_type === "Custom Hours" && l.start_time && l.end_time
                            ? ` (${l.start_time}–${l.end_time})` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-xs">
                        <p className="truncate text-sm text-muted-foreground">{l.reason}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {l.shortfall_detected && <ShortfallChip />}
                          <StatusBadge status={l.status || "pending"} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {fmtRelative(l.created_at)}
                      </TableCell>
                      <TableCell>
                        {isPending ? (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline"
                              className="h-8 gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
                              onClick={() => act(l.id, "approved")} disabled={!!acting}>
                              {acting === l.id + "approved" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              <span className="hidden sm:inline">Approve</span>
                            </Button>
                            <Button size="sm" variant="outline"
                              className="h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                              onClick={() => act(l.id, "rejected")} disabled={!!acting}>
                              {acting === l.id + "rejected" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                              <span className="hidden sm:inline">Reject</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
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
    </div>
  );
}
