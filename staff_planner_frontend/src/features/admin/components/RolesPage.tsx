// src/features/admin/components/RolesPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Role & Permissions management page
// Mobile: stacked layout (role list → tap → permissions panel with back button)
// Desktop: side-by-side two-panel layout
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  ShieldCheck, Plus, Pencil, Trash2, ChevronRight,
  RotateCcw, Save, Key, FileText, RotateCcwIcon,
  AlertTriangle, LayoutGrid, Users, Shield, BarChart2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from "@/features/admin/hooks/useRoles";
import type { RBACRole, Permission, PermissionResource, PermissionAction } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

interface ModuleDef {
  key: PermissionResource;
  label: string;
  icon: React.ReactNode;
}

const MODULES: ModuleDef[] = [
  { key: "leaves",      label: "Leave Management",      icon: <FileText className="h-4 w-4" /> },
  { key: "reschedules", label: "Reschedule Management", icon: <RotateCcwIcon className="h-4 w-4" /> },
  { key: "shortfalls",  label: "Shortfall Management",  icon: <AlertTriangle className="h-4 w-4" /> },
  { key: "sessions",    label: "Session Management",    icon: <LayoutGrid className="h-4 w-4" /> },
  { key: "users",       label: "Staff Management",      icon: <Users className="h-4 w-4" /> },
  { key: "roles",       label: "Roles & Permissions",   icon: <Shield className="h-4 w-4" /> },
  { key: "audit",       label: "Audit Logs",            icon: <BarChart2 className="h-4 w-4" /> },
];

const ACTIONS: PermissionAction[] = [
  "read",
  "read_write",
  "read_write_delete",
  "approve",
  "manage",
];

const ACTION_LABELS: Record<PermissionAction, string> = {
  read:               "View",
  read_write:         "Edit",
  read_write_delete:  "Delete",
  approve:            "Approve",
  manage:             "Manage",
};

const TOTAL_PERMISSIONS = MODULES.length * ACTIONS.length;

// ── Helpers ───────────────────────────────────────────────────────────────────

function initPermissions(existing: Permission[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const mod of MODULES) {
    for (const act of ACTIONS) {
      map[`${mod.key}:${act}`] = existing.some(
        (p) => p.resource === mod.key && p.action === act
      );
    }
  }
  return map;
}

function mapToPermissions(map: Record<string, boolean>): Permission[] {
  const result: Permission[] = [];
  for (const key of Object.keys(map)) {
    if (map[key]) {
      const [resource, action] = key.split(":") as [PermissionResource, PermissionAction];
      result.push({ resource, action });
    }
  }
  return result;
}

function countSelected(map: Record<string, boolean>): number {
  return Object.values(map).filter(Boolean).length;
}

function countForModule(map: Record<string, boolean>, resource: PermissionResource): number {
  return ACTIONS.filter((a) => map[`${resource}:${a}`]).length;
}

function isModuleEnabled(map: Record<string, boolean>, resource: PermissionResource): boolean {
  return ACTIONS.some((a) => map[`${resource}:${a}`]);
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-600", "bg-blue-600", "bg-emerald-600", "bg-amber-500",
  "bg-red-500",    "bg-pink-500", "bg-cyan-600",    "bg-indigo-500",
];

function RoleAvatar({ name, index }: { name: string; index: number }) {
  const initials = name.slice(0, 2).toUpperCase();
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0", color)}>
      {initials}
    </div>
  );
}

// ── Toggle Switch Component ────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
        checked ? "bg-violet-600" : "bg-muted-foreground/30",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ── Module Row ────────────────────────────────────────────────────────────────

