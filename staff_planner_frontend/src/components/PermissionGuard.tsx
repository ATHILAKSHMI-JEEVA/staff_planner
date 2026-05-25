// src/components/PermissionGuard.tsx  (UPDATED — replace existing file)
// ─────────────────────────────────────────────────────────────────────────────
// Wrap any component with <PermissionGuard> to conditionally render it
// based on the current user's permissions.
//
// Supports both exact action checks and the new semantic access level checks.
//
// Usage examples:
//
//   // Exact action check (legacy / fine-grained):
//   <PermissionGuard resource="leaves" action="approve">
//     <button>Approve Leave</button>
//   </PermissionGuard>
//
//   // Semantic access level check (new, simpler):
//   <PermissionGuard resource="leaves" minAccess="read">
//     <MyLeavesPage />          // visible to Read Only, Read & Edit, Full Access
//   </PermissionGuard>
//
//   <PermissionGuard resource="leaves" minAccess="read_write">
//     <button>Submit Leave</button>   // hidden for Read Only roles
//   </PermissionGuard>
//
//   <PermissionGuard resource="leaves" minAccess="read_write_delete">
//     <button>Delete</button>         // only Full Access roles
//   </PermissionGuard>
//
//   // Redirect on denied:
//   <PermissionGuard resource="roles" action="manage" redirect="/admin">
//     <RolesPage />
//   </PermissionGuard>
//
//   // Show a fallback:
//   <PermissionGuard resource="users" minAccess="read_write" fallback={<p>Read-only mode</p>}>
//     <EditUserForm />
//   </PermissionGuard>
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/usePermissions";
import type { PermissionResource, PermissionAction } from "@/types";

type MinAccess = "read" | "read_write" | "read_write_delete";

interface PermissionGuardProps {
  resource: PermissionResource;
  /** Exact legacy action check (approve, manage, read, read_write, read_write_delete) */
  action?: PermissionAction;
  /**
   * Semantic minimum access level check.
   * "read"              → canRead()  (any non-none access)
   * "read_write"        → canWrite() (read_write or read_write_delete)
   * "read_write_delete" → canDelete() (only full access)
   *
   * If both `action` and `minAccess` are provided, both must pass.
   */
  minAccess?: MinAccess;
  children: ReactNode;
  /** If provided, redirect to this path when permission is denied */
  redirect?: string;
  /** Shown when permission denied and no redirect is given */
  fallback?: ReactNode;
}

export function PermissionGuard({
  resource,
  action,
  minAccess,
  children,
  redirect,
  fallback = null,
}: PermissionGuardProps) {
  const { can, canRead, canWrite, canDelete, loading } = usePermissions();

  // While loading, render nothing (avoids flicker)
  if (loading) return null;

  // Check exact action if provided
  const passesAction = action ? can(resource, action) : true;

  // Check minimum access level if provided
  let passesMinAccess = true;
  if (minAccess) {
    if (minAccess === "read") passesMinAccess = canRead(resource);
    else if (minAccess === "read_write") passesMinAccess = canWrite(resource);
    else if (minAccess === "read_write_delete") passesMinAccess = canDelete(resource);
  }

  const allowed = passesAction && passesMinAccess;

  if (!allowed) {
    if (redirect) return <Navigate to={redirect as any} />;
    return <>{fallback}</>;
  }

  return <>{children}</>;
}