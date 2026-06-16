import { useMemo, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { useAuditLogs } from "../hooks/useAdmin";
import { CardSkeleton, EmptyState, PageHeader, SectionCard } from "@/components/shared";
import { fmtRelative, fmtDateLong } from "@/utils/date.utils";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  MessageSquareText,
  ScrollText,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "@/types";

const ACTION_META: Record<string, { chip: string; avatar: string; bar: string }> = {
  approved: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", avatar: "bg-emerald-100 text-emerald-700", bar: "border-l-emerald-400" },
  rejected: { chip: "bg-red-50 text-red-700 border-red-200",             avatar: "bg-red-100 text-red-700",         bar: "border-l-red-400" },
  applied:  { chip: "bg-blue-50 text-blue-700 border-blue-200",          avatar: "bg-blue-100 text-blue-700",       bar: "border-l-blue-400" },
  assigned: { chip: "bg-violet-50 text-violet-700 border-violet-200",    avatar: "bg-violet-100 text-violet-700",   bar: "border-l-violet-400" },
  login:    { chip: "bg-gray-50 text-gray-700 border-gray-200",          avatar: "bg-gray-100 text-gray-700",       bar: "border-l-gray-300" },
};
const DEFAULT_META = { chip: "bg-muted text-muted-foreground border-border", avatar: "bg-muted text-muted-foreground", bar: "border-l-border" };

function getActionMeta(action: string) {
  const lower = action.toLowerCase();
  for (const key of Object.keys(ACTION_META)) {
    if (lower.includes(key)) return ACTION_META[key];
  }
  return DEFAULT_META;
}

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join("");
}

function dayLabel(dayStr: string) {
  if (!dayStr) return "Unknown date";
  const [y, m, d] = dayStr.split("-").map(Number);
  if (!y || !m || !d) return dayStr;
  const date = new Date(y, m - 1, d);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d, yyyy");
}

function MetaPill({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
      <Icon className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconBg,
  iconText,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  iconBg: string;
  iconText: string;
}) {
  return (
    <div className="stat-card rounded-xl border bg-card p-4 transition-all duration-150">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-3.5 w-3.5", iconText)} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
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
        e.performed_by_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.target_user_name?.toLowerCase().includes(search.toLowerCase());
      const matchAction = actionFilter === "all" || e.action?.toLowerCase().startsWith(actionFilter.toLowerCase());
      const entryDate = e.created_at?.split("T")[0] || "";
      const matchFrom = !dateFrom || entryDate >= dateFrom;
      const matchTo = !dateTo || entryDate <= dateTo;
      return matchSearch && matchAction && matchFrom && matchTo;
    });
  }, [q.data, search, actionFilter, dateFrom, dateTo]);

  const grouped = useMemo(() => {
    const map = new Map<string, AuditLogEntry[]>();
    filtered.forEach(e => {
      const day = e.created_at?.split("T")[0] || "unknown";
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const stats = useMemo(() => {
    if (!q.data) return null;
    const lower = (a?: string) => (a || "").toLowerCase();
    return {
      total: q.data.length,
      approved: q.data.filter(e => lower(e.action).includes("approved")).length,
      rejected: q.data.filter(e => lower(e.action).includes("rejected")).length,
      applied: q.data.filter(e => lower(e.action).includes("applied")).length,
    };
  }, [q.data]);

  const hasActiveFilters = search !== "" || actionFilter !== "all" || dateFrom !== "" || dateTo !== "";
  const clearFilters = () => { setSearch(""); setActionFilter("all"); setDateFrom(""); setDateTo(""); };

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
        <>
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={ScrollText} label="Total events" value={stats.total} iconBg="bg-indigo-50" iconText="text-indigo-600" />
              <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} iconBg="bg-emerald-50" iconText="text-emerald-600" />
              <StatCard icon={XCircle} label="Rejected" value={stats.rejected} iconBg="bg-red-50" iconText="text-red-600" />
              <StatCard icon={FileText} label="Applied" value={stats.applied} iconBg="bg-blue-50" iconText="text-blue-600" />
            </div>
          )}

          <SectionCard>
            <div className="flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search actions, users…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-9 pl-9 text-sm"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="h-9 w-full text-sm sm:w-44">
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
                  className="h-9 w-full text-sm sm:w-36"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="h-9 w-full text-sm sm:w-36"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {q.data.length} entries
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" /> Clear filters
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          {filtered.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
              No entries match your filters.
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([day, entries]) => (
                <div key={day} className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {dayLabel(day)}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="space-y-2.5">
                    {entries.map(e => {
                      const meta = getActionMeta(e.action || "");
                      const hasMetaInfo = e.target_user_name || e.target_branch_name || e.leave_date || e.meta_json?.reason;
                      return (
                        <div
                          key={e.id}
                          className={cn(
                            "rounded-xl border border-l-4 bg-card p-4 transition-shadow hover:shadow-md sm:p-5",
                            meta.bar
                          )}
                        >
                          <div className="flex items-start gap-3.5">
                            <div className={cn(
                              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                              meta.avatar
                            )}>
                              {initials(e.performed_by_name)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold">{e.action}</p>
                                  <span className={cn(
                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                    meta.chip
                                  )}>
                                    {e.action?.split(" ")[0]}
                                  </span>
                                </div>
                                <span className="whitespace-nowrap text-xs text-muted-foreground" title={e.created_at}>
                                  {fmtRelative(e.created_at)}
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-muted-foreground">
                                by{" "}
                                <span className="font-semibold text-foreground">
                                  {e.performed_by_name || "Unknown"}
                                </span>
                                {e.session_id ? <> · session {e.session_id}</> : null}
                              </p>

                              {hasMetaInfo && (
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                  {e.target_user_name && (
                                    <MetaPill icon={User} label={`Applicant: ${e.target_user_name}`} />
                                  )}
                                  {e.target_branch_name && (
                                    <MetaPill icon={Building2} label={`Branch: ${e.target_branch_name}`} />
                                  )}
                                  {e.leave_date && (
                                    <MetaPill icon={CalendarDays} label={`Date: ${fmtDateLong(e.leave_date)}`} />
                                  )}
                                  {e.meta_json?.reason && (
                                    <MetaPill icon={MessageSquareText} label={`Reason: ${e.meta_json.reason}`} />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}