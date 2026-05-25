import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/axiosClient";
import type { AuditLogEntry, SubstituteTeacher } from "@/types";

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/admin/audit");
        return (data?.logs ?? data?.entries ?? data?.data ?? data ?? []) as AuditLogEntry[];
      } catch (e: any) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}

export function useSubstitutes(date: string, branchId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["substitutes", date, branchId],
    enabled: enabled && !!date,
    queryFn: async () => {
      try {
        const params: Record<string, string> = { date };
        if (branchId) params.branch_id = branchId;
        const { data } = await apiClient.get("/sessions/substitutes", { params });
        return (data?.substitutes ?? data ?? []) as SubstituteTeacher[];
      } catch (e: any) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}

export function useReassignSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      new_teacher_id,
    }: {
      sessionId: string;
      new_teacher_id: string;
    }) => {
      const { data } = await apiClient.post(`/sessions/${sessionId}/reassign`, { new_teacher_id });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shortfalls"] });
      qc.invalidateQueries({ queryKey: ["substitutes"] });
    },
  });
}
