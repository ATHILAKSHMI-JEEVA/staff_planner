import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/axiosClient";
import type { ShortfallAlert } from "@/types";

const unwrap = <T,>(d: any, key: string): T => (d?.[key] ?? d?.data ?? d) as T;

export function useShortfalls(date: string, enabled = true) {
    return useQuery({
        queryKey: ["shortfalls", date],
        enabled: enabled && !!date,
        queryFn: async () => {
            try {
                const { data } = await apiClient.get(`/sessions/shortfalls`, {
                    params: { date }
                });
                return unwrap<ShortfallAlert[]>(data, "shortfalls") || [];
            } catch (e: any) {
                if (e?.response?.status === 404) return [];
                throw e;
            }
        },
    });
}