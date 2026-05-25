import { Link, useLocation } from "@tanstack/react-router";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUnreadCount } from "@/features/notifications/hooks/useNotifications";
import { cn } from "@/lib/utils";

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { data: unread = 0 } = useUnreadCount(!!user);

  if (!user) return null;
  const role = user.roles?.[0];

  const links: { to: string; label: string }[] = [];
  if (role === "teacher") {
    links.push({ to: "/teacher", label: "Dashboard" });
    links.push({ to: "/teacher/leaves", label: "My Leaves" });
  } else if (role === "parent") {
    links.push({ to: "/parent", label: "Inbox" });
  } else if (role === "admin") {
    links.push({ to: "/admin", label: "Shortfalls" });
    links.push({ to: "/admin/approvals", label: "Approvals" });
    links.push({ to: "/admin/audit", label: "Audit Log" });
  }

  return (
    <header className="bg-primary text-primary-foreground shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to={`/${role}` as any} className="flex items-center gap-2 font-bold">
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center font-black">
            B
          </div>
          <span className="hidden sm:inline">Bright Steps</span>
        </Link>

        <nav className="flex items-center gap-1 ml-2 flex-1 overflow-x-auto">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to as any}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition",
                  active ? "bg-white/25" : "hover:bg-white/15"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <Link
          to="/notifications"
          className="relative p-2 rounded-lg hover:bg-white/15"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold h-5 min-w-5 px-1 flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <button
          onClick={logout}
          className="p-2 rounded-lg hover:bg-white/15"
          aria-label="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
