import { useQuery } from "@tanstack/react-query";
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
