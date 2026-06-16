// src/types/index.ts
// ─── Existing types (unchanged) ──────────────────────────────────────────────

export type Role = "teacher" | "parent" | "admin" | "manager";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  branch_id?: string;
  roles: Role[];
  role_id?: string | null;
}

export interface Session {
  id: string;
  teacher_id: string;
  child_id: string;
  branch_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  teacher_name?: string;
  child_name?: string;
}

export interface LeaveRequest {
  id: string;
  teacher_id: string;
  date: string;
  reason: string;
  status: string;
  shortfall_detected: boolean;
  created_at: string;
  teacher_name?: string;
}

export interface AvailableSlot {
  id: string;
  teacher_id: string;
  branch_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  max_children: number;
  spots_taken: number;
  teacher_name: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  meta_json?: Record<string, any>;
  created_at: string;
}

export interface ShortfallAlertPending {
  session_id?: string;
  child_id: string;
  child_name: string;
  parent_name: string;
  parent_phone?: string;
  notified_at?: string;
  rotation_streak?: number;
}

export interface ShortfallAlert {
  leave_id: string;
  teacher_id: string;
  teacher_name: string;
  date: string;
  affected_count: number;
  confirmed_count: number;
  pending: ShortfallAlertPending[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  performed_by: string;
  performer_name?: string;
  session_id?: string;
  old_slot_id?: string;
  new_slot_id?: string;
  meta_json?: Record<string, any>;
  created_at: string;
}

export interface Child {
  id: string;
  name: string;
  parent_user_id: string;
  branch_id?: string;
  assigned_teacher_id?: string;
}

export interface SubstituteTeacher {
  id: string;
  name: string;
  branch_id?: string;
  is_cross_branch: boolean;
  load: number;
}

export interface ChildSession extends Session {
  teacher_name: string;
}

export interface RescheduleRequest {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  child_id: string;
  child_name?: string;
  parent_id?: string;
  parent_name?: string;
  branch_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  reschedule_status: "pending" | "approved" | "rejected" | null;
  updated_at: string;
  created_at: string;
}

export interface ManagerStats {
  pending_leaves: number;
  pending_reschedules: number;
  approved_leaves: number;
  rejected_leaves: number;
}

// ─── RBAC permission types ────────────────────────────────────────────────────

export type PermissionResource =
  | "leaves"
  | "reschedules"
  | "shortfalls"
  | "users"
  | "roles"
  | "audit"
  | "sessions";

export type PermissionAction =
  | "read"
  | "read_write"
  | "read_write_delete"
  | "approve"
  | "manage";

/**
 * Simplified access level for the UI permission editor.
 *
 *   none              → no permission entry for that resource
 *   read              → PermissionAction: "read"
 *   read_write        → PermissionAction: "read_write"
 *   read_write_delete → PermissionAction: "read_write_delete"
 *
 * Special actions (approve, manage) are toggled independently via checkboxes.
 */
export type AccessLevel = "none" | "read" | "read_write" | "read_write_delete";

export interface Permission {
  resource: PermissionResource;
  action: PermissionAction;
}

export interface RBACRole {
  _id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  is_system: boolean;
  createdAt?: string;
  updatedAt?: string;
}
// ─── Branch types ─────────────────────────────────────────────────────────────

export type BranchMemberType = "client" | "staff" | "incharge" | "sub_incharge" | "manager";

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  createdAt?: string;
  member_counts?: Record<string, number>;
  total_members?: number;
}

export interface BranchMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  role_name?: string;
  createdAt?: string;
}

export interface BranchDetail extends Branch {
  members: BranchMember[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  performed_by_id?: string;
  performed_by_name?: string;
  performer_role?: string;
  performer_branch_name?: string;
  target_user_id?: string;
  target_user_name?: string;
  target_branch_name?: string;
  leave_date?: string;
  leave_type?: string;
  session_id?: string;
  old_slot_id?: string;
  new_slot_id?: string;
  meta_json?: Record<string, any>;
  created_at: string;
}