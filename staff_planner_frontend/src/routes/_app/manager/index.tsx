import { createFileRoute } from "@tanstack/react-router";
import { ManagerDashboard } from "@/features/manager/components/ManagerDashboard";

export const Route = createFileRoute("/_app/manager/")({
  component: ManagerDashboard,
});
