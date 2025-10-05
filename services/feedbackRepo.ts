// services/feedbackRepo.ts
import * as SQLite from 'expo-sqlite';

// Use the new typed API (SDK 51+): openDatabaseSync provides runAsync/execAsync helpers
export const db = SQLite.openDatabaseSync('yomulog.db');

// Convenience wrapper – keep signature compatible with previous calls
export const runAsync = (sql: string, params: any[] = []) => db.runAsync(sql, params);

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
    PSWD        TEXT NOT NULL,
    SECURITYLVL INTEGER NOT NULL CHECK (SECURITYLVL IN (1,2,3))
    )`
);

console.log('✅ Database initialized');
}

// --- Insert helpers ---------------------------------------------------------
function genSubmissionId() {
return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function insertReport(row: {
accountId: string;
userNm: string;
mainCat: string; // CategoryId
subCat: string;
comments: string;
}) {
const submissionId = genSubmissionId();
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
const submissionId = genSubmissionId();
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
const submissionId = genSubmissionId();
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
pswd: string; // NOTE: store hashed in production
securityLvl: SecurityLevel; // 1=admin,2=paid,3=regular
};

export async function createUser(row: UserRow) {
await db.runAsync(
    `INSERT INTO users (ACCOUNTID, USERNM, PSWD, SECURITYLVL)
    VALUES (?, ?, ?, ?)`,
    [row.accountId, row.userNm, row.pswd, row.securityLvl]
);
return row.accountId;
}

export async function upsertUser(row: UserRow) {
// Try update first; if no row changed, insert
const res = await db.runAsync(
    `UPDATE users SET USERNM = ?, PSWD = ?, SECURITYLVL = ? WHERE ACCOUNTID = ?`,
    [row.userNm, row.pswd, row.securityLvl, row.accountId]
);
// @ts-ignore rowsAffected exists on result for runAsync
if (!res?.rowsAffected) {
    await db.runAsync(
    `INSERT INTO users (ACCOUNTID, USERNM, PSWD, SECURITYLVL) VALUES (?,?,?,?)`,
    [row.accountId, row.userNm, row.pswd, row.securityLvl]
    );
}
return row.accountId;
}

export async function getUserByUsername(userNm: string) {
const rs = await db.runAsync(
    `SELECT ACCOUNTID, USERNM, PSWD, SECURITYLVL FROM users WHERE USERNM = ? LIMIT 1`,
    [userNm]
);
// @ts-ignore _array present on rows
return rs?.rows?._array?.[0] ?? null;
}

export async function setUserSecurityLevel(accountId: string, level: SecurityLevel) {
await db.runAsync(
    `UPDATE users SET SECURITYLVL = ? WHERE ACCOUNTID = ?`,
    [level, accountId]
);
}

export async function verifyUser(userNm: string, pswd: string) {
const rs = await db.runAsync(
    `SELECT ACCOUNTID, USERNM, SECURITYLVL FROM users WHERE USERNM = ? AND PSWD = ? LIMIT 1`,
    [userNm, pswd]
);
// @ts-ignore _array present on rows
return rs?.rows?._array?.[0] ?? null;
}