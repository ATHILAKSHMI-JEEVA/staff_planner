import { createFileRoute } from "@tanstack/react-router";
import { Reschedule } from "@/features/parent/components/Reschedule";

interface Search {
  session?: string;
  child?: string;
  date?: string;
}

export const Route = createFileRoute("/_app/parent/reschedule")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    session: s.session as string | undefined,
    child: s.child as string | undefined,
    date: s.date as string | undefined,
  }),
  component: Reschedule,
});
