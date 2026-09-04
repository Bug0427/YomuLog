// services/deleteAccount.ts
import { runAsync } from './feedbackRepo';
import { supabaseSignOut } from './supabaseAuth';

export async function deleteAccount(
  accountId: string,
  navigation: { replace?: (name: string) => void },
  setError: (msg: string) => void,
  setShowDeleteConfirm: (val: boolean) => void
) {
try {
    await runAsync('BEGIN');
    await runAsync('DELETE FROM ratings WHERE ACCOUNTID = ?', [accountId]);
    await runAsync('DELETE FROM comments WHERE ACCOUNTID = ?', [accountId]);
    await runAsync('DELETE FROM reports WHERE ACCOUNTID = ?', [accountId]);
    await runAsync('DELETE FROM users WHERE ACCOUNTID = ?', [accountId]);
    await runAsync('COMMIT');
} catch (e) {
    await runAsync('ROLLBACK');
    console.error('Delete account failed', e);
    setError('Failed to delete account.');
    return;
}

// Cleanup session + close modal
setShowDeleteConfirm(false);
(globalThis as any).currentAccountId = undefined;
(globalThis as any).currentUsername = undefined;

// Clear the Supabase session so entitlement/cloud sync data for this
// user is no longer resolvable in-app (best-effort, after local delete).
await supabaseSignOut();

// Kick back to login
  navigation.replace?.('LoginScreen');
}
