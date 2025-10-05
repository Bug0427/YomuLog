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