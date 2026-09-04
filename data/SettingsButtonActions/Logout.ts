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
  globalThis.currentAccountId = undefined;
  globalThis.currentUsername = undefined;
  globalThis.currentPassword = undefined;
  globalThis.currentSecurityLevel = null;
  globalThis.forceLoggedOut = true;
  globalThis.authEpoch = (globalThis.authEpoch || 0) + 1;
  navigation.replace?.('LoginScreen');
}
