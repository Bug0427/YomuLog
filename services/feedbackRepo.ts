// =============================================================================
// feedbackRepo.ts
// Purpose: SQLite storage for feedback (ratings, comments, reports) and users
// Organization:
//   0) Imports & constants
//   1) DB open & low-level helpers
//   2) DB maintenance (reset, hard delete)
//   3) Schema initialization & migrations (initDb)
//   4) Seeding (seedDefaultUsers)
//   5) Inserts (reports, comments, ratings)
//   6) Users: types, CRUD, auth, profile
//   7) Typed query helpers
// =============================================================================

// 0) Imports & constants ------------------------------------------------------
import { openDatabase, type IDatabase } from './nativeDB';
import type { SQLiteBindValue } from 'expo-sqlite';
import { makeIdSafe, makeUserIdSafe } from '../utils/idGenerator';

// Dev toggle: set true to clear all tables on app start (useful while iterating)
const RESET_DB_ON_START = false; // flip to true temporarily when you want a clean slate

/** Row shape returned by `PRAGMA table_info(users)` (used for column-migration checks). */
type PRAGMAUserColumn = { name: string; [k: string]: unknown };

// 1) DB open & low-level helpers ---------------------------------------------
// Lazy-init: call getDb() to obtain the platform-safe database instance.
let _db: IDatabase | null = null;
async function getDb(): Promise<IDatabase> {
  if (!_db) _db = await openDatabase('yomulog.db');
  return _db;
}

// Convenience wrapper – keep signature compatible with previous calls
  export const runAsync = async (sql: string, params: SQLiteBindValue[] = []) => {
    const db = await getDb();
    return db.runAsync(sql, params);
  };

  // Typed query helpers (also platform-safe)
  export const queryAll = async <T = unknown>(sql: string, params: SQLiteBindValue[] = []) => {
    const db = await getDb();
    return db.getAllAsync<T>(sql, params);
  };
  export const queryFirst = async <T = unknown>(sql: string, params: SQLiteBindValue[] = []) => {
    const db = await getDb();
    return db.getFirstAsync<T>(sql, params);
  };

// 2) DB maintenance (reset, hard delete) -------------------------------------
// Wipe all application tables (children first), then VACUUM to reclaim space
export async function resetDb() {
  const db = await getDb();
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
    const db = await getDb();
    // Try native deleteDatabaseAsync if available (expo-sqlite specific)
          const maybeDelete = (db as IDatabase & { deleteDatabaseAsync?: (name: string) => Promise<void> })?.deleteDatabaseAsync;
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

// 3) Schema initialization & migrations --------------------------------------
export async function initDb() {
  const db = await getDb();
  // Optional: ensure pragmas you care about
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Core tables
  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS ratings (
    SID TEXT PRIMARY KEY NOT NULL,
    ACCOUNTID TEXT NOT NULL,
    RATING INTEGER NOT NULL CHECK (RATING BETWEEN 1 AND 5)
    )`
  );

  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS comments (
    SID TEXT PRIMARY KEY NOT NULL,
    ACCOUNTID TEXT NOT NULL,
    COMMENTS TEXT NOT NULL CHECK (length(COMMENTS) <= 160)
    )`
  );

  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS reports (
    SID TEXT PRIMARY KEY NOT NULL,
    ACCOUNTID TEXT NOT NULL,
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

  // --- Migrations: EMAIL column & index ------------------------------------
  try {
    // Use getAllAsync so we get a plain array result from PRAGMA
    const cols: PRAGMAUserColumn[] = await db.getAllAsync<PRAGMAUserColumn>(`PRAGMA table_info(users)`);
    const hasEmail = Array.isArray(cols) && cols.some((c) => String(c?.name).toUpperCase() === 'EMAIL');
    if (!hasEmail) {
      await db.execAsync(`ALTER TABLE users ADD COLUMN EMAIL TEXT`);
      console.log('ℹ︎ Added users.EMAIL via migration');
    }
    // Ensure unique index exists (idempotent)
    await db.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(EMAIL)`);
  } catch (e) {
    const msg = String((e as { message?: unknown })?.message || e);
    if (/duplicate column name: EMAIL/i.test(msg)) {
      // Column already exists — ignore silently
    } else {
      console.warn('User table migration check failed', e);
    }
  }

  // --- Migrations: PROFILEICON column --------------------------------------
  try {
    const cols2: PRAGMAUserColumn[] = await db.getAllAsync<PRAGMAUserColumn>(`PRAGMA table_info(users)`);
    const hasProfileIcon = Array.isArray(cols2) && cols2.some((c) => String(c?.name).toUpperCase() === 'PROFILEICON');
    if (!hasProfileIcon) {
      await db.execAsync(`ALTER TABLE users ADD COLUMN PROFILEICON TEXT`);
      console.log('ℹ︎ Added users.PROFILEICON via migration');
    }
  } catch (e) {
    const msg2 = String((e as { message?: unknown })?.message || e);
    if (/duplicate column name: PROFILEICON/i.test(msg2)) {
      // already exists — ignore
    } else {
      console.warn('PROFILEICON migration check failed', e);
    }
  }

  // --- Migrations: CREATED_AT column (G-3 retention — signup timestamp) ----
  try {
    const cols3: PRAGMAUserColumn[] = await db.getAllAsync<PRAGMAUserColumn>(`PRAGMA table_info(users)`);
    const hasCreatedAt = Array.isArray(cols3) && cols3.some((c) => String(c?.name).toUpperCase() === 'CREATED_AT');
    if (!hasCreatedAt) {
      await db.execAsync(`ALTER TABLE users ADD COLUMN CREATED_AT TEXT`);
      console.log('ℹ︎ Added users.CREATED_AT via migration');
    }
  } catch (e) {
    const msg3 = String((e as { message?: unknown })?.message || e);
    if (/duplicate column name: CREATED_AT/i.test(msg3)) {
      // already exists — ignore
    } else {
      console.warn('CREATED_AT migration check failed', e);
    }
  }

  // --- Optional dev reset ---------------------------------------------------
  try {
    // also allow toggling via globalThis.RESET_DB_ON_START = true at runtime
    if (RESET_DB_ON_START || globalThis.RESET_DB_ON_START === true) {
      console.log('⚠️  RESET_DB_ON_START is true → wiping all tables');
      await resetDb();
    }
  } catch (e) {
    console.warn('DB reset failed', e);
  }

  // --- Auto-seed users when empty ------------------------------------------
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

// 4) Seeding (dev convenience) -----------------------------------------------
export async function seedDefaultUsers() {
  const seededAt = new Date().toISOString();
  await runAsync(
    `INSERT OR IGNORE INTO users (ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL, CREATED_AT) VALUES (?,?,?,?,?,?)`,
    ['USR_admin', 'admin', 'admin@yomulog.test', 'AdminPass1!', 1, seededAt]
  );
  await runAsync(
    `INSERT OR IGNORE INTO users (ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL, CREATED_AT) VALUES (?,?,?,?,?,?)`,
    ['USR_paid', 'paiduser', 'paid@yomulog.test', 'PaidPass1!', 2, seededAt]
  );
  await runAsync(
    `INSERT OR IGNORE INTO users (ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL, CREATED_AT) VALUES (?,?,?,?,?,?)`,
    ['mainAccount', 'buggy', 'regular@yomulog.test', 'P@22w0rd', 3, seededAt]
  );
  const users = await queryAll(`SELECT ACCOUNTID, USERNM, EMAIL, SECURITYLVL, CREATED_AT FROM users ORDER BY USERNM`);
  console.log('🌱 After seed, users:', users);
}
// 5) Inserts (reports, comments, ratings) ------------------------------------
export async function insertReport(row: {
  accountId: string;
  mainCat: string; // CategoryId
  subCat: string;
  comments: string;
}) {
  const sid = await makeIdSafe('RPT'); // unique row id
  const capped = (row.comments ?? '').slice(0, 360);

  await runAsync(
    `INSERT INTO reports (SID, ACCOUNTID, MAINCAT, SUBCAT, COMMENTS)
     VALUES (?, ?, ?, ?, ?)`,
    [sid, row.accountId, row.mainCat, row.subCat, capped]
  );

  return { sid };
}

export async function insertComment(row: {
  accountId: string;
  comments: string;
}) {
  const sid = await makeIdSafe('CMT');
  const capped = (row.comments ?? '').slice(0, 160);
  await runAsync(
    `INSERT INTO comments (SID, ACCOUNTID, COMMENTS)
     VALUES (?, ?, ?)`,
    [sid, row.accountId, capped]
  );
  return { sid };
}

export async function insertRating(row: {
  accountId: string;
  rating: number; // 1..5
}) {
  const sid = await makeIdSafe('RAT');
  await runAsync(
    `INSERT INTO ratings (SID, ACCOUNTID, RATING)
     VALUES (?, ?, ?)`,
    [sid, row.accountId, row.rating]
  );
  return { sid };
}

export async function insertReview(row: {
  accountId: string;
  comments: string;
}) {
  const sid = await makeIdSafe('REV');
  const capped = (row.comments ?? '').slice(0, 360);
  await runAsync(
    `INSERT INTO comments (SID, ACCOUNTID, COMMENTS)
     VALUES (?, ?, ?)`,
    [sid, row.accountId, capped]
  );
  return { sid };
}

// 6) Users: types, CRUD, auth, profile --------------------------------------
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
  createdAt?: string; // ISO signup timestamp (G-3 retention); backfilled on insert
};

export async function CreateNewUser(row: {
  userNm: string;
  email: string;
  pswd: string;
  securityLvl: SecurityLevel;
}) {
  // use username + level to generate a safe unique ID
  const accountId = await makeUserIdSafe(row.securityLvl, row.userNm);

  await runAsync(
    `INSERT INTO users (ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL, CREATED_AT)
      VALUES (?, ?, ?, ?, ?, ?)`,
    [accountId, row.userNm, row.email, row.pswd, row.securityLvl, new Date().toISOString()]
  );

  return accountId;
}


export async function createUser(row: UserRow) {
  await runAsync(
    `INSERT INTO users (ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL, CREATED_AT)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [row.accountId, row.userNm, row.email, row.pswd, row.securityLvl, row.createdAt ?? new Date().toISOString()]
  );
  return row.accountId;
}

export async function upsertUser(row: UserRow) {
  // Try update first; if no row changed, insert
  const db = await getDb();
  const res = await db.runAsync(
    `UPDATE users SET USERNM = ?, EMAIL = ?, PSWD = ?, SECURITYLVL = ? WHERE ACCOUNTID = ?`,
    [row.userNm, row.email, row.pswd, row.securityLvl, row.accountId]
  );
  // rowsAffected may be undefined on some platforms; treat as no-op update
  if (!(res?.rowsAffected ?? 0)) {
    await runAsync(
      `INSERT INTO users (ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL, CREATED_AT) VALUES (?,?,?,?,?,?)`,
      [row.accountId, row.userNm, row.email, row.pswd, row.securityLvl, row.createdAt ?? new Date().toISOString()]
    );
  }
  return row.accountId;
}

/** Row shape returned by username/credential auth lookups (no PSWD/PROFILEICON). */
export type UserAuthRow = {
  ACCOUNTID: string;
  USERNM: string;
  EMAIL?: string;
  PSWD?: string;
  SECURITYLVL?: number;
  CREATED_AT?: string;
  /** Present only when the caller's SELECT includes it (getUserByUsername does not). */
  PROFILEICON?: string | null;
};

export async function getUserByUsername(userNm: string): Promise<UserAuthRow | null> {
  return await queryFirst<UserAuthRow>(
    `SELECT ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL, CREATED_AT FROM users WHERE USERNM = ? LIMIT 1`,
    [userNm]
  );
}

export async function setUserSecurityLevel(accountId: string, level: SecurityLevel) {
  await runAsync(
    `UPDATE users SET SECURITYLVL = ? WHERE ACCOUNTID = ?`,
    [level, accountId]
  );
}

export async function verifyUser(userNm: string, pswd: string): Promise<UserAuthRow | null> {
  // EMAIL is included so sign-in screens can establish the matching
  // Supabase Auth session (entitlement/cloud sync are keyed by Supabase id).
  return await queryFirst<UserAuthRow>(
    `SELECT ACCOUNTID, USERNM, EMAIL, SECURITYLVL, CREATED_AT FROM users WHERE USERNM = ? AND PSWD = ? LIMIT 1`,
    [userNm, pswd]
  );
}

export async function updateProfileIcon(accountId: string, iconId: string) {
  await runAsync(
    `UPDATE users SET PROFILEICON = ? WHERE ACCOUNTID = ?`,
    [iconId, accountId]
  );
}