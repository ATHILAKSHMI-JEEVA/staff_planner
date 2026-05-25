import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNotifications, useMarkRead, useMarkAllRead } from "@/features/notifications/hooks/useNotifications";
import { CardSkeleton, EmptyState } from "@/components/shared";
import { fmtRelative } from "@/utils/date.utils";
import { Bell, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const q = useNotifications();
  const mark = useMarkRead();
  const markAll = useMarkAllRead();

  // Auto-mark all unread notifications as read when the page is opened
  useEffect(() => {
    if (!q.data) return;
    const unreadIds = q.data.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      markAll.mutate(unreadIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data?.length]);

  const unreadCount = q.data?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">All your updates in one place</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              const ids = q.data?.filter((n) => !n.is_read).map((n) => n.id) ?? [];
              if (ids.length) markAll.mutate(ids);
            }}
            disabled={markAll.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
        )}
      </header>

      {q.isLoading ? (
        <CardSkeleton />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="You're all caught up"
          description="New notifications will appear here."
        />
      ) : (
        <div className="space-y-3">
          {q.data.map((n) => (
            <div
              key={n.id}
              className={cn(
                "rounded-2xl border p-5",
                n.is_read ? "bg-card" : "bg-blue-50/60 border-l-4 border-l-primary"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{fmtRelative(n.created_at)}</p>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}