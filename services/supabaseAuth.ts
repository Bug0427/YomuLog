// services/supabaseAuth.ts
// Supabase Auth integration for YomuLog.
//
// Bridges the app's local account system (feedbackRepo `users` table) with
// Supabase Auth so that getUserId() (services/stripeService.ts,
// services/cloudSync.ts, services/supabaseSyncService.ts) resolves a real
// user id. Premium entitlement (user_subscriptions) and Cloud Sync are keyed
// by the Supabase user id, so a real persisted session is required for the
// server-driven entitlement path to work end-to-end.
//
// Flow:
//   - CreateAccount: after the local account is created, signUp() provisions
//     the Supabase Auth user with the same email + password.
//   - Login (AuthScreen / LoginScreen): after local credentials verify,
//     signIn() establishes the Supabase session. supabase-js persists the
//     session via AsyncStorage and restores it automatically on app start.
//   - Logout / deleteAccount: signOut() clears the Supabase session.
//
// Failures are intentionally NON-BLOCKING: if Supabase is unreachable, the
// account hasn't been provisioned yet, or email confirmation is pending,
// the local session still works — premium/cloud sync simply stay off until
// a Supabase session exists (fail-closed, consistent with the gating matrix).

import { supabase, isSupabaseConfigured } from './supabaseClient';

export type SupabaseAuthResult = {
  ok: boolean;
  /** Human-readable failure reason (for logs / non-blocking UI hints). */
  error?: string;
  /** True when the failure is a pending email confirmation. */
  needsEmailConfirmation?: boolean;
  /** True when sign-up failed because the email is already registered. */
  userAlreadyRegistered?: boolean;
};

/**
 * Sign the user into Supabase with their app-account email + password.
 * Persists the session (AsyncStorage) — restored automatically on launch.
 */
export async function supabaseSignIn(
  email: string,
  password: string,
): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured() || !email || !password) {
    return { ok: false, error: 'Supabase not configured' };
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return {
        ok: false,
        error: error.message,
        needsEmailConfirmation: /confirm|verif/i.test(error.message),
      };
    }
    return { ok: Boolean(data.session) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Supabase sign-in failed' };
  }
}

/**
 * Provision a Supabase Auth user for a newly created app account
 * (same email + password). If the project requires email confirmation,
 * `needsEmailConfirmation` is set and the user must confirm before
 * sign-in succeeds — local login still works regardless.
 */
export async function supabaseSignUp(
  email: string,
  password: string,
): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured() || !email || !password) {
    return { ok: false, error: 'Supabase not configured' };
  }
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return {
        ok: false,
        error: error.message,
        userAlreadyRegistered: /already registered/i.test(error.message),
      };
    }
    // No session returned ⇒ the project has "Confirm email" enabled and the
    // user must click the confirmation link before sign-in works.
    return { ok: Boolean(data.session || data.user), needsEmailConfirmation: !data.session };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Supabase sign-up failed' };
  }
}

/** Clear the Supabase session (logout / account deletion). Best-effort. */
export async function supabaseSignOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('Supabase sign-out failed (non-critical)', e);
  }
}

/** Current Supabase user id (null when no session — e.g. not signed in). */
export async function getSupabaseUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}
