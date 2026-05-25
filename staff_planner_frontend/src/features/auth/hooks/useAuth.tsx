import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import apiClient from "@/api/axiosClient";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const { data } = await apiClient.get("/auth/me");
      // handle both {user: {...}} and {...} response shapes
      const u = data?.user ?? data;
      // make sure role_id is preserved
      setUser({
        id: u.id ?? u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        branch_id: u.branch_id,
        roles: u.roles,
        role_id: u.role_id ?? null,   // ← explicitly map role_id
      });
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await apiClient.post("/auth/login", { email, password });
    const token = data?.token || data?.access_token;
    if (!token) throw new Error("No token returned");
    localStorage.setItem("auth_token", token);

    const raw = data?.user ?? (await apiClient.get("/auth/me")).data?.user;
    const u: UserProfile = {
      id: raw.id ?? raw._id,
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      branch_id: raw.branch_id,
      roles: raw.roles,
      role_id: raw.role_id ?? null,   // ← explicitly map role_id
    };
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
    if (typeof window !== "undefined") window.location.href = "/login";
  };

  const refresh = async () => {
    setLoading(true);
    await fetchMe();
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}