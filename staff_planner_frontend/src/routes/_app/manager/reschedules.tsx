import { createFileRoute } from "@tanstack/react-router";
import { ManagerReschedules } from "@/features/manager/components/ManagerReschedules";

export const Route = createFileRoute("/_app/manager/reschedules")({
  component: ManagerReschedules,
});
