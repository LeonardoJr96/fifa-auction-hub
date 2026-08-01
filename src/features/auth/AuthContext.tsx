import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { apiRequest, setSessionLostHandler, setTokens } from "@/lib/api";

interface CurrentUser {
  id?: number;
  username: string;
  is_staff?: boolean;
}

interface AuthState {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isStaff: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "="));
    return JSON.parse(decodeURIComponent(escape(json))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    setTokens(null, null);
    setUser(null);
    queryClient.clear();
    navigate({ to: "/login", replace: true, search: {} });
  }, [navigate, queryClient]);

  useEffect(() => {
    setSessionLostHandler(() => {
      setUser(null);
    });
    return () => setSessionLostHandler(null);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await apiRequest<{ access: string; refresh: string }>("/login/", {
        method: "POST",
        auth: true,
        body: { username, password },
      });
      setTokens(data.access, data.refresh);
      const claims = decodeJwt(data.access);
      setUser({
        username: (claims?.username as string) ?? username,
        id: typeof claims?.user_id === "number" ? (claims.user_id as number) : undefined,
        is_staff: claims?.is_staff === true,
      });
      await queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isStaff: user?.is_staff === true,
      login,
      logout,
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
