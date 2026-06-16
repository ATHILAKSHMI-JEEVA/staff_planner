// src/features/admin/hooks/useBranches.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/axiosClient";
import type { Branch, BranchDetail, BranchMemberType } from "@/types";

// ── Fetch all branches ────────────────────────────────────────────────────────
async function fetchBranches(): Promise<Branch[]> {
  const { data } = await apiClient.get("/branches");
  return data.branches;
}

export function useBranches() {
  return useQuery({ queryKey: ["branches"], queryFn: fetchBranches });
}

// ── Fetch single branch with members ─────────────────────────────────────────
async function fetchBranch(id: string): Promise<BranchDetail> {
  const { data } = await apiClient.get(`/branches/${id}`);
  return data.branch;
}

export function useBranch(id: string | null) {
  return useQuery({
    queryKey: ["branches", id],
    queryFn:  () => fetchBranch(id!),
    enabled:  !!id,
  });
}

// ── Create branch ─────────────────────────────────────────────────────────────
export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; address?: string; phone?: string }) =>
      apiClient.post("/branches", payload).then((r) => r.data.branch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches"] }),
  });
}

// ── Update branch ─────────────────────────────────────────────────────────────
export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: { id: string; name?: string; address?: string; phone?: string; is_active?: boolean }) =>
      apiClient.put(`/branches/${id}`, payload).then((r) => r.data.branch),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      qc.invalidateQueries({ queryKey: ["branches", vars.id] });
    },
  });
}

// ── Delete branch ─────────────────────────────────────────────────────────────
export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/branches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches"] }),
  });
}

// ── Fetch available managers for a branch ────────────────────────────────────
export interface AvailableManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: string[];
  managed_branch_ids: string[];
  already_assigned: boolean;
}

async function fetchAvailableManagers(branchId: string): Promise<AvailableManager[]> {
  const { data } = await apiClient.get(`/branches/${branchId}/available-managers`);
  return data.managers;
}

export function useAvailableManagers(branchId: string | null) {
  return useQuery({
    queryKey: ["branches", branchId, "available-managers"],
    queryFn:  () => fetchAvailableManagers(branchId!),
    enabled:  !!branchId,
  });
}

// ── Add member to branch ──────────────────────────────────────────────────────
export function useAddBranchMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      ...payload
    }: {
      branchId: string;
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      memberType: BranchMemberType;
      existingUserId?: string;
      childNames?: string[];
    }) =>
      apiClient.post(`/branches/${branchId}/members`, payload).then((r) => r.data.user),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      qc.invalidateQueries({ queryKey: ["branches", vars.branchId] });
    },
  });
}

// ── Remove member from branch ─────────────────────────────────────────────────
export function useRemoveBranchMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, userId }: { branchId: string; userId: string }) =>
      apiClient.delete(`/branches/${branchId}/members/${userId}`),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      qc.invalidateQueries({ queryKey: ["branches", vars.branchId] });
    },
  });
}