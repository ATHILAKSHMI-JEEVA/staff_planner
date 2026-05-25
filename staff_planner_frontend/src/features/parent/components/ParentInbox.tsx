import { useNavigate } from "@tanstack/react-router";
import { useNotifications, useMarkRead } from "@/features/notifications/hooks/useNotifications";
import { CardSkeleton, EmptyState } from "@/components/shared";
import { fmtRelative } from "@/utils/date.utils";
import { Bell, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ParentInbox() {
  const q = useNotifications();
  const mark = useMarkRead();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="text-sm text-muted-foreground">Updates about your child's sessions</p>
      </header>

      {q.isLoading ? (
        <CardSkeleton />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="All clear"
          description="You'll see notifications here when something needs your attention."
        />
      ) : (
        <div className="space-y-3">
          {q.data.map((n) => {
            const meta = n.meta_json || {};
            const showReschedule =
              n.type === "session_affected" && meta.session_id && meta.child_id;
            return (
              <div
                key={n.id}
                className={cn(
                  "rounded-2xl border p-5 transition",
                  n.is_read
                    ? "bg-card"
                    : "bg-blue-50/60 border-l-4 border-l-primary"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold">{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {fmtRelative(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => mark.mutate(n.id)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {showReschedule && (
                  <div className="mt-3">
                    <Button
                      onClick={() =>
                        navigate({
                          to: "/parent/reschedule" as any,
                          search: {
                            session: meta.session_id,
                            child: meta.child_id,
                            date: meta.date || "",
                          } as any,
                        })
                      }
                      className="bg-primary hover:bg-primary-hover text-primary-foreground"
                      size="sm"
                    >
                      Pick new slot <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
