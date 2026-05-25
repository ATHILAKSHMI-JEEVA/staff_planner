import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-muted rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-3.5 w-1/3 bg-muted rounded" />
              <div className="h-3 w-2/3 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4 rounded-xl border border-dashed bg-muted/20">
      {icon && (
        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm leading-relaxed">{description}</p>
      )}
    </div>
  );
}

const STATUS_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  approved:   { bg: "bg-emerald-50",  text: "text-emerald-700",  dot: "bg-emerald-500"  },
  scheduled:  { bg: "bg-emerald-50",  text: "text-emerald-700",  dot: "bg-emerald-500"  },
  confirmed:  { bg: "bg-emerald-50",  text: "text-emerald-700",  dot: "bg-emerald-500"  },
  rejected:   { bg: "bg-red-50",      text: "text-red-700",      dot: "bg-red-500"      },
  cancelled:  { bg: "bg-red-50",      text: "text-red-700",      dot: "bg-red-500"      },
  canceled:   { bg: "bg-red-50",      text: "text-red-700",      dot: "bg-red-500"      },
  pending:    { bg: "bg-amber-50",    text: "text-amber-700",    dot: "bg-amber-500"    },
  rescheduled:{ bg: "bg-blue-50",     text: "text-blue-700",     dot: "bg-blue-500"     },
};

export function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const style = STATUS_MAP[s] ?? { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize border",
      style.bg, style.text,
      s === "approved" || s === "scheduled" || s === "confirmed" ? "border-emerald-200" :
      s === "rejected" || s === "cancelled" || s === "canceled" ? "border-red-200" :
      s === "pending" ? "border-amber-200" :
      s === "rescheduled" ? "border-blue-200" :
      "border-border"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", style.dot)} />
      {status}
    </span>
  );
}

export function ShortfallChip() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
      Shortfall
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  children,
  className,
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border bg-card shadow-sm", className)}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-sm tracking-tight">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function FilterTabs<T extends string>({
  tabs,
  active,
  onChange,
  counts,
}: {
  tabs: { value: T; label: string }[];
  active: T;
  onChange: (v: T) => void;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <div className="flex gap-1 border rounded-lg p-1 bg-muted/40">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 flex items-center gap-1.5",
            active === t.value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          {t.label}
          {counts !== undefined && counts[t.value] !== undefined && (
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-[18px] text-center",
              active === t.value ? "bg-muted text-muted-foreground" : "text-muted-foreground"
            )}>
              {counts[t.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
