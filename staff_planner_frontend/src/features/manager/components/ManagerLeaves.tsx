import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useManagerLeaves, useManagerDecideLeave } from "../hooks/useManager";
import { CardSkeleton, EmptyState, ShortfallChip, StatusBadge, PageHeader, SectionCard, FilterTabs } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDateLong, fmtRelative } from "@/utils/date.utils";
import { Inbox, Search, CheckCircle, XCircle, Loader2, Pencil, Trash2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";

type StatusFilter = "all" | "pending" | "approved" | "rejected";
const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all",      label: "All"      },
  { value: "pending",  label: "Pending"  },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function ManagerLeaves() {
  const q = useManagerLeaves();
  const decide = useManagerDecideLeave();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [acting, setActing] = useState<string | null>(null);

  const { can, canRead, canWrite, canDelete, canApprove } = usePermissions();
  const hasRead    = canRead("leaves");
  const hasWrite   = canWrite("leaves");
  const hasDelete  = canDelete("leaves");
  const hasApprove = canApprove("leaves");

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
      const matchStatus = statusFilter === "all" || (l.status || "pending").toLowerCase() === statusFilter;
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

  if (!hasRead) {
    return (
      <div className="space-y-5 page-enter">
        <PageHeader title="Leave Management" description="Review and approve teacher leave requests" />
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="Access Denied"
          description="You don't have permission to view leave requests. Contact your admin."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 page-enter">
      <PageHeader
        title="Leave Management"
        description="Review and approve teacher leave requests"
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
          ✓ View
        </span>
        {hasWrite && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
            ✓ Edit
          </span>
        )}
        {hasDelete && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-red-50 text-red-700 border border-red-200">
            ✓ Delete
          </span>
        )}
        {hasApprove && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✓ Approve
          </span>
        )}
        {can("leaves", "manage") && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-violet-50 text-violet-700 border border-violet-200">
            ✓ Manage
          </span>
        )}
      </div>

      {q.isLoading ? (
        <CardSkeleton />
      ) : q.isError ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="Could not load leaves"
          description={(q.error as any)?.response?.data?.message || "You may not have permission or the server is unreachable."}
        />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="Nothing to review"
          description="All leave requests have been handled."
        />
      ) : (
        <SectionCard>
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by teacher, reason, date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                  {(hasApprove || hasWrite || hasDelete) && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Action</TableHead>
                  )}
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
                          {(l as any).leave_type || "Full Day"}
                          {(l as any).leave_type === "Custom Hours" && (l as any).start_time && (l as any).end_time
                            ? ` (${(l as any).start_time}–${(l as any).end_time})` : ""}
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
                      {(hasApprove || hasWrite || hasDelete) && (
                        <TableCell>
                          <div className="flex gap-1.5 flex-wrap">
                            {hasApprove && isPending && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-semibold"
                                  onClick={() => act(l.id, "approved")}
                                  disabled={!!acting}
                                >
                                  {acting === l.id + "approved" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                  <span className="hidden sm:inline">Approve</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-xs font-semibold"
                                  onClick={() => act(l.id, "rejected")}
                                  disabled={!!acting}
                                >
                                  {acting === l.id + "rejected" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                  <span className="hidden sm:inline">Reject</span>
                                </Button>
                              </>
                            )}
                            {hasWrite && (
                              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-semibold" disabled>
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            )}
                            {hasDelete && (
                              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold" disabled>
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
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