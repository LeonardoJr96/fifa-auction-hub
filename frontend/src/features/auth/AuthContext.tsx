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
import type { Me } from "@/types/api";

interface CurrentUser {
  id: number;
  username: string;
  is_staff: boolean;
}

interface AuthState {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isStaff: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

async function fetchCurrentUser(): Promise<CurrentUser> {
  const me = await apiRequest<Me>("/users/me/");
  return {
    id: me.id,
    username: me.username,
    is_staff: me.is_staff === true,
  };
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

  const restoreSession = useCallback(async () => {
    const stored = loadStoredTokens();
    if (!stored) return false;

    try {
      const profile = await fetchCurrentUser();
      setUser(profile);
      return true;
    } catch {
      const renewed = await refreshSession();
      if (!renewed) {
        setTokens(null, null);
        return false;
      }
      try {
        const profile = await fetchCurrentUser();
        setUser(profile);
        return true;
      } catch {
        setTokens(null, null);
        return false;
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void restoreSession().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [restoreSession]);

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
      const profile = await fetchCurrentUser();
      setUser(profile);
      await queryClient.invalidateQueries();
    },
    [queryClient],
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
