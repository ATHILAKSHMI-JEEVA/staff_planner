// src/routes/_app/admin/branches.tsx
import { createFileRoute } from "@tanstack/react-router";
import { BranchesPage } from "@/features/admin/components/BranchesPage";

export const Route = createFileRoute("/_app/admin/branches")({
  component: BranchesPage,
});