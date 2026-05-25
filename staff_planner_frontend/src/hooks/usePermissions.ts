// src/hooks/usePermissions.ts
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/axiosClient";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Permission, PermissionAction, PermissionResource } from "@/types";

async function fetchPermissionsById(roleId: string): Promise<Permission[]> {
  const { data } = await apiClient.get(`/roles/${roleId}/permissions`);
  return data.permissions ?? [];
}

async function fetchPermissionsByName(roleName: string): Promise<Permission[]> {
  const { data } = await apiClient.get(`/roles/by-name/${roleName}/permissions`);
  return data.permissions ?? [];
}

export function usePermissions() {
  const { user } = useAuth();

  const isAdmin = user?.roles?.includes("admin") ?? false;
  const roleId = (user as any)?.role_id as string | undefined;
  const roleName = user?.roles?.find((r) => r !== "admin");

  const byId = useQuery({
    queryKey: ["permissions-by-id", roleId],
    queryFn: () => fetchPermissionsById(roleId!),
    enabled: !isAdmin && !!roleId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const byName = useQuery({
    queryKey: ["permissions-by-name", roleName],
    queryFn: () => fetchPermissionsByName(roleName!),
    enabled: !isAdmin && !roleId && !!roleName,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const permissions: Permission[] = roleId
    ? (byId.data ?? [])
    : (byName.data ?? []);

  const isLoading = roleId ? byId.isLoading : byName.isLoading;

  const ACTION_HIERARCHY: Record<PermissionAction, PermissionAction[]> = {
    read:               ["read", "read_write", "read_write_delete"],
    read_write:         ["read_write", "read_write_delete"],
    read_write_delete:  ["read_write_delete"],
    approve:            ["approve"],
    manage:             ["manage"],
  };

  const can = (resource: PermissionResource, action: PermissionAction): boolean => {
    if (isAdmin) return true;
    const equivalentActions = ACTION_HIERARCHY[action] ?? [action];
    return permissions.some(
      (p) => p.resource === resource && equivalentActions.includes(p.action)
    );
  };

  const canAny = (resource: PermissionResource, actions: PermissionAction[]): boolean => {
    if (isAdmin) return true;
    return actions.some((action) => can(resource, action));
  };

  const hasModuleAccess = (resource: PermissionResource): boolean => {
    if (isAdmin) return true;
    return permissions.some((p) => p.resource === resource);
  };

  const canRead    = (resource: PermissionResource) => can(resource, "read");
  const canWrite   = (resource: PermissionResource) => can(resource, "read_write");
  const canDelete  = (resource: PermissionResource) => can(resource, "read_write_delete");
  const canApprove = (resource: PermissionResource) => can(resource, "approve");
  const canManage  = (resource: PermissionResource) => can(resource, "manage");

  return {
    permissions,
    loading: isLoading,
    isAdmin,
    can,
    canAny,
    hasModuleAccess,
    canRead,
    canWrite,
    canDelete,
    canApprove,
    canManage,
  };
}