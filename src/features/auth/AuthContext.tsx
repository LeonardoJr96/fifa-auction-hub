import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import {
  apiRequest,
  loadStoredTokens,
  refreshSession,
  setSessionLostHandler,
  setTokens,
} from "@/lib/api";

interface CurrentUser {
  id?: number;
  username: string;
  is_staff?: boolean;
}

interface AuthState {
  user: CurrentUser | null;
  /** true enquanto a sessão salva no navegador está sendo restaurada. */
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    setTokens(null, null);
    setUser(null);
    queryClient.clear();
    navigate({ to: "/login", replace: true, search: {} });
  }, [navigate, queryClient]);

  const userFromToken = useCallback((access: string, fallbackName = "") => {
    const claims = decodeJwt(access);
    setUser({
      username: (claims?.username as string) ?? fallbackName,
      id: typeof claims?.user_id === "number" ? (claims.user_id as number) : undefined,
      is_staff: claims?.is_staff === true,
    });
  }, []);

  // Restaura a sessão persistida no localStorage ao carregar a app.
  useEffect(() => {
    let cancelled = false;
    const stored = loadStoredTokens();
    if (!stored) {
      setIsLoading(false);
      return;
    }
    const claims = decodeJwt(stored.access);
    const exp = typeof claims?.exp === "number" ? (claims.exp as number) : 0;
    const stillValid = exp * 1000 > Date.now() + 5000;
    if (stillValid) {
      userFromToken(stored.access);
      setIsLoading(false);
      return;
    }
    void refreshSession().then((access) => {
      if (cancelled) return;
      if (access) userFromToken(access);
      else setTokens(null, null);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userFromToken]);

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
      userFromToken(data.access, username);
      await queryClient.invalidateQueries();
    },
    [queryClient, userFromToken],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      isStaff: user?.is_staff === true,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