function ModuleRow({
  module: mod,
  permMap,
  onModuleToggle,
  onActionToggle,
  onSelectAll,
  onClearAll,
}: {
  module: ModuleDef;
  permMap: Record<string, boolean>;
  onModuleToggle: (resource: PermissionResource, enabled: boolean) => void;
  onActionToggle: (key: string) => void;
  onSelectAll: (resource: PermissionResource) => void;
  onClearAll: (resource: PermissionResource) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const enabled = isModuleEnabled(permMap, mod.key);
  const selected = countForModule(permMap, mod.key);
  const total = ACTIONS.length;
  const allSelected = selected === total;

  const handleToggle = (val: boolean) => {
    onModuleToggle(mod.key, val);
    if (!val) setExpanded(false);
  };

  return (
    <div className="border-b border-border last:border-0">
      {/* Module header row */}
      <div className="flex items-center gap-3 px-4 py-4">
        {/* Toggle switch */}
        <ToggleSwitch checked={enabled} onChange={handleToggle} />

        {/* Module icon + label — clickable to expand (only if enabled) */}
        <div
          className={cn(
            "flex items-center gap-2 flex-1 min-w-0",
            enabled && "cursor-pointer"
          )}
          onClick={() => enabled && setExpanded((e) => !e)}
        >
          <span className={cn("flex-shrink-0", enabled ? "text-muted-foreground" : "text-muted-foreground/40")}>
            {mod.icon}
          </span>
          <span className={cn(
            "font-semibold text-sm truncate",
            !enabled && "text-muted-foreground/50"
          )}>
            {mod.label}
          </span>
          {enabled && (
            <ChevronRight className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0",
              expanded && "rotate-90"
            )} />
          )}
        </div>

        {/* Right side: badge + All button OR Disabled label */}
        {enabled ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Count badge */}
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full border",
              selected > 0
                ? "bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700"
                : "bg-muted text-muted-foreground border-border"
            )}>
              {selected}/{total}
            </span>

            {/* All / None quick toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                allSelected ? onClearAll(mod.key) : onSelectAll(mod.key);
              }}
              className={cn(
                "text-xs px-2 py-0.5 rounded font-medium border transition-colors",
                allSelected
                  ? "text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                  : "text-violet-600 border-violet-200 hover:bg-violet-50 dark:text-violet-400 dark:border-violet-700 dark:hover:bg-violet-900/20"
              )}
            >
              {allSelected ? "None" : "All"}
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/60 font-medium flex-shrink-0">Disabled</span>
        )}
      </div>

      {/* Expanded granular permission checkboxes */}
      {enabled && expanded && (
        <div className="bg-muted/20 border-t border-border/50">
          <div className="px-4 py-2 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Expand to set View / Edit / Delete / Approve permissions
            </span>
          </div>
          {ACTIONS.map((action) => {
            const key = `${mod.key}:${action}`;
            const checked = permMap[key] ?? false;
            return (
              <div
                key={key}
                className="flex items-center gap-4 px-6 py-3 border-t border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onActionToggle(key)}
              >
                {/* Custom checkbox */}
                <div className={cn(
                  "h-5 w-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors",
                  checked
                    ? "bg-violet-600 border-violet-600"
                    : "border-muted-foreground/30 bg-background"
                )}>
                  {checked && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {ACTION_LABELS[action]}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {mod.key}.{action}
                  </p>
                </div>

                {checked && (
                  <div className="h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-violet-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Create Role Modal ─────────────────────────────────────────────────────────

function CreateRoleModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const createRole = useCreateRole();

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Role name is required"); return; }
    try {
      await createRole.mutateAsync({ name: name.trim(), description });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create role");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold mb-4">Create New Role</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Role Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coordinator"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createRole.isPending}
            className="flex-1 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors"
          >
            {createRole.isPending ? "Creating…" : "Create Role"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function RolesPage() {
  const { data: roles = [], isLoading, refetch } = useRoles();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [permMap, setPermMap] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Mobile: track which panel is visible ("list" | "perms")
  const [mobileView, setMobileView] = useState<"list" | "perms">("list");

  const selectedRole = roles.find((r) => r._id === selectedRoleId) ?? null;

  const handleSelectRole = (role: RBACRole) => {
    setSelectedRoleId(role._id);
    setPermMap(initPermissions(role.permissions));
    setIsDirty(false);
    setSaveSuccess(false);
    setMobileView("perms"); // mobile: go to permissions panel
  };

  const handleModuleToggle = (resource: PermissionResource, enabled: boolean) => {
    setPermMap((prev) => {
      const next = { ...prev };
      if (enabled) {
        next[`${resource}:read`] = true;
      } else {
        ACTIONS.forEach((a) => { next[`${resource}:${a}`] = false; });
      }
      return next;
    });
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleActionToggle = (key: string) => {
    setPermMap((prev) => ({ ...prev, [key]: !prev[key] }));
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleSelectAll = (resource: PermissionResource) => {
    setPermMap((prev) => {
      const next = { ...prev };
      ACTIONS.forEach((a) => { next[`${resource}:${a}`] = true; });
      return next;
    });
    setIsDirty(true);
  };

  const handleClearAll = (resource: PermissionResource) => {
    setPermMap((prev) => {
      const next = { ...prev };
      ACTIONS.forEach((a) => { next[`${resource}:${a}`] = false; });
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      await updateRole.mutateAsync({
        id: selectedRoleId,
        permissions: mapToPermissions(permMap),
      });
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || "Failed to save. Please try again.";
      setSaveError(msg);
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = () => {
    refetch();
    if (selectedRole) {
      const fresh = roles.find((r) => r._id === selectedRoleId);
      if (fresh) {
        setPermMap(initPermissions(fresh.permissions));
        setIsDirty(false);
      }
    }
  };

  const handleDelete = async (role: RBACRole) => {
    if (role.is_system) return;
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    await deleteRole.mutateAsync(role._id);
    if (selectedRoleId === role._id) {
      setSelectedRoleId(null);
      setPermMap({});
      setMobileView("list");
    }
  };

  const selected = countSelected(permMap);
  const enabledModules = MODULES.filter((m) => isModuleEnabled(permMap, m.key)).length;

  // ── Role List Panel ────────────────────────────────────────────────────────
  const RoleListPanel = (
    <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-violet-600 text-white flex-shrink-0">
        <span className="font-bold text-sm">Roles</span>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {/* Role items */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            Loading…
          </div>
        ) : roles.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            No roles yet
          </div>
        ) : (
          roles.map((role, idx) => (
            <div
              key={role._id}
              onClick={() => handleSelectRole(role)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border/60 last:border-0 group transition-colors",
                selectedRoleId === role._id
                  ? "bg-violet-50 dark:bg-violet-900/20 border-l-4 border-l-violet-600"
                  : "hover:bg-muted/50"
              )}
            >
              <RoleAvatar name={role.name} index={idx} />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-semibold truncate",
                  selectedRoleId === role._id && "text-violet-700 dark:text-violet-300"
                )}>
                  {role.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {role.permissions.length} permissions
                </p>
              </div>
              {!role.is_system && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Edit name"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(role); }}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500"
                    title="Delete role"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {/* Mobile: chevron hint */}
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 lg:hidden flex-shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ── Permissions Panel ──────────────────────────────────────────────────────
  const PermissionsPanel = (
    <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-full">
      {selectedRole ? (
        <>
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile back button */}
              <button
                onClick={() => setMobileView("list")}
                className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Key className="h-4 w-4 text-violet-600 flex-shrink-0" />
              <span className="text-sm font-medium text-muted-foreground truncate">
                Permissions for{" "}
                <span className="font-bold text-violet-600">{selectedRole.name}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Module count badge */}
              <span className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-full border",
                enabledModules > 0
                  ? "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700"
                  : "bg-muted text-muted-foreground border-border"
              )}>
                {enabledModules}/{MODULES.length}
              </span>
              <span className={cn(
                "text-xs font-semibold hidden sm:inline",
                selected === TOTAL_PERMISSIONS ? "text-green-600" : "text-foreground"
              )}>
                {selected}/{TOTAL_PERMISSIONS}
              </span>
            </div>
          </div>

          {/* Sub-header hint */}
          <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Toggle = Module Access
            </span>
            <span className="text-muted-foreground/40 text-xs hidden sm:inline">·</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Expand to set granular permissions
            </span>
          </div>

          {/* Module rows */}
          <div className="flex-1 overflow-y-auto">
            {MODULES.map((mod) => (
              <ModuleRow
                key={mod.key}
                module={mod}
                permMap={permMap}
                onModuleToggle={handleModuleToggle}
                onActionToggle={handleActionToggle}
                onSelectAll={handleSelectAll}
                onClearAll={handleClearAll}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <ShieldCheck className="h-12 w-12 opacity-20" />
          <p className="text-sm font-medium">Select a role to manage permissions</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/30 flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Role &amp; Permissions</h1>
            <p className="text-xs text-muted-foreground">
              {roles.length} roles · {TOTAL_PERMISSIONS} permissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving || !selectedRoleId}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              isDirty && selectedRoleId
                ? "bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-900/20"
                : "bg-muted text-muted-foreground cursor-not-allowed",
              saveSuccess && "bg-green-600 hover:bg-green-600",
              saveError && "bg-red-600 hover:bg-red-600 text-white"
            )}
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">
              {saving ? "Saving…" : saveSuccess ? "Saved!" : saveError ? "Save Failed!" : "Save Changes"}
            </span>
            <span className="sm:hidden">
              {saving ? "…" : saveSuccess ? "✓" : saveError ? "✗" : "Save"}
            </span>
          </button>
        </div>
      </div>

      {/* ── MOBILE: single panel view ── */}
      <div className="lg:hidden flex-1 min-h-0">
        {mobileView === "list" ? RoleListPanel : PermissionsPanel}
      </div>

      {/* ── DESKTOP: two-panel side by side ── */}
      <div className="hidden lg:flex gap-5 flex-1 min-h-0">
        <div className="w-[260px] flex-shrink-0">
          {RoleListPanel}
        </div>
        <div className="flex-1">
          {PermissionsPanel}
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <CreateRoleModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}