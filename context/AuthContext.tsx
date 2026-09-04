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
        accountId: globalThis.currentAccountId ?? null,
        username: globalThis.currentUsername ?? null,
        securityLevel: globalThis.currentSecurityLevel ?? null,
        isLoggedIn: !!globalThis.currentAccountId,
      });

      const login = useCallback((accountId: string, username: string, securityLevel: number) => {
        globalThis.currentAccountId = accountId;
        globalThis.currentUsername = username;
        globalThis.currentSecurityLevel = securityLevel;
        globalThis.forceLoggedOut = false;
        setState({ accountId, username, securityLevel, isLoggedIn: true });
      }, []);

      const logout = useCallback(() => {
        globalThis.currentAccountId = undefined;
        globalThis.currentUsername = undefined;
        globalThis.currentPassword = undefined;
        globalThis.currentSecurityLevel = null;
        globalThis.forceLoggedOut = true;
        globalThis.authEpoch = (globalThis.authEpoch || 0) + 1;
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
