// src/features/admin/hooks/useRoles.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/axiosClient";
import type { RBACRole, Permission } from "@/types";

async function fetchAllRoles(): Promise<RBACRole[]> {
  const { data } = await apiClient.get("/roles");
  return data.roles;
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: fetchAllRoles,
  });
}

async function fetchRoleById(id: string): Promise<RBACRole> {
  const { data } = await apiClient.get(`/roles/${id}`);
  return data.role;
}

export function useRole(id: string | null) {
  return useQuery({
    queryKey: ["roles", id],
    queryFn: () => fetchRoleById(id!),
    enabled: !!id,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string; permissions?: Permission[] }) =>
      apiClient.post("/roles", payload).then((r) => r.data.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      description?: string;
      permissions?: Permission[];
    }) => apiClient.put(`/roles/${id}`, payload).then((r) => r.data.role),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["roles", vars.id] });
      qc.invalidateQueries({ queryKey: ["permissions-by-id"] });
      qc.invalidateQueries({ queryKey: ["permissions-by-name"] });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}