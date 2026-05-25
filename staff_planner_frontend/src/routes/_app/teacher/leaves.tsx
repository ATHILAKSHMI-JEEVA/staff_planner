import { createFileRoute } from "@tanstack/react-router";
import { MyLeaves } from "@/features/teacher/components/MyLeaves";

export const Route = createFileRoute("/_app/teacher/leaves")({
  component: MyLeaves,
});
