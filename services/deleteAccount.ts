// services/deleteAccount.ts
import { runAsync } from './feedbackRepo';

export async function deleteAccount(
accountId: string,
navigation: any,
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

// Kick back to login
// @ts-ignore
navigation.replace?.('LoginScreen');
}