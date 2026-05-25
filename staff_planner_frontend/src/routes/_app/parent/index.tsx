import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ParentInbox } from "@/features/parent/components/ParentInbox";
import { ParentSchedule } from "@/features/parent/components/ParentSchedule";
import { cn } from "@/lib/utils";

type Tab = "schedule" | "inbox";

function ParentHome() {
  const [tab, setTab] = useState<Tab>("schedule");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Parent Portal</h1>
        <p className="text-sm text-muted-foreground">Manage your child's sessions</p>
      </header>

      {/* ── Tab bar ── */}
      <div className="flex gap-0 border-b">
        {(["schedule", "inbox"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "schedule" ? "Schedule" : "Inbox"}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === "schedule" ? <ParentSchedule /> : <ParentInbox />}
    </div>
  );
}

export const Route = createFileRoute("/_app/parent/")({
  component: ParentHome,
});
