import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/axiosClient";
import type { LeaveRequest, ShortfallAlert } from "@/types";

const unwrap = <T,>(d: any, key: string): T =>
  (d?.[key] ?? d?.data ?? d) as T;

export function useMyLeaves(enabled = true) {
  return useQuery({
    queryKey: ["leaves", "my"],
    enabled,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/leaves/my");
        return unwrap<LeaveRequest[]>(data, "leaves") || [];
      } catch (e: any) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}

export function usePendingLeaves(enabled = true) {
  return useQuery({
    queryKey: ["leaves", "pending"],
    enabled,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/leaves/pending");
        return unwrap<LeaveRequest[]>(data, "leaves") || [];
      } catch (e: any) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}

export function useApplyLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { date: string; reason: string }) => {
      const { data } = await apiClient.post("/leaves/apply", payload);
      return data?.leave || data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaves"] }),
  });
}

export function useDecideLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => {
      const { data } = await apiClient.patch(`/leaves/${id}/decision`, { decision });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaves"] }),
  });
}

export function useShortfalls(date: string, enabled = true) {
  return useQuery({
    queryKey: ["shortfalls", date],
    enabled: enabled && !!date,
    refetchInterval: 30000,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get(`/sessions/shortfalls`, { params: { date } });
        return unwrap<ShortfallAlert[]>(data, "shortfalls") || [];
      } catch (e: any) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}
