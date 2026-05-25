import { toast } from "sonner";
import { Users } from "lucide-react";
import { CardSkeleton, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubstitutes, useReassignSession } from "@/features/admin/hooks/useAdmin";

interface SubstitutePickerProps {
  sessionId: string;
  childName: string;
  date: string;
  branchId?: string;
  onDone: () => void;
}

export function SubstitutePicker({
  sessionId,
  childName,
  date,
  branchId,
  onDone,
}: SubstitutePickerProps) {
  const { data: substitutes, isLoading } = useSubstitutes(date, branchId, true);
  const reassign = useReassignSession();

  const handleAssign = async (teacherId: string) => {
    try {
      await reassign.mutateAsync({ sessionId, new_teacher_id: teacherId });
      toast.success("Assigned successfully");
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to assign");
    }
  };

  return (
    <div className="mt-3 rounded-xl border bg-muted/30 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
        Assign substitute for{" "}
        <span className="text-foreground">{childName}</span>
      </p>

      {isLoading ? (
        <CardSkeleton count={2} />
      ) : !substitutes || substitutes.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No teachers available"
          description="All teachers are on leave for this date."
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card overflow-hidden">
          {substitutes.map((t) => (
            <li
              key={String(t.id)}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-medium text-sm truncate">{t.name}</span>
                {/* Load badge */}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground shrink-0">
                  {t.load} session{t.load === 1 ? "" : "s"} today
                </span>
                {/* Cross-branch badge */}
                {t.is_cross_branch && (
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0",
                      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    )}
                  >
                    Cross-branch
                  </span>
                )}
              </div>
              <Button
                size="sm"
                disabled={reassign.isPending}
                onClick={() => handleAssign(String(t.id))}
                className="shrink-0"
              >
                Assign
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
