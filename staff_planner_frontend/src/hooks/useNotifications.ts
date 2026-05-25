import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/axiosClient";
import type { Notification } from "@/types";

const unwrap = <T,>(d: any, key: string): T => (d?.[key] ?? d?.data ?? d) as T;

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "my"],
    enabled,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/notifications/my");
        return unwrap<Notification[]>(data, "notifications") || [];
      } catch (e: any) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
  });
}

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    enabled,
    refetchInterval: 30000,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/notifications/unread-count");
        return Number(data?.count ?? data?.unread ?? 0);
      } catch {
        return 0;
      }
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/notifications/${id}/read`);
      return data;
    },
    onSuccess: () => {
      // Invalidate both the list and the unread badge count
      qc.invalidateQueries({ queryKey: ["notifications", "my"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Mark all unread notifications as read in parallel
      await Promise.all(
        ids.map((id) => apiClient.patch(`/notifications/${id}/read`))
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "my"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
}