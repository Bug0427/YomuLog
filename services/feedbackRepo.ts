import * as SQLite from 'expo-sqlite';
import { makeId } from '../utils/idGenerator';

// --- Dev toggle: set true to clear all tables on app start (useful while iterating)
const RESET_DB_ON_START = false; // flip to true temporarily when you want a clean slate

// Use the new typed API (SDK 51+): openDatabaseSync provides runAsync/execAsync helpers
export const db = SQLite.openDatabaseSync('yomulog.db');

// Convenience wrapper – keep signature compatible with previous calls
export const runAsync = (sql: string, params: any[] = []) => db.runAsync(sql, params);

// Wipe all application tables (children first), then VACUUM to reclaim space
export async function resetDb() {
await db.execAsync('BEGIN;');
try {
    await db.execAsync('DELETE FROM ratings;');
    await db.execAsync('DELETE FROM comments;');
    await db.execAsync('DELETE FROM reports;');
    await db.execAsync('DELETE FROM users;');
    await db.execAsync('COMMIT;');
} catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
}
// Reclaim pages after large deletes
await db.execAsync('VACUUM;');
}

// Hard reset: delete the DB file completely; fallback to soft reset if API not available
export async function deleteDbFile(dbName: string = 'yomulog.db') {
  try {
    const maybeDelete = (SQLite as any)?.deleteDatabaseAsync;
    if (typeof maybeDelete === 'function') {
      await maybeDelete(dbName);
      console.log(`🧨 Deleted DB file: ${dbName}`);
      return;
    }
    // Fallback for older SDKs
    await resetDb();
    console.log('🧨 Soft reset executed (deleteDatabaseAsync not available)');
  } catch (e) {
    console.warn('deleteDbFile failed; falling back to soft reset', e);
    try { await resetDb(); } catch {}
  }
}

// Common aliases so mismatched names don’t break calls
export const hardResetDb = deleteDbFile;
export const resetDatabaseFile = deleteDbFile;
export const deleteDatabase = deleteDbFile;

export async function initDb() {
// Optional: ensure pragmas you care about
await db.execAsync('PRAGMA foreign_keys = ON;');

await db.runAsync(
    `CREATE TABLE IF NOT EXISTS ratings (
    SUBMISSIONID TEXT PRIMARY KEY NOT NULL,
    ACCOUNTID TEXT NOT NULL,
    USERNM TEXT NOT NULL,
    RATING INTEGER NOT NULL CHECK (RATING BETWEEN 1 AND 5)
    )`
);

await db.runAsync(
    `CREATE TABLE IF NOT EXISTS comments (
    SUBMISSIONID TEXT PRIMARY KEY NOT NULL,
    ACCOUNTID TEXT NOT NULL,
    USERNM TEXT NOT NULL,
    COMMENTS TEXT NOT NULL CHECK (length(COMMENTS) <= 160)
    )`
);

await db.runAsync(
    `CREATE TABLE IF NOT EXISTS reports (
    SUBMISSIONID TEXT PRIMARY KEY NOT NULL,
    ACCOUNTID TEXT NOT NULL,
    USERNM TEXT NOT NULL,
    MAINCAT TEXT NOT NULL,
    SUBCAT TEXT NOT NULL,
    COMMENTS TEXT NOT NULL CHECK (length(COMMENTS) <= 160)
    )`
);


await db.runAsync(
    `CREATE TABLE IF NOT EXISTS users (
    ACCOUNTID   TEXT PRIMARY KEY NOT NULL,
    USERNM      TEXT UNIQUE NOT NULL,
    EMAIL       TEXT UNIQUE NOT NULL,
    PSWD        TEXT NOT NULL,
    SECURITYLVL INTEGER NOT NULL CHECK (SECURITYLVL IN (1,2,3)),
    PROFILEICON TEXT
    )`
);

// --- Backward-compat: older DBs may not have EMAIL column yet
try {
// Use getAllAsync so we get a plain array result from PRAGMA
const cols: any[] = await db.getAllAsync(`PRAGMA table_info(users)`);
const hasEmail = Array.isArray(cols) && cols.some((c: any) => String(c?.name).toUpperCase() === 'EMAIL');
if (!hasEmail) {
    await db.execAsync(`ALTER TABLE users ADD COLUMN EMAIL TEXT`);
    console.log('ℹ︎ Added users.EMAIL via migration');
}
// Ensure unique index exists (idempotent)
await db.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(EMAIL)`);
} catch (e) {
const msg = String((e as any)?.message || e);
if (/duplicate column name: EMAIL/i.test(msg)) {
    // Column already exists — ignore silently
} else {
    console.warn('User table migration check failed', e);
}
}

// --- Backward-compat: add PROFILEICON if it doesn't exist
try {
  const cols2: any[] = await db.getAllAsync(`PRAGMA table_info(users)`);
  const hasProfileIcon = Array.isArray(cols2) && cols2.some((c: any) => String(c?.name).toUpperCase() === 'PROFILEICON');
  if (!hasProfileIcon) {
    await db.execAsync(`ALTER TABLE users ADD COLUMN PROFILEICON TEXT`);
    console.log('ℹ︎ Added users.PROFILEICON via migration');
  }
} catch (e) {
  const msg2 = String((e as any)?.message || e);
  if (/duplicate column name: PROFILEICON/i.test(msg2)) {
    // already exists — ignore
  } else {
    console.warn('PROFILEICON migration check failed', e);
  }
}

// --- Optional dev reset -----------------------------------------------------
try {
// also allow toggling via globalThis.RESET_DB_ON_START = true at runtime
if (RESET_DB_ON_START || (globalThis as any)?.RESET_DB_ON_START === true) {
    console.log('⚠️  RESET_DB_ON_START is true → wiping all tables');
    await resetDb();
}
} catch (e) {
console.warn('DB reset failed', e);
}
try {
  const row = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM users`);
  if (!row || !row.c) {
    await seedDefaultUsers();
    const check = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM users`);
    console.log(`🌱 Auto-seeded users because table was empty. Count now: ${check?.c ?? 0}`);
  }
} catch (e) {
  console.warn('Auto-seed check failed', e);
}

console.log('✅ Database initialized');
}

// --- Insert helpers ---------------------------------------------------------
function genSubmissionId(prefix: string = 'SUB') {
return makeId(prefix);
}

export async function insertReport(row: {
accountId: string;
userNm: string;
mainCat: string; // CategoryId
subCat: string;
comments: string;
}) {
const submissionId = genSubmissionId('RPT');
const capped = (row.comments ?? '').slice(0, 160);
await db.runAsync(
    `INSERT INTO reports (SUBMISSIONID, ACCOUNTID, USERNM, MAINCAT, SUBCAT, COMMENTS)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [submissionId, row.accountId, row.userNm, row.mainCat, row.subCat, capped]
);
return submissionId;
}

export async function insertComment(row: {
accountId: string;
userNm: string;
comments: string;
}) {
const submissionId = genSubmissionId('CMT');
const capped = (row.comments ?? '').slice(0, 160);
await db.runAsync(
    `INSERT INTO comments (SUBMISSIONID, ACCOUNTID, USERNM, COMMENTS)
    VALUES (?, ?, ?, ?)`,
    [submissionId, row.accountId, row.userNm, capped]
);
return submissionId;
}

export async function insertRating(row: {
accountId: string;
userNm: string;
rating: number; // 1..5
}) {
const submissionId = genSubmissionId('RTG');
await db.runAsync(
    `INSERT INTO ratings (SUBMISSIONID, ACCOUNTID, USERNM, RATING)
    VALUES (?, ?, ?, ?)`,
    [submissionId, row.accountId, row.userNm, row.rating]
);
return submissionId;
}

// --- Users helpers ----------------------------------------------------------
export enum SecurityLevel {
Admin = 1,
Paid = 2,
Regular = 3,
}

export type UserRow = {
accountId: string;
userNm: string;
email: string;
pswd: string; // NOTE: store hashed in production
securityLvl: SecurityLevel; // 1=admin,2=paid,3=regular
};

export async function createUser(row: UserRow) {
await db.runAsync(
    `INSERT INTO users (ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL)
    VALUES (?, ?, ?, ?, ?)`,
    [row.accountId, row.userNm, row.email, row.pswd, row.securityLvl]
);
return row.accountId;
}

export async function upsertUser(row: UserRow) {
// Try update first; if no row changed, insert
const res = await db.runAsync(
    `UPDATE users SET USERNM = ?, EMAIL = ?, PSWD = ?, SECURITYLVL = ? WHERE ACCOUNTID = ?`,
    [row.userNm, row.email, row.pswd, row.securityLvl, row.accountId]
);
// @ts-ignore rowsAffected exists on result for runAsync
if (!res?.rowsAffected) {
    await db.runAsync(
    `INSERT INTO users (ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL) VALUES (?,?,?,?,?)`,
    [row.accountId, row.userNm, row.email, row.pswd, row.securityLvl]
    );
}
return row.accountId;
}

export async function getUserByUsername(userNm: string) {
  return await db.getFirstAsync(
    `SELECT ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL FROM users WHERE USERNM = ? LIMIT 1`,
    [userNm]
  );
}

export async function setUserSecurityLevel(accountId: string, level: SecurityLevel) {
await db.runAsync(
    `UPDATE users SET SECURITYLVL = ? WHERE ACCOUNTID = ?`,
    [level, accountId]
);
}

export async function verifyUser(userNm: string, pswd: string) {
  return await db.getFirstAsync(
    `SELECT ACCOUNTID, USERNM, SECURITYLVL FROM users WHERE USERNM = ? AND PSWD = ? LIMIT 1`,
    [userNm, pswd]
  );
}

export async function updateProfileIcon(accountId: string, iconId: string) {
  await db.runAsync(
    `UPDATE users SET PROFILEICON = ? WHERE ACCOUNTID = ?`,
    [iconId, accountId]
  );
}

export async function seedDefaultUsers() {
  await runAsync(
    `INSERT OR IGNORE INTO users (ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL) VALUES (?,?,?,?,?)`,
    ['USR_admin', 'admin', 'admin@yomulog.test', 'AdminPass1!', 1]
  );
  await runAsync(
    `INSERT OR IGNORE INTO users (ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL) VALUES (?,?,?,?,?)`,
    ['USR_paid', 'paiduser', 'paid@yomulog.test', 'PaidPass1!', 2]
  );
  await runAsync(
    `INSERT OR IGNORE INTO users (ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL) VALUES (?,?,?,?,?)`,
    ['USR_regular', 'regular', 'regular@yomulog.test', 'RegPass1!', 3]
  );
  const rs = await runAsync(`SELECT ACCOUNTID, USERNM, EMAIL, SECURITYLVL FROM users ORDER BY USERNM`);
  // @ts-ignore
  console.log('🌱 After seed, users:', rs?.rows?._array ?? []);
}

// Typed row helpers for reads (return plain arrays/rows)
export const queryAll = <T = any>(sql: string, params: any[] = []) => db.getAllAsync<T>(sql, params);
export const queryFirst = <T = any>(sql: string, params: any[] = []) => db.getFirstAsync<T>(sql, params);