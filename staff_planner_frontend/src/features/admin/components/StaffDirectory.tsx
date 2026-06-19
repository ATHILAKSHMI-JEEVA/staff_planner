// src/features/admin/components/StaffDirectory.tsx

import { useMemo, useState } from "react";
import {
  Users, GraduationCap, Baby, ShieldCheck, ChevronDown,
  Mail, Phone, Building2, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStaffDirectory } from "@/features/admin/hooks/useStaffDirectory";
import { PageHeader, CardSkeleton, EmptyState, FilterTabs } from "@/components/shared";
import type { DirectoryRole, DirectoryPerson, DirectoryManager, ManagedBranchBlock } from "@/types";

// ── Role meta (icon + colour) ──────────────────────────────────────────────
const ROLE_META: Record<DirectoryRole, { label: string; icon: React.ReactNode; bg: string; text: string; ring: string }> = {
  manager:  { label: "Manager",  icon: <ShieldCheck className="h-4 w-4" />,    bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-100" },
  staff:    { label: "Staff",    icon: <GraduationCap className="h-4 w-4" />,  bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-100" },
  parent:   { label: "Parent",   icon: <Baby className="h-4 w-4" />,           bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-100" },
  incharge: { label: "Incharge", icon: <Users className="h-4 w-4" />,          bg: "bg-rose-50",    text: "text-rose-700",    ring: "ring-rose-100" },
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function PersonAvatar({ name, role }: { name: string; role: DirectoryRole }) {
  const meta = ROLE_META[role];
  return (
    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0", meta.bg, meta.text)}>
      {initials(name) || "?"}
    </div>
  );
}

function ContactRow({ person }: { person: DirectoryPerson }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">
      <PersonAvatar name={person.name} role="staff" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{person.name}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {person.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 flex-shrink-0" /> {person.email}
            </span>
          )}
          {person.phone && (
            <span className="flex items-center gap-1 flex-shrink-0">
              <Phone className="h-3 w-3" /> {person.phone}
            </span>
          )}
        </div>
      </div>
      {!person.is_active && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">
          Inactive
        </span>
      )}
    </div>
  );
}

// ── A simple (non-manager) directory card ───────────────────────────────────
function SimplePersonCard({ person, role }: { person: DirectoryPerson; role: DirectoryRole }) {
  const meta = ROLE_META[role];
  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
      <PersonAvatar name={person.name} role={role} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{person.name}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
          {person.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 flex-shrink-0" /> {person.email}
            </span>
          )}
          {person.branch_name && (
            <span className="flex items-center gap-1 flex-shrink-0">
              <Building2 className="h-3 w-3" /> {person.branch_name}
            </span>
          )}
        </div>
      </div>
      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", meta.bg, meta.text)}>
        {meta.label}
      </span>
    </div>
  );
}

// ── One managed-branch block inside an expanded manager card ────────────────
function BranchBlock({ block }: { block: ManagedBranchBlock }) {
  const [open, setOpen] = useState(true);
  const totalPeople = block.staff.length + block.parents.length + block.incharges.length;

  return (
    <div className="rounded-lg border bg-background">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-indigo-600 flex-shrink-0" />
          <span className="text-sm font-semibold">{block.branch_name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">{totalPeople} {totalPeople === 1 ? "person" : "people"}</span>
          <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")} />
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {block.incharges.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700 px-3 mb-1">
                Incharge ({block.incharges.length})
              </p>
              <div className="space-y-0.5">
                {block.incharges.map((p) => <ContactRow key={p.id} person={p} />)}
              </div>
            </div>
          )}
          {block.staff.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 px-3 mb-1">
                Staff ({block.staff.length})
              </p>
              <div className="space-y-0.5">
                {block.staff.map((p) => <ContactRow key={p.id} person={p} />)}
              </div>
            </div>
          )}
          {block.parents.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 px-3 mb-1">
                Parents ({block.parents.length})
              </p>
              <div className="space-y-0.5">
                {block.parents.map((p) => <ContactRow key={p.id} person={p} />)}
              </div>
            </div>
          )}
          {totalPeople === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">No staff or parents in this branch yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Manager card — click to expand into managed branches ────────────────────
function ManagerCard({ manager }: { manager: DirectoryManager }) {
  const [expanded, setExpanded] = useState(false);
  const branchCount = manager.managed_branches.length;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <PersonAvatar name={manager.name} role="manager" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{manager.name}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
            {manager.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 flex-shrink-0" /> {manager.email}
              </span>
            )}
            <span className="flex items-center gap-1 flex-shrink-0">
              <Building2 className="h-3 w-3" />
              {branchCount === 0 ? "No branch assigned" : `${branchCount} branch${branchCount > 1 ? "es" : ""}`}
            </span>
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t bg-muted/20 p-3 space-y-2">
          {branchCount === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-2">This manager isn't assigned to any branch yet.</p>
          ) : (
            manager.managed_branches.map((block) => (
              <BranchBlock key={block.branch_id} block={block} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function StaffDirectoryPage() {
  const { data, isLoading } = useStaffDirectory();
  const [tab, setTab] = useState<DirectoryRole>("manager");

  const counts = data?.counts;

  const list = useMemo(() => {
    if (!data) return [];
    return data[tab] ?? [];
  }, [data, tab]);

  return (
    <div className="space-y-6 page-enter">
      <PageHeader title="Dashboard" description="Manager, staff, parent and incharge directory across all branches" />

      <FilterTabs
        tabs={[
          { value: "manager", label: "Manager" },
          { value: "staff", label: "Staff" },
          { value: "parent", label: "Parent" },
          { value: "incharge", label: "Incharge" },
        ]}
        active={tab}
        onChange={setTab}
        counts={counts}
      />

      {isLoading && <CardSkeleton count={4} />}

      {!isLoading && list.length === 0 && (
        <EmptyState
          icon={ROLE_META[tab].icon}
          title={`No ${ROLE_META[tab].label.toLowerCase()}s yet`}
          description={`Add a ${ROLE_META[tab].label.toLowerCase()} from the Branches page to see them here.`}
        />
      )}

      {!isLoading && list.length > 0 && (
        <div className="space-y-3">
          {tab === "manager"
            ? (list as DirectoryManager[]).map((m) => <ManagerCard key={m.id} manager={m} />)
            : (list as DirectoryPerson[]).map((p) => <SimplePersonCard key={p.id} person={p} role={tab} />)}
        </div>
      )}
    </div>
  );
}