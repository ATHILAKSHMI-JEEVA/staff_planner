import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/axiosClient";
import type { AvailableSlot, Child, Session } from "@/types";

const unwrap = <T,>(d: any, key: string): T => (d?.[key] ?? d?.data ?? d) as T;

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

export function useChildSessions(childId: string | undefined, from: string, enabled = true) {
  return useQuery({
    queryKey: ["sessions", "child", childId, from],
    enabled: enabled && !!childId,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/sessions/my-child", {
          params: { child_id: childId, from },
        });
        return (data?.sessions || []) as Session[];
      } catch (e: any) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}

// ✅ UPDATED: now returns pending slot info for the confirm dialog
export function useReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      session_id,
      new_slot_id,
      child_id,
      reason,
    }: {
      session_id: string;
      new_slot_id: string;
      child_id: string;
      reason?: string;
    }) => {
      const { data } = await apiClient.post(`/sessions/${session_id}/reschedule`, {
        new_slot_id,
        child_id,
        reason,
      });
      return data as {
        session_id: string;
        pending: boolean;
        slot: {
          id: string;
          teacher_name: string;
          date: string;
          start_time: string;
          end_time: string;
        };
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

// ✅ NEW: Parent confirms or rejects the pending slot
export function useConfirmReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      session_id,
      decision,
    }: {
      session_id: string;
      decision: "approved" | "rejected";
    }) => {
      const { data } = await apiClient.post(`/sessions/${session_id}/confirm-reschedule`, {
        decision,
      });
      return data as { confirmed: boolean; session_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}