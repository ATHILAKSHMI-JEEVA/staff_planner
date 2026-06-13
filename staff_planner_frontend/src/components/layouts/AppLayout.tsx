import { useState } from "react";
import { UserCheck as AttIcon } from "lucide-react";
import { Link, useLocation, Outlet, Navigate } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, Bell, LogOut, Menu, X, ShieldCheck,
  CheckSquare, ScrollText, AlertTriangle, Users, Calendar,
  CalendarClock, ChevronLeft, ChevronRight, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUnreadCount } from "@/features/notifications/hooks/useNotifications";
import { usePermissions } from "@/hooks/usePermissions";

interface NavItem { to: string; label: string; icon: React.ReactNode; badge?: number }

// ── Admin: always full access ─────────────────────────────────────────────────
function getAdminNavItems(): NavItem[] {
  return [
    { to: "/admin",            label: "Shortfalls",    icon: <AlertTriangle className="h-4 w-4" /> },
    { to: "/admin/approvals",  label: "Approvals",     icon: <CheckSquare className="h-4 w-4" /> },
    { to: "/admin/branches",   label: "Branches",      icon: <Building2 className="h-4 w-4" /> },
    { to: "/admin/audit",      label: "Audit Log",     icon: <ScrollText className="h-4 w-4" /> },
    { to: "/admin/roles",      label: "Roles & Perms", icon: <ShieldCheck className="h-4 w-4" /> },
    { to: "/notifications",    label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  ];
}

// ── Permission-aware nav for all non-admin roles ───────────────────────────────
function buildDynamicNavItems(
  role: string,
  can: (resource: any, action: any) => boolean,
  permLoading: boolean
): NavItem[] {

  // ── TEACHER ──────────────────────────────────────────────────────────────────
  if (role === "teacher") {
    const items: NavItem[] = [];

    if (permLoading || can("leaves", "read") || can("sessions", "read"))
      items.push({ to: "/teacher", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> });

    if (permLoading || can("leaves", "read"))
      items.push({ to: "/teacher/leaves", label: "My Leaves", icon: <FileText className="h-4 w-4" /> });

    items.push({ to: "/teacher/attendance", label: "Attendance", icon: <AttIcon className="h-4 w-4" /> });

    if (can("shortfalls", "read"))
      items.push({ to: "/admin", label: "Shortfalls", icon: <AlertTriangle className="h-4 w-4" /> });

    if (can("sessions", "read"))
      items.push({ to: "/admin/approvals", label: "Approvals", icon: <CheckSquare className="h-4 w-4" /> });

    if (can("users", "read"))
      items.push({ to: "/admin/approvals", label: "Staff", icon: <Users className="h-4 w-4" /> });

    if (can("roles", "read"))
      items.push({ to: "/admin/roles", label: "Roles & Perms", icon: <ShieldCheck className="h-4 w-4" /> });

    if (can("audit", "read"))
      items.push({ to: "/admin/audit", label: "Audit Log", icon: <ScrollText className="h-4 w-4" /> });

    items.push({ to: "/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> });
    return items;
  }

  // ── PARENT ───────────────────────────────────────────────────────────────────
  if (role === "parent") {
    const items: NavItem[] = [];

    if (permLoading || can("sessions", "read") || can("reschedules", "read"))
      items.push({ to: "/parent", label: "Schedule", icon: <Calendar className="h-4 w-4" /> });

    if (can("reschedules", "read"))
      items.push({ to: "/parent/reschedule", label: "Reschedule", icon: <CalendarClock className="h-4 w-4" /> });

    if (can("leaves", "read"))
      items.push({ to: "/manager/leaves", label: "Leaves", icon: <FileText className="h-4 w-4" /> });

    if (can("shortfalls", "read"))
      items.push({ to: "/admin", label: "Shortfalls", icon: <AlertTriangle className="h-4 w-4" /> });

    if (can("sessions", "read"))
      items.push({ to: "/admin/approvals", label: "Approvals", icon: <CheckSquare className="h-4 w-4" /> });

    if (can("users", "read"))
      items.push({ to: "/admin/approvals", label: "Staff", icon: <Users className="h-4 w-4" /> });

    if (can("roles", "read"))
      items.push({ to: "/admin/roles", label: "Roles & Perms", icon: <ShieldCheck className="h-4 w-4" /> });

    if (can("audit", "read"))
      items.push({ to: "/admin/audit", label: "Audit Log", icon: <ScrollText className="h-4 w-4" /> });

    items.push({ to: "/notifications", label: "Inbox", icon: <Bell className="h-4 w-4" /> });
    return items;
  }

  // ── MANAGER ──────────────────────────────────────────────────────────────────
  if (role === "manager") {
    const items: NavItem[] = [];

    items.push({ to: "/manager", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> });

    if (can("leaves", "read"))
      items.push({ to: "/manager/leaves", label: "Leaves", icon: <FileText className="h-4 w-4" /> });

    if (can("reschedules", "read"))
      items.push({ to: "/manager/reschedules", label: "Reschedules", icon: <CalendarClock className="h-4 w-4" /> });

    if (can("shortfalls", "read"))
      items.push({ to: "/admin", label: "Shortfalls", icon: <AlertTriangle className="h-4 w-4" /> });

    if (can("sessions", "read"))
      items.push({ to: "/admin/approvals", label: "Approvals", icon: <CheckSquare className="h-4 w-4" /> });

    if (can("users", "read"))
      items.push({ to: "/admin/approvals", label: "Staff", icon: <Users className="h-4 w-4" /> });

    if (can("roles", "read"))
      items.push({ to: "/admin/roles", label: "Roles & Perms", icon: <ShieldCheck className="h-4 w-4" /> });

    if (can("audit", "read"))
      items.push({ to: "/admin/audit", label: "Audit Log", icon: <ScrollText className="h-4 w-4" /> });

    items.push({ to: "/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> });
    return items;
  }

  return [];
}

const ROLE_COLORS: Record<string, string> = {
  teacher: "bg-blue-500",
  parent:  "bg-emerald-500",
  admin:   "bg-violet-500",
  manager: "bg-amber-500",
};

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const color = ROLE_COLORS[role] || "bg-indigo-500";
  return (
    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0", color)}>
      {initials}
    </div>
  );
}

export function AppLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: unread = 0 } = useUnreadCount(!!user);

  const { can, isAdmin, loading: permLoading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Loading…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;

  const role = user.roles?.[0] || "teacher";
  const navItems = isAdmin
    ? getAdminNavItems()
    : buildDynamicNavItems(role, can, permLoading);

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full" style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}>
      {/* Logo */}
      <div
        className={cn("flex items-center gap-3 px-4 py-5 border-b", collapsed && !mobile && "justify-center px-2")}
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="h-8 w-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-lg shadow-indigo-900/40">
          V
        </div>
        {(!collapsed || mobile) && (
          <div>
            <p className="font-bold text-sm leading-tight text-white">Bright Steps</p>
            <p className="text-[10px] capitalize font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
              {role} Portal
            </p>
          </div>
        )}
      </div>

      {(!collapsed || mobile) && (
        <div className="px-4 pt-5 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
            Navigation
          </span>
        </div>
      )}

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          const isNotif = item.to === "/notifications";
          return (
            <Link
              key={item.label}
              to={item.to as any}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative group",
                active
                  ? "bg-white/12 text-white"
                  : "text-white/55 hover:text-white/90 hover:bg-white/6",
                collapsed && !mobile && "justify-center px-2"
              )}
              title={collapsed && !mobile ? item.label : undefined}
            >
              {active && <span className="nav-active-bar" />}
              <span className="flex-shrink-0 relative">
                {item.icon}
                {isNotif && unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full text-[9px] font-bold h-4 min-w-4 px-0.5 flex items-center justify-center shadow-sm">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              {(!collapsed || mobile) && <span>{item.label}</span>}
              {(!collapsed || mobile) && isNotif && unread > 0 && (
                <span className="ml-auto bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-[10px] font-bold h-5 min-w-5 px-1.5 flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {collapsed && !mobile ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar name={user.name || role} role={role} />
            <button
              onClick={logout}
              className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/8 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Avatar name={user.name || role} role={role} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{user.name || "User"}</p>
              <p className="text-[11px] capitalize truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{role}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-white/30 hover:text-white/70 hover:bg-white/10 flex-shrink-0 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 relative",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}>
        <div className="h-full fixed" style={{ width: collapsed ? 60 : 220, transition: "width 0.3s" }}>
          <SidebarContent />
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="fixed top-1/2 -translate-y-1/2 z-20 h-6 w-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          style={{ left: collapsed ? 48 : 208 }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 w-64 h-screen flex flex-col shadow-2xl overflow-hidden">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 z-10"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent mobile />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-black text-xs">V</div>
            <span className="font-bold text-sm tracking-tight">Bright Steps</span>
          </div>
          <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full text-[9px] font-bold h-4 min-w-4 px-0.5 flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </header>

        <main className="flex-1 p-5 md:p-7 overflow-auto page-enter">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}