import { createFileRoute } from "@tanstack/react-router";
import { Approvals } from "@/features/admin/components/Approvals";

export const Route = createFileRoute("/_app/admin/approvals")({
  component: Approvals,
});
