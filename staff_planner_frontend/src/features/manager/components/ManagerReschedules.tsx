import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useManagerReschedules, useManagerDecideReschedule } from "../hooks/useManager";
import { CardSkeleton, EmptyState, StatusBadge, PageHeader, SectionCard, FilterTabs } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDateLong, fmtRelative } from "@/utils/date.utils";
import { Inbox, Search, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { RescheduleRequest } from "@/types";

type Filter = "all" | "pending" | "approved" | "rejected";
const TABS: { value: Filter; label: string }[] = [
  { value: "all",      label: "All"      },
  { value: "pending",  label: "Pending"  },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function getRescheduleStatus(r: RescheduleRequest): string {
  return r.reschedule_status || "pending";
}

// Backend stores "pending:...", "pending-virtual:...", "pending-admin:..."
// (extra slot details encoded after the prefix), so we must match the
// PREFIX, not the exact string.
function isPendingStatus(status: string): boolean {
  return status.startsWith("pending");
}

export function ManagerReschedules() {
  const q = useManagerReschedules();
  const decide = useManagerDecideReschedule();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("pending");
  const [acting, setActing] = useState<string | null>(null);

  const counts = useMemo(() => {
    if (!q.data) return {} as Record<Filter, number>;
    return {
      all: q.data.length,
      pending: q.data.filter(r => isPendingStatus(getRescheduleStatus(r))).length,
      approved: q.data.filter(r => getRescheduleStatus(r) === "approved").length,
      rejected: q.data.filter(r => getRescheduleStatus(r) === "rejected").length,
    };
  }, [q.data]);

  const filtered = useMemo(() => {
    if (!q.data) return [];
    return q.data.filter((r) => {
      const status = getRescheduleStatus(r);
      const matchFilter =
        filter === "all" ||
        (filter === "pending" ? isPendingStatus(status) : status === filter);
      const matchSearch = search === "" ||
        r.teacher_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.child_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.parent_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.date?.includes(search);
      return matchFilter && matchSearch;
    });
  }, [q.data, search, filter]);

  const act = async (id: string, decision: "approved" | "rejected") => {
    setActing(id + decision);
    try {
      await decide.mutateAsync({ id, decision });
      toast.success(`Reschedule ${decision}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-5 page-enter">
      <PageHeader
        title="Reschedule Management"
        description="Review parent-initiated session reschedule requests"
      />

      {q.isLoading ? (
        <CardSkeleton />
      ) : q.isError ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="Could not load reschedules"
          description={(q.error as any)?.response?.data?.message || "You may not have permission or the server is unreachable."}
        />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="No reschedule requests"
          description="All reschedule requests have been handled."
        />
      ) : (
        <SectionCard>
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by teacher, child, parent, date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <FilterTabs tabs={TABS} active={filter} onChange={setFilter} counts={counts} />
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No results match your filter.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b bg-muted/20">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Child</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wide">Parent</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Date</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wide">Time</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wide">Teacher</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wide">Updated</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const rStatus = getRescheduleStatus(r);
                  const isPending = isPendingStatus(rStatus);
                  return (
                    <TableRow key={r.id} className={isPending ? "bg-amber-50/30" : ""}>
                      <TableCell className="font-semibold text-sm">{r.child_name || "Child"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{r.parent_name || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{fmtDateLong(r.date)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
                        {r.start_time} – {r.end_time}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{r.teacher_name || "—"}</TableCell>
                      <TableCell><StatusBadge status={isPending ? "pending" : rStatus} /></TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {fmtRelative(r.updated_at)}
                      </TableCell>
                      <TableCell>
                        {isPending ? (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
                              onClick={() => act(r.id, "approved")}
                              disabled={!!acting}
                            >
                              {acting === r.id + "approved" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              <span className="hidden sm:inline">Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                              onClick={() => act(r.id, "rejected")}
                              disabled={!!acting}
                            >
                              {acting === r.id + "rejected" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
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