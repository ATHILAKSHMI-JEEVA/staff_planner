import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/axiosClient";
import type { AvailableSlot, Child, Session } from "@/types";

const unwrap = <T,>(d: any, key: string): T => (d?.[key] ?? d?.data ?? d) as T;

export function useMySessions(date: string, enabled = true) {
  return useQuery({
    queryKey: ["sessions", "my", date],
    enabled: enabled && !!date,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/sessions/my", { params: { date } });
        return unwrap<Session[]>(data, "sessions") || [];
      } catch (e: any) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}

export function useAvailableSlots(date: string, enabled = true) {
  return useQuery({
    queryKey: ["sessions", "available", date],
    enabled: enabled && !!date,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/sessions/available", { params: { date } });
        return unwrap<AvailableSlot[]>(data, "slots") || [];
      } catch (e: any) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}

export function useMyChildren(enabled = true) {
  return useQuery({
    queryKey: ["children", "my"],
    enabled,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/children/my");
        return unwrap<Child[]>(data, "children") || [];
      } catch (e: any) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}

export function useReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      session_id,
      new_slot_id,
      child_id,
    }: {
      session_id: string;
      new_slot_id: string;
      child_id: string;
    }) => {
      const { data } = await apiClient.post(`/sessions/${session_id}/reschedule`, {
        new_slot_id,
        child_id,
        parent_confirmed: true,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
