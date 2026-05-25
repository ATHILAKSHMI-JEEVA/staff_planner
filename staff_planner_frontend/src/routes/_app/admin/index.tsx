import { createFileRoute } from "@tanstack/react-router";
import { AdminShortfalls } from "@/features/admin/components/AdminShortfalls";

export const Route = createFileRoute("/_app/admin/")({
  component: AdminShortfalls,
});
