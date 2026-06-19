// src/routes/_app/admin/dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import { StaffDirectoryPage } from "@/features/admin/components/StaffDirectory";

export const Route = createFileRoute("/_app/admin/dashboard")({
  component: StaffDirectoryPage,
});