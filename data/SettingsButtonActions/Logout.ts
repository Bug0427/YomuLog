// data/SettingsButtonActions/Logout.ts
// Uses React context for auth state — no more globalThis mutation or DeviceEventEmitter.
import { useAuthContext } from '../../context/AuthContext';

export function useLogout() {
  const { logout } = useAuthContext();
  return logout;
}

// Legacy-compatible export for non-hook callers (kept for gradual migration)
export function logout(navigation: any) {
  // Clear globals (legacy)
  (globalThis as any).currentAccountId = undefined;
  (globalThis as any).currentUsername = undefined;
  (globalThis as any).currentPassword = undefined;
  (globalThis as any).currentSecurityLevel = null;
  (globalThis as any).forceLoggedOut = true;
  (globalThis as any).authEpoch = ((globalThis as any).authEpoch || 0) + 1;
  // @ts-ignore
  navigation.replace?.('LoginScreen');
}
