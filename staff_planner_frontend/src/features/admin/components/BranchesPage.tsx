// src/features/admin/components/BranchesPage.tsx

import { useState } from "react";
import {
  Building2, Plus, Pencil, Trash2, Users, ChevronRight,
  X, Check, UserPlus, UserMinus, Phone, MapPin, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useBranches,
  useBranch,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
  useAddBranchMember,
  useRemoveBranchMember,
} from "@/features/admin/hooks/useBranches";
import type { Branch, BranchMemberType } from "@/types";

// ── Colour system — one clear colour per role ─────────────────────────────────
const MEMBER_TYPES: {
  key: BranchMemberType;
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  activeBg: string;
  activeText: string;
}[] = [
  {
    key: "client",
    label: "Client",
    bg: "bg-gray-100",     text: "text-gray-600",
    border: "border-gray-400", dot: "bg-gray-400",
    activeBg: "bg-gray-800", activeText: "text-white",
  },
  {
    key: "staff",
    label: "Staff",
    bg: "bg-gray-100",     text: "text-gray-600",
    border: "border-gray-400", dot: "bg-gray-400",
    activeBg: "bg-gray-800", activeText: "text-white",
  },
  {
    key: "incharge",
    label: "Incharge",
    bg: "bg-gray-100",     text: "text-gray-600",
    border: "border-gray-400", dot: "bg-gray-400",
    activeBg: "bg-gray-800", activeText: "text-white",
  },
  {
    key: "sub_incharge",
    label: "Sub Incharge",
    bg: "bg-gray-100",     text: "text-gray-600",
    border: "border-gray-400", dot: "bg-gray-400",
    activeBg: "bg-gray-800", activeText: "text-white",
  },
  {
    key: "manager",
    label: "Manager",
    bg: "bg-gray-100",     text: "text-gray-600",
    border: "border-gray-400", dot: "bg-gray-400",
    activeBg: "bg-gray-800", activeText: "text-white",
  },
];

function getMeta(key: string) {
  return MEMBER_TYPES.find((m) => m.key === key) ?? MEMBER_TYPES[1];
}

function RoleBadge({ typeKey }: { typeKey: string }) {
  const m = getMeta(typeKey);
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", m.bg, m.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", m.dot)} />
      {m.label}
    </span>
  );
}

