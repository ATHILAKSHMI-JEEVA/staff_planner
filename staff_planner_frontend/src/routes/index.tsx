import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  const role = user.roles?.[0] || "teacher";
  if (role === "manager") return <Navigate to="/manager" />;
  return <Navigate to={`/${role}` as any} />;
}
