import { createFileRoute } from "@tanstack/react-router";
import { AttendancePage } from "@/features/admin/components/AttendancePage";

export const Route = createFileRoute("/_app/admin/attendance")({
  component: AttendancePage,
});