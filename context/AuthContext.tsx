// context/AuthContext.tsx
// Simple auth state management via React context — replaces globalThis mutations.
import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type AuthState = {
  accountId: string | null;
  username: string | null;
  securityLevel: number | null;
  isLoggedIn: boolean;
};

type AuthContextValue = AuthState & {
  login: (accountId: string, username: string, securityLevel: number) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    accountId: (globalThis as any).currentAccountId ?? null,
    username: (globalThis as any).currentUsername ?? null,
    securityLevel: (globalThis as any).currentSecurityLevel ?? null,
    isLoggedIn: !!(globalThis as any).currentAccountId,
  });

  const login = useCallback((accountId: string, username: string, securityLevel: number) => {
    (globalThis as any).currentAccountId = accountId;
    (globalThis as any).currentUsername = username;
    (globalThis as any).currentSecurityLevel = securityLevel;
    (globalThis as any).forceLoggedOut = false;
    setState({ accountId, username, securityLevel, isLoggedIn: true });
  }, []);

  const logout = useCallback(() => {
    (globalThis as any).currentAccountId = undefined;
    (globalThis as any).currentUsername = undefined;
    (globalThis as any).currentPassword = undefined;
    (globalThis as any).currentSecurityLevel = null;
    (globalThis as any).forceLoggedOut = true;
    (globalThis as any).authEpoch = ((globalThis as any).authEpoch || 0) + 1;
    setState({ accountId: null, username: null, securityLevel: null, isLoggedIn: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
