import { createFileRoute } from "@tanstack/react-router";

import TeacherAttendancePage from "@/features/teacher/components/TeacherAttendancePage";

export const Route = createFileRoute("/_app/teacher/attendance")({
  component: TeacherAttendancePage,
});