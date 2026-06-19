// src/features/admin/hooks/useStaffDirectory.ts

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/axiosClient";
import type { StaffDirectory } from "@/types";

async function fetchStaffDirectory(): Promise<StaffDirectory> {
  const { data } = await apiClient.get("/staff-directory");
  return data;
}

export function useStaffDirectory() {
  return useQuery({ queryKey: ["staff-directory"], queryFn: fetchStaffDirectory });
}