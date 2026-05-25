import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/axiosClient";
import type { LeaveRequest, ManagerStats, RescheduleRequest } from "@/types";

const unwrap = <T,>(d: any, key: string): T =>
  (d?.[key] ?? d?.data ?? d) as T;

export function useManagerStats(enabled = true) {
  return useQuery({
    queryKey: ["manager", "stats"],
    enabled,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await apiClient.get("/manager/dashboard");
      return data as ManagerStats;
    },
  });
}

export function useManagerLeaves(enabled = true) {
  return useQuery({
    queryKey: ["manager", "leaves"],
    enabled,
    retry: 1,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/leaves/pending");
        return unwrap<LeaveRequest[]>(data, "leaves") || [];
      } catch (e: any) {
        // 404 = no data, return empty. Any other error, rethrow so UI shows error state
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}

export function useManagerDecideLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
    }: {
      id: string;
      decision: "approved" | "rejected";
    }) => {
      const { data } = await apiClient.patch(`/leaves/${id}/decision`, {
        decision,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager"] });
      qc.invalidateQueries({ queryKey: ["leaves"] });
    },
  });
}

export function useManagerReschedules(enabled = true) {
  return useQuery({
    queryKey: ["manager", "reschedules"],
    enabled,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/manager/reschedules");
        return unwrap<RescheduleRequest[]>(data, "sessions") || [];
      } catch (e: any) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}

export function useManagerDecideReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
    }: {
      id: string;
      decision: "approved" | "rejected";
    }) => {
      const { data } = await apiClient.patch(
        `/manager/reschedules/${id}/decision`,
        { decision }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager"] });
    },
  });
}
