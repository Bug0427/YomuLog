// data/SettingsButtonActions/Logout.ts
// Uses React context for auth state — no more globalThis mutation or DeviceEventEmitter.
import { useAuthContext } from '../../context/AuthContext';
import { supabaseSignOut } from '../../services/supabaseAuth';

export function useLogout() {
  const { logout } = useAuthContext();
  return logout;
}

// Legacy-compatible export for non-hook callers (kept for gradual migration)
type LegacyNavigation = {
  replace?: (name: string) => void;
};
export async function logout(navigation: LegacyNavigation) {
  // Clear the Supabase session first (entitlement/cloud sync are keyed by
  // Supabase user id) — best-effort, never blocks the local sign-out.
  await supabaseSignOut();
  // Clear globals (legacy)
  (globalThis as any).currentAccountId = undefined;
  (globalThis as any).currentUsername = undefined;
  (globalThis as any).currentPassword = undefined;
  (globalThis as any).currentSecurityLevel = null;
  (globalThis as any).forceLoggedOut = true;
  (globalThis as any).authEpoch = ((globalThis as any).authEpoch || 0) + 1;
  navigation.replace?.('LoginScreen');
}