// ── Stat pills shown at top of panel ─────────────────────────────────────────
function StatPills({ counts }: { counts?: Record<string, number> }) {
  return (
    <div className="flex gap-2 px-6 py-3 border-b bg-white overflow-x-auto scrollbar-none shrink-0">
      {MEMBER_TYPES.map((mt) => (
        <div
          key={mt.key}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 bg-gray-100 text-gray-600"
        >
          {mt.label}
          <span className="font-bold tabular-nums text-gray-800">{counts?.[mt.key] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

// ── Branch create / edit form ─────────────────────────────────────────────────
interface BranchFormProps {
  initial?: { name: string; address: string; phone: string };
  onSave: (data: { name: string; address: string; phone: string }) => void;
  onCancel: () => void;
  loading: boolean;
}

function BranchForm({ initial, onSave, onCancel, loading }: BranchFormProps) {
  const [name,    setName]    = useState(initial?.name    ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [phone,   setPhone]   = useState(initial?.phone   ?? "");

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="e.g. Anna Nagar Branch"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Street, City"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="044-XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">
          Cancel
        </button>
        <button
          disabled={!name.trim() || loading}
          onClick={() => onSave({ name, address, phone })}
          className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
        >
          <Check className="h-3.5 w-3.5" />
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ── Add member form ───────────────────────────────────────────────────────────
function AddMemberForm({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [phone,      setPhone]      = useState("");
  const [memberType, setMemberType] = useState<BranchMemberType>("staff");
  const [showPw,     setShowPw]     = useState(false);
  const [error,      setError]      = useState("");

  const addMember = useAddBranchMember();

  const handleAdd = async () => {
    setError("");
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    try {
      await addMember.mutateAsync({ branchId, name, email, password, phone, memberType });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to add member");
    }
  };

  const selected = getMeta(memberType);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
      <h4 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
        <UserPlus className="h-4 w-4 text-indigo-500" /> Add New Member
      </h4>

      {/* Role dropdown */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
        <div className="relative">
          <select
            value={memberType}
            onChange={(e) => setMemberType(e.target.value as BranchMemberType)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white appearance-none pr-8 cursor-pointer"
          >
            {MEMBER_TYPES.map((mt) => (
              <option key={mt.key} value={mt.key}>{mt.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <span className={cn("w-2.5 h-2.5 rounded-full inline-block", selected.dot)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ravi Kumar"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Email <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="email"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ravi@example.com"
          />
        </div>
        <div className="relative">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Password <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type={showPw ? "text" : "password"}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white pr-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 chars"
          />
          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            className="absolute right-2.5 top-7 text-gray-400 hover:text-gray-600"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9876543210"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-100 bg-white">
          Cancel
        </button>
        <button
          disabled={addMember.isPending}
          onClick={handleAdd}
          className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {addMember.isPending ? "Adding…" : "Add Member"}
        </button>
      </div>
    </div>
  );
}

// ── Branch detail side panel ──────────────────────────────────────────────────
function BranchDetailPanel({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const { data: branch, isLoading } = useBranch(branchId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType]  = useState<BranchMemberType | "all">("all");
  const removeMember = useRemoveBranchMember();

  const filtered =
    filterType === "all"
      ? branch?.members ?? []
      : (branch?.members ?? []).filter((m) => {
          const roleMap: Record<string, string> = {
            client: "parent", staff: "teacher",
            incharge: "incharge", sub_incharge: "sub_incharge", manager: "manager",
          };
          return m.roles.includes(roleMap[filterType] ?? filterType);
        });

  const getRoleKey = (roles: string[]): string =>
    roles.includes("parent")        ? "client"      :
    roles.includes("teacher")       ? "staff"       :
    roles.includes("sub_incharge")  ? "sub_incharge":
    roles.includes("incharge")      ? "incharge"    :
    roles.includes("manager")       ? "manager"     : "staff";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-end">
      <div className="bg-white h-full w-full max-w-lg shadow-2xl overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-indigo-600 text-white shrink-0">
          <div>
            <h2 className="text-lg font-semibold">{branch?.name ?? "Branch"}</h2>
            {branch?.address && (
              <p className="text-indigo-200 text-xs flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {branch.address}
              </p>
            )}
          </div>
          <button onClick={onClose} className="hover:bg-indigo-700 rounded-lg p-1.5 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>



        <div className="flex-1 p-5 space-y-4 overflow-y-auto">

          {/* Filter tabs — single scrollable row */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {(["all", ...MEMBER_TYPES.map((m) => m.key)] as const).map((t) => {
              const mt = t !== "all" ? getMeta(t) : null;
              const active = filterType === t;
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap shrink-0",
                    active && t === "all"
                      ? "bg-gray-900 text-white border-transparent"
                      : active && mt
                      ? cn(mt.activeBg, mt.activeText, "border-transparent")
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                  )}
                >
                  {t === "all" ? "All" : getMeta(t).label}
                </button>
              );
            })}
          </div>

          {/* Add member */}
          {showAddForm ? (
            <AddMemberForm branchId={branchId} onClose={() => setShowAddForm(false)} />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-xl border-2 border-dashed border-indigo-200 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
            >
              <UserPlus className="h-4 w-4" /> Add Member
            </button>
          )}

          {/* Member list */}
          {isLoading ? (
            <div className="text-center text-gray-400 py-10 text-sm">Loading members…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-sm">No members in this category.</div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((member) => {
                const typeKey = getRoleKey(member.roles);
                const meta = getMeta(typeKey);
                return (
                  <li
                    key={member.id}
                    className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Role colour dot avatar */}
                      <div className={cn("shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold", meta.dot)}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-900 truncate">{member.name}</span>
                          <RoleBadge typeKey={typeKey} />
                        </div>
                        {member.email && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{member.email}</p>
                        )}
                        {member.phone && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" /> {member.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        window.confirm(`Remove ${member.name} from this branch?`) &&
                        removeMember.mutate({ branchId, userId: member.id })
                      }
                      className="text-gray-300 hover:text-red-500 shrink-0 transition-colors"
                      title="Remove from branch"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main branches page ────────────────────────────────────────────────────────
export function BranchesPage() {
  const { data: branches = [], isLoading } = useBranches();
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBranch,  setEditingBranch]  = useState<Branch | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleCreate = async (data: { name: string; address: string; phone: string }) => {
    setError("");
    try {
      await createBranch.mutateAsync(data);
      setShowCreateForm(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create branch");
    }
  };

  const handleUpdate = async (data: { name: string; address: string; phone: string }) => {
    if (!editingBranch) return;
    setError("");
    try {
      await updateBranch.mutateAsync({ id: editingBranch.id, ...data });
      setEditingBranch(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to update branch");
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!window.confirm(`Delete branch "${branch.name}"? This cannot be undone.`)) return;
    try {
      await deleteBranch.mutateAsync(branch.id);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to delete branch");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Branches</h1>
            <p className="text-sm text-gray-400">{branches.length} branch{branches.length !== 1 ? "es" : ""}</p>
          </div>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => { setShowCreateForm(true); setEditingBranch(null); setError(""); }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Branch
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6">
          <BranchForm
            onSave={handleCreate}
            onCancel={() => { setShowCreateForm(false); setError(""); }}
            loading={createBranch.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading branches…</div>
      ) : branches.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No branches yet. Create your first one!</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {branches.map((branch) => (
            <li key={branch.id}>
              {editingBranch?.id === branch.id ? (
                <BranchForm
                  initial={{ name: branch.name, address: branch.address ?? "", phone: branch.phone ?? "" }}
                  onSave={handleUpdate}
                  onCancel={() => { setEditingBranch(null); setError(""); }}
                  loading={updateBranch.isPending}
                />
              ) : (
                <div
                  className={cn(
                    "bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow",
                    !branch.is_active && "opacity-60"
                  )}
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{branch.name}</span>
                      {!branch.is_active && (
                        <span className="text-xs text-gray-400 border px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    {branch.address && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {branch.address}
                      </p>
                    )}
                    {/* Role count pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {MEMBER_TYPES.map((mt) => (
                        <span
                          key={mt.key}
                          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500"
                        >
                          {mt.label}
                          <span className="font-semibold text-gray-700 tabular-nums">{branch.member_counts?.[mt.key] ?? 0}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setSelectedBranch(branch.id)}
                      className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition-colors"
                      title="View members"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setEditingBranch(branch); setShowCreateForm(false); }}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit branch"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(branch)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete branch"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedBranch(branch.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {selectedBranch && (
        <BranchDetailPanel
          branchId={selectedBranch}
          onClose={() => setSelectedBranch(null)}
        />
      )}
    </div>
  );
}