import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/axiosClient";
import type { Session } from "@/types";

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

// Mark a client as arrived (attendance)
export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await apiClient.post(`/sessions/${sessionId}/attendance/`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

// Undo attendance
export function useUndoAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await apiClient.delete(`/sessions/${sessionId}/attendance/`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

// Get attendance list (admin/manager use)
export function useAttendanceList(date: string, branchId?: string) {
  return useQuery({
    queryKey: ["attendance", date, branchId],
    enabled: !!date,
    queryFn: async () => {
      const params: Record<string, string> = { date };
      if (branchId) params.branch_id = branchId;
      const { data } = await apiClient.get("/sessions/attendance/", { params });
      return data.attendances as AttendanceRecord[];
    },
  });
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  staff_id: string;
  staff_name: string;
  child_id: string;
  child_name: string;
  branch_id?: string;
  date: string;
  arrived_at: string;
  left_at?: string | null;
  marked_at: string;
  session_start?: string;
  session_end?: string;
}

// Checkout — mark client as left
export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await apiClient.post(`/sessions/${sessionId}/checkout/`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

// Undo checkout
export function useUndoCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await apiClient.delete(`/sessions/${sessionId}/checkout/`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useAllSessions(date: string, branchId?: string) {
  return useQuery({
    queryKey: ["sessions", "all", date, branchId],
    enabled: !!date,
    queryFn: async () => {
      try {
        const params: Record<string, string> = { date };

        if (branchId) {
          params.branch_id = branchId;
        }

        const { data } = await apiClient.get("/sessions", {
          params,
        });

        return unwrap<Session[]>(data, "sessions") || [];
      } catch (e: any) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}