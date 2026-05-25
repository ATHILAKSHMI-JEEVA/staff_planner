import { createFileRoute } from "@tanstack/react-router";
import { ManagerLeaves } from "@/features/manager/components/ManagerLeaves";

export const Route = createFileRoute("/_app/manager/leaves")({
  component: ManagerLeaves,
});
