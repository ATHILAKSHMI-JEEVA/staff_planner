import { Link } from "@tanstack/react-router";
import { useManagerStats } from "../hooks/useManager";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { PageHeader } from "@/components/shared";
import {
  FileText, CalendarClock, CheckCircle, XCircle, ArrowRight, Loader2, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  iconBg: string;
  valueColor: string;
  href: string;
  loading: boolean;
  description?: string;
}

function StatCard({ label, value, icon, iconBg, valueColor, href, loading, description }: StatCardProps) {
  return (
    <Link
      to={href as any}
      className="stat-card group rounded-xl border bg-card p-5 flex items-start gap-4 hover:shadow-md transition-all duration-200"
    >
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin mt-2 text-muted-foreground" />
        ) : (
          <p className={cn("text-3xl font-bold mt-1 tracking-tight", valueColor)}>{value ?? 0}</p>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
    </Link>
  );
}

function QuickActionCard({
  href, icon, title, description, badge, badgeColor,
}: {
  href: string; icon: React.ReactNode; title: string; description: string;
  badge?: number | null; badgeColor?: string;
}) {
  return (
    <Link
      to={href as any}
      className="group rounded-xl border bg-card p-6 hover:shadow-md transition-all duration-200 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            {icon}
          </div>
          <h2 className="font-semibold text-sm">{title}</h2>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      {badge !== undefined && badge !== null && badge > 0 && (
        <span className={cn(
          "self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
          badgeColor || "bg-amber-50 text-amber-700 border-amber-200"
        )}>
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
          {badge} pending
        </span>
      )}
    </Link>
  );
}

export function ManagerDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useManagerStats(!!user);

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Manager Dashboard"
        description={`Welcome back, ${user?.name}. Here's what needs your attention.`}
      />

      {/* KPI stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Leaves"
          value={stats?.pending_leaves}
          icon={<FileText className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50"
          valueColor="text-amber-600"
          href="/manager/leaves"
          loading={isLoading}
          description="Awaiting decision"
        />
        <StatCard
          label="Pending Reschedules"
          value={stats?.pending_reschedules}
          icon={<CalendarClock className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          valueColor="text-blue-600"
          href="/manager/reschedules"
          loading={isLoading}
          description="Parent requests"
        />
        <StatCard
          label="Leaves Approved"
          value={stats?.approved_leaves}
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          valueColor="text-emerald-600"
          href="/manager/leaves"
          loading={isLoading}
          description="This period"
        />
        <StatCard
          label="Leaves Rejected"
          value={stats?.rejected_leaves}
          icon={<XCircle className="h-5 w-5 text-red-600" />}
          iconBg="bg-red-50"
          valueColor="text-red-600"
          href="/manager/leaves"
          loading={isLoading}
          description="This period"
        />
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickActionCard
          href="/manager/leaves"
          icon={<FileText className="h-4 w-4" />}
          title="Leave Management"
          description="Review and approve or reject teacher leave requests. Shortfall alerts are flagged automatically."
          badge={isLoading ? undefined : stats?.pending_leaves ?? null}
          badgeColor="bg-amber-50 text-amber-700 border-amber-200"
        />
        <QuickActionCard
          href="/manager/reschedules"
          icon={<CalendarClock className="h-4 w-4" />}
          title="Reschedule Management"
          description="Review parent-initiated session reschedule requests and approve or reject them."
          badge={isLoading ? undefined : stats?.pending_reschedules ?? null}
          badgeColor="bg-blue-50 text-blue-700 border-blue-200"
        />
      </div>
    </div>
  );
}
