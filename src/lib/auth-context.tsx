"use client";
// ═══════════════════════════════════════════════════════════════
// Auth Context — 全局认证状态管理
// Auth Context — Global auth state management
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { setCurrentUserId } from "@/lib/pouch";
import { setDreamsUserId } from "@/lib/dreams";
import { setRefinementUserId } from "@/lib/refinement";

interface AuthUser {
  id: string;
  username: string;
  email: string;
  createdAt: number;
  avatar?: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => ({ ok: false }),
  register: async () => ({ ok: false }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化：检查登录状态 / Init: check login status
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setCurrentUserId(d.user.id);
          setDreamsUserId(d.user.id);
          setRefinementUserId(d.user.id);
        } else {
          setCurrentUserId(null);
          setDreamsUserId("");
          setRefinementUserId("");
        }
      })
      .catch(() => setCurrentUserId(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setCurrentUserId(data.user.id);
        setDreamsUserId(data.user.id);
        setRefinementUserId(data.user.id);
        return { ok: true };
      }
      return { ok: false, error: data.error || "登录失败" };
    } catch {
      return { ok: false, error: "网络错误" };
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setCurrentUserId(data.user.id);
        setDreamsUserId(data.user.id);
        setRefinementUserId(data.user.id);
        return { ok: true };
      }
      return { ok: false, error: data.error || "注册失败" };
    } catch {
      return { ok: false, error: "网络错误" };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    setUser(null);
    setCurrentUserId(null);
    setDreamsUserId("");
    setRefinementUserId("");
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}