// src/features/admin/components/BranchesPage.tsx

import { useState } from "react";
import {
  Building2, Plus, Pencil, Trash2, Users,
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
  useAvailableManagers,
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

// ── Per-branch accent palette — cycles through a small distinctive set ────────
const BRANCH_ACCENTS = [
  { bar: "bg-indigo-500",  chip: "bg-indigo-50 text-indigo-600",   ring: "ring-indigo-100" },
  { bar: "bg-amber-500",   chip: "bg-amber-50 text-amber-600",     ring: "ring-amber-100" },
  { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-600", ring: "ring-emerald-100" },
  { bar: "bg-rose-500",    chip: "bg-rose-50 text-rose-600",       ring: "ring-rose-100" },
  { bar: "bg-sky-500",     chip: "bg-sky-50 text-sky-600",         ring: "ring-sky-100" },
  { bar: "bg-violet-500",  chip: "bg-violet-50 text-violet-600",   ring: "ring-violet-100" },
];

function accentFor(index: number) {
  return BRANCH_ACCENTS[index % BRANCH_ACCENTS.length];
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
  const [name,           setName]           = useState("");
  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [phone,          setPhone]          = useState("");
  const [memberType,     setMemberType]     = useState<BranchMemberType>("staff");
  const [showPw,         setShowPw]         = useState(false);
  const [error,          setError]          = useState("");
  const [selectedMgrId,  setSelectedMgrId]  = useState("");
  const [createMgrMode,  setCreateMgrMode]  = useState(false);
  const [childNames,     setChildNames]     = useState<string[]>([""]);

  const addMember = useAddBranchMember();
  const { data: availableManagers = [], isLoading: mgrsLoading } = useAvailableManagers(
    memberType === "manager" ? branchId : null
  );

  const isManager = memberType === "manager";

  const handleAdd = async () => {
    setError("");
    if (isManager && !createMgrMode) {
      if (!selectedMgrId) {
        setError("Please select a manager.");
        return;
      }
      try {
        await addMember.mutateAsync({
          branchId,
          memberType,
          existingUserId: selectedMgrId,
          name: "",
          email: "",
          password: "",
        });
        onClose();
      } catch (err: any) {
        setError(err?.response?.data?.message ?? "Failed to add manager");
      }
      return;
    }

    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (memberType === "client") {
      const cleaned = childNames.map((c) => c.trim()).filter(Boolean);
      if (cleaned.length === 0) {
        setError("Please enter at least one child's name.");
        return;
      }
      try {
        await addMember.mutateAsync({ branchId, name, email, password, phone, memberType, childNames: cleaned });
        onClose();
      } catch (err: any) {
        setError(err?.response?.data?.message ?? "Failed to add member");
      }
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
            onChange={(e) => {
              setMemberType(e.target.value as BranchMemberType);
              setSelectedMgrId("");
              setCreateMgrMode(false);
              setChildNames([""]);
              setError("");
            }}
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

      {/* Manager: show existing manager picker OR create new form */}
      {isManager ? (
        <div className="space-y-3">
          {!createMgrMode ? (
            <>
              <label className="block text-xs font-medium text-gray-700">Select Manager *</label>
              {mgrsLoading ? (
                <p className="text-xs text-gray-400 py-2">Loading managers…</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableManagers.map((mgr) => {
                    const alreadyHere = mgr.already_assigned;
                    const isChosen = selectedMgrId === mgr.id;
                    return (
                      <button
                        key={mgr.id}
                        disabled={alreadyHere}
                        onClick={() => setSelectedMgrId(mgr.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
                          alreadyHere
                            ? "opacity-50 cursor-not-allowed bg-gray-100 border-gray-200"
                            : isChosen
                            ? "bg-indigo-50 border-indigo-400 ring-1 ring-indigo-300"
                            : "bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                        )}
                      >
                        <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                          {mgr.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{mgr.name}</p>
                          {mgr.email && <p className="text-xs text-gray-400 truncate">{mgr.email}</p>}
                        </div>
                        {alreadyHere && (
                          <span className="text-xs text-gray-400 shrink-0 border px-2 py-0.5 rounded-full">
                            Already here
                          </span>
                        )}
                        {isChosen && !alreadyHere && (
                          <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Create new manager toggle */}
              <button
                onClick={() => { setCreateMgrMode(true); setSelectedMgrId(""); setError(""); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg border border-dashed border-indigo-300 text-indigo-500 hover:bg-indigo-50 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Create New Manager
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Create New Manager</label>
                <button
                  onClick={() => { setCreateMgrMode(false); setError(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Back to list
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Kumar"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ravi@example.com"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type={showPw ? "text" : "password"}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white pr-9"
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars"
                  />
                  <button type="button" onClick={() => setShowPw((p) => !p)}
                    className="absolute right-2.5 top-7 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Non-manager: show name / email / password / phone fields */
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {memberType === "client" ? "Parent Name *" : "Full Name *"}
            </label>
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

        {/* Client: Children list (a parent can have multiple children) */}
        {memberType === "client" && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">Children *</label>
            <div className="space-y-2">
              {childNames.map((cname, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    value={cname}
                    onChange={(e) => {
                      const next = [...childNames];
                      next[idx] = e.target.value;
                      setChildNames(next);
                    }}
                    placeholder={`Child ${idx + 1} name`}
                  />
                  {childNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setChildNames(childNames.filter((_, i) => i !== idx))}
                      className="shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setChildNames([...childNames, ""])}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg border border-dashed border-indigo-300 text-indigo-500 hover:bg-indigo-50 transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> Add Another Child
            </button>
          </div>
        )}
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-100 bg-white">
          Cancel
        </button>
        <button
          disabled={
            addMember.isPending ||
            (isManager && !createMgrMode && !selectedMgrId) ||
            ((!isManager || createMgrMode) && !name.trim())
          }
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
    <div className="max-w-6xl mx-auto px-4 py-8">

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {branches.map((branch, idx) => {
            const accent = accentFor(idx);
            const total = MEMBER_TYPES.reduce((sum, mt) => sum + (branch.member_counts?.[mt.key] ?? 0), 0);
            const nonZero = MEMBER_TYPES.filter((mt) => (branch.member_counts?.[mt.key] ?? 0) > 0);

            return (
              <div key={branch.id} className={editingBranch?.id === branch.id ? "sm:col-span-2 lg:col-span-3" : ""}>
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
                      "group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full flex flex-col",
                      !branch.is_active && "opacity-60"
                    )}
                  >
                    {/* Accent bar */}
                    <div className={cn("h-1.5 w-full", accent.bar)} />

                    <div className="p-5 flex flex-col gap-4 flex-1">
                      {/* Top row: monogram + name + total badge */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn("shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base ring-1", accent.chip, accent.ring)}>
                          {branch.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 leading-tight">{branch.name}</h3>
                            {!branch.is_active && (
                              <span className="text-[11px] text-gray-400 border px-2 py-0.5 rounded-full shrink-0">Inactive</span>
                            )}
                          </div>
                          {branch.address ? (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{branch.address}</span>
                            </p>
                          ) : (
                            <p className="text-xs text-gray-300 mt-0.5">No address set</p>
                          )}
                        </div>
                      </div>

                      {/* Headcount summary */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900 tabular-nums">{total}</span>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                          {total === 1 ? "person" : "people"} on roster
                        </span>
                      </div>

                      {/* Role breakdown — only non-zero roles, dot separated */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                        {nonZero.length === 0 ? (
                          <span className="text-gray-300">No members assigned yet</span>
                        ) : (
                          nonZero.map((mt, i) => (
                            <span key={mt.key} className="flex items-center gap-2">
                              {i > 0 && <span className="text-gray-200">·</span>}
                              <span>
                                <span className="font-semibold text-gray-700 tabular-nums">{branch.member_counts?.[mt.key]}</span>{" "}
                                {mt.label}
                              </span>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Bottom row: view members + actions */}
                      <div className="mt-auto flex items-center gap-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => setSelectedBranch(branch.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg py-2 transition-colors"
                        >
                          <Users className="h-4 w-4" /> View Members
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
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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