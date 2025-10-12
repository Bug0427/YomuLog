import * as SQLite from 'expo-sqlite';
import { db, runAsync, initDb } from './feedbackRepo';
import { DeviceEventEmitter } from 'react-native';

// Tables present in feedbackRepo.ts
const TABLES = [
    'ratings',
    'comments',
    'reports',
    'users',
];

function clearAllSessions() {
    (globalThis as any).currentAccountId = undefined;
    (globalThis as any).currentUsername = undefined;
    (globalThis as any).currentPassword = undefined;
    (globalThis as any).currentSecurityLevel = null;
    // Reset in-memory securityLevel as well
    // Broadcast an app-wide logout signal so any screen can react
    DeviceEventEmitter.emit('app:forceLogout');
    console.log('🚪 All sessions cleared (force logout).');
}

/**
 * Soft reset: drop all app tables and VACUUM. Safe for dev usage.
 */
export async function resetDatabase(): Promise<void> {
    try {
    // Disable FKs to avoid drop order issues
    await db.execAsync('PRAGMA foreign_keys = OFF;');

    for (const t of TABLES) {
        await runAsync(`DROP TABLE IF EXISTS ${t};`);
    }

    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync('VACUUM;');

    // Recreate schema so the app can continue without a full reload
    await initDb();

    console.log('🔄 DB reset complete (dev).');
    clearAllSessions();
    DeviceEventEmitter.emit('app:dbReset');
    } catch (e) {
    console.error('❌ DB reset failed:', e);
    throw e;
    }
}

/**
 * Hard reset: delete the DB file entirely (Expo SDK 51+). Falls back to soft reset.
 */
export async function deleteDbFile(dbName: string = 'yomulog.db') {
try {
    const maybeDelete = (SQLite as any)?.deleteDatabaseAsync;
    if (typeof maybeDelete === 'function') {
    await maybeDelete(dbName);
    console.log(`🧨 Deleted DB file: ${dbName}`);
    await initDb();
    clearAllSessions();
    DeviceEventEmitter.emit('app:dbReset');
    return;
    }

    // Fallback for older SDKs that don't expose deleteDatabaseAsync
    await resetDatabase();
    console.log('🧨 Soft reset executed (deleteDatabaseAsync not available)');
    // resetDatabase already calls initDb and emits events
} catch (e) {
    console.warn('deleteDbFile failed; falling back to soft reset', e);
    try { await resetDatabase(); } catch {}
}
}