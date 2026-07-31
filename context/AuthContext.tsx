// context/AuthContext.tsx
// Supabase authentication state management.
// Provides sign-in, sign-up, sign-out, and session restoration.
// Premium users are expected to also authenticate for cloud sync.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────

export type AuthContextValue = {
  /** Current Supabase user, or null if not signed in */
  user: User | null;
  /** Current session (contains access token, expiry, etc.) */
  session: Session | null;
  /** Whether auth is initializing (restoring session from storage) */
  loading: boolean;
  /** Whether Supabase is configured (env vars set) */
  configured: boolean;
  /** Sign in with email + password */
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  /** Sign up with email + password */
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Resend confirmation email */
  resendConfirmation: (email: string) => Promise<{ error?: string }>;
};

// ─── Context ─────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  // Restore session on mount
  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (sign in/out on other tabs, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!configured) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, [configured]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!configured) return { error: 'Supabase not configured' };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { needsConfirmation: !data.session };
  }, [configured]);

  const signOut = useCallback(async () => {
    if (!configured) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [configured]);

  const resendConfirmation = useCallback(async (email: string) => {
    if (!configured) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) return { error: error.message };
    return {};
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, loading, configured, signIn, signUp, signOut, resendConfirmation }),
    [user, session, loading, configured, signIn, signUp, signOut, resendConfirmation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
