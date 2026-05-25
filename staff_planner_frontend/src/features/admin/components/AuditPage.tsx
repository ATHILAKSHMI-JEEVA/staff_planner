import { useState, useMemo } from "react";
import { useAuditLogs } from "../hooks/useAdmin";
import { CardSkeleton, EmptyState, PageHeader, SectionCard } from "@/components/shared";
import { fmtRelative, fmtDateLong } from "@/utils/date.utils";
import { ScrollText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ACTION_STYLES: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  applied:  "bg-blue-50 text-blue-700 border-blue-200",
  assigned: "bg-violet-50 text-violet-700 border-violet-200",
  login:    "bg-gray-50 text-gray-700 border-gray-200",
};

const DOT_COLORS: Record<string, string> = {
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
  applied:  "bg-blue-500",
  assigned: "bg-violet-500",
  login:    "bg-gray-400",
};

function getActionStyle(action: string): { chip: string; dot: string } {
  const lower = action.toLowerCase();
  for (const [key] of Object.entries(ACTION_STYLES)) {
    if (lower.includes(key)) return { chip: ACTION_STYLES[key], dot: DOT_COLORS[key] };
  }
  return { chip: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" };
}

export function AuditPage() {
  const q = useAuditLogs();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const actionTypes = useMemo(() => {
    if (!q.data) return [];
    const types = [...new Set(q.data.map(e => e.action?.split(" ")[0] || "Unknown"))];
    return types.sort();
  }, [q.data]);

  const filtered = useMemo(() => {
    if (!q.data) return [];
    return q.data.filter(e => {
      const matchSearch = search === "" ||
        e.action?.toLowerCase().includes(search.toLowerCase()) ||
        (e.performer_name || e.performed_by)?.toLowerCase().includes(search.toLowerCase());
      const matchAction = actionFilter === "all" || e.action?.toLowerCase().startsWith(actionFilter.toLowerCase());
      const entryDate = e.created_at?.split("T")[0] || "";
      const matchFrom = !dateFrom || entryDate >= dateFrom;
      const matchTo = !dateTo || entryDate <= dateTo;
      return matchSearch && matchAction && matchFrom && matchTo;
    });
  }, [q.data, search, actionFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-5 page-enter">
      <PageHeader
        title="Audit Log"
        description="System activity and action history"
      />

      {q.isLoading ? (
        <CardSkeleton count={3} />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-5 w-5" />} title="No audit logs" description="System activity will appear here." />
      ) : (
        <SectionCard>
          {/* Filters */}
          <div className="flex flex-col gap-3 p-4 border-b">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions, users…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-9 text-sm w-full sm:w-44">
                  <SelectValue placeholder="Action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-9 text-sm w-full sm:w-36"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-9 text-sm w-full sm:w-36"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {q.data.length} entries
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No entries match your filters.</div>
          ) : (
            <div className="relative p-5">
              {/* Timeline line */}
              <div className="absolute left-[2.85rem] top-5 bottom-5 w-px bg-border" />

              <div className="space-y-1">
                {filtered.map((e, i) => {
                  const style = getActionStyle(e.action || "");
                  return (
                    <div key={e.id} className="flex gap-4 items-start group">
                      {/* Timeline dot */}
                      <div className="relative z-10 mt-0.5 flex-shrink-0">
                        <div className={cn(
                          "h-8 w-8 rounded-full border-2 border-card flex items-center justify-center",
                          style.dot,
                          "text-white text-[10px] font-bold shadow-sm"
                        )}>
                          {i + 1}
                        </div>
                      </div>

                      {/* Entry content */}
                      <div className="flex-1 min-w-0 py-3 border-b border-border last:border-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{e.action}</p>
                              <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide",
                                style.chip
                              )}>
                                {e.action?.split(" ")[0]}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              by{" "}
                              <span className="font-semibold text-foreground">
                                {e.performer_name || e.performed_by}
                              </span>
                              {e.session_id ? ` · session ${e.session_id}` : ""}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {fmtRelative(e.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
