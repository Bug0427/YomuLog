// services/nativeDB.ts
// Platform-safe database abstraction.
// On native: uses expo-sqlite (SQLite.openDatabaseSync).
// On web: provides an in-memory SQL emulation with localStorage persistence
// so auth/account flows actually work in the browser sandbox.

import { isWeb } from '../utils/platformUtils';

// ─── Types ────────────────────────────────────────────────────────────

export type QueryResult<T = unknown> = T[];

export interface IDatabase {
  runAsync(sql: string, params?: any[]): Promise<{ rowsAffected?: number }>;
  getAllAsync<T = unknown>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T = unknown>(sql: string, params?: any[]): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
}

// ─── Web mock implementation ──────────────────────────────────────────
//
// A small SQL-subset emulator that keeps the auth/account flows working on
// web. Supports the exact statement shapes used by the app:
//   CREATE TABLE IF NOT EXISTS <t> (col TYPE ..., ...)
//   INSERT [OR IGNORE] INTO <t> (cols) VALUES (?,...)
//   SELECT cols|* [COUNT(*)] FROM <t> [WHERE col = ? [AND ...]] [ORDER BY c [ASC|DESC]] [LIMIT n]
//   UPDATE <t> SET col = ?, ... WHERE col = ?
//   DELETE FROM <t> [WHERE col = ?]
//   PRAGMA table_info(<t>)
//   ALTER TABLE <t> ADD COLUMN <col> <type>
// Column matching is case-insensitive (SQLite semantics); rows are plain
// objects keyed by the CREATE TABLE column names.
// Tables are persisted to localStorage ('yomulog_webdb') so accounts survive
// page refreshes in the sandbox.

type WebRow = Record<string, unknown>;
type WebColumn = { name: string; type: string | null; notnull: boolean; pk: boolean };

type WhereCondition = { col: string; op: '=' | '<>' | '!='; paramIndex: number | null };

const STORAGE_KEY = 'yomulog_webdb';

/** Case-insensitive lookup of a column value in a row object. */
function getCol(row: WebRow, colName: string): unknown {
  const key = Object.keys(row).find((k) => k.toLowerCase() === colName.toLowerCase());
  return key === undefined ? undefined : row[key];
}

/** Build a projected row using the SELECT's column spellings. */
function project(row: WebRow, columns: string[]): WebRow {
  const out: WebRow = {};
  for (const col of columns) {
    if (col === '*') {
      Object.assign(out, row);
    } else {
      const key = Object.keys(row).find((k) => k.toLowerCase() === col.toLowerCase());
      out[col] = key === undefined ? undefined : row[key];
    }
  }
  return out;
}

/** Split a comma-separated list at top level (no nesting here, so plain split). */
function splitList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Evaluate a single WHERE condition against a row. */
function matchesCondition(row: WebRow, cond: WhereCondition, params: any[]): boolean {
  const actual = getCol(row, cond.col);
  const expected = cond.paramIndex === null ? undefined : params[cond.paramIndex];
  if (cond.op === '=') return actual === expected;
  return actual !== expected;
}

/** Exported for unit testing (pure TS — no RN imports in this class). */
export class WebMockDB implements IDatabase {
  private _data: Map<string, WebRow[]> = new Map();
  private _schemas: Map<string, WebColumn[]> = new Map();

  constructor() {
    this._load();
  }

  // ── Persistence ────────────────────────────────────────────────────

  private _load(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { tables?: Record<string, WebRow[]>; schemas?: Record<string, WebColumn[]> };
      if (parsed && typeof parsed === 'object') {
        this._data = new Map(Object.entries(parsed.tables ?? {}));
        this._schemas = new Map(Object.entries(parsed.schemas ?? {}));
      }
    } catch (e) {
      console.warn('[webdb] Failed to load persisted DB, starting fresh', e);
    }
  }

  private _save(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tables: Object.fromEntries(this._data),
          schemas: Object.fromEntries(this._schemas),
        }),
      );
    } catch (e) {
      console.warn('[webdb] Failed to persist DB', e);
    }
  }

  // ── SQL parsing helpers ────────────────────────────────────────────

  private _getTableName(sql: string): string | null {
    const createMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
    if (createMatch) return createMatch[1];
    const insertMatch = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
    if (insertMatch) return insertMatch[1];
    const selectMatch = sql.match(/FROM\s+(\w+)/i);
    if (selectMatch) return selectMatch[1];
    const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
    if (updateMatch) return updateMatch[1];
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
    if (deleteMatch) return deleteMatch[1];
    const pragmaMatch = sql.match(/PRAGMA\s+table_info\((\w+)\)/i);
    if (pragmaMatch) return pragmaMatch[1];
    const alterMatch = sql.match(/ALTER\s+TABLE\s+(\w+)/i);
    if (alterMatch) return alterMatch[1];
    const dropMatch = sql.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)/i);
    if (dropMatch) return dropMatch[1];
    return null;
  }

  /** Parse CREATE TABLE body into a column schema. */
  private _parseCreateTable(sql: string, table: string): WebColumn[] | null {
    const m = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+\s*\(([\s\S]*)\)\s*$/i);
    if (!m) return null;
    const columns: WebColumn[] = [];
    for (const def of splitList(m[1])) {
      const nameMatch = def.match(/^([A-Za-z_][A-Za-z0-9_]*)/i);
      if (!nameMatch) continue;
      columns.push({
        name: nameMatch[1],
        type: def.slice(nameMatch[1].length).match(/^(\w+(?:\s*\(\s*\d+\s*\))?)/i)?.[1] ?? null,
        notnull: /\bNOT\s+NULL\b/i.test(def),
        pk: /\bPRIMARY\s+KEY\b/i.test(def),
      });
    }
    return columns.length > 0 ? columns : null;
  }

  /** Parse INSERT column list + OR IGNORE flag. */
  private _parseInsert(sql: string): { table: string; columns: string[]; orIgnore: boolean } | null {
    const m = sql.match(/INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+(\w+)\s*\(([^)]*)\)/i);
    if (!m) return null;
    return {
      table: m[1],
      columns: splitList(m[2]),
      orIgnore: /\bOR\s+IGNORE\b/i.test(sql),
    };
  }

  /** Parse SELECT: columns, FROM table, WHERE, ORDER BY, LIMIT. */
  private _parseSelect(sql: string): {
    table: string;
    columns: string[];
    where: string | null;
    orderBy: { col: string; dir: 'asc' | 'desc' } | null;
    limit: number | null;
    countAlias: string | null;
  } | null {
    const m = sql.match(/SELECT\s+([\s\S]*?)\s+FROM\s+(\w+)/i);
    if (!m) return null;
    const rest = sql.slice(m[0].length);
    let where: string | null = null;
    let orderBy: { col: string; dir: 'asc' | 'desc' } | null = null;
    let limit: number | null = null;

    const whereMatch = rest.match(/WHERE\s+([\s\S]*?)(?:\s+ORDER\s+BY\s+|\s+LIMIT\s+|\s*;?\s*$)/i);
    if (whereMatch) where = whereMatch[1].trim() || null;
    const orderMatch = rest.match(/ORDER\s+BY\s+([A-Za-z_][A-Za-z0-9_]*)(\s+(ASC|DESC))?/i);
    if (orderMatch) orderBy = { col: orderMatch[1], dir: (orderMatch[3] ?? 'ASC').toLowerCase() as 'asc' | 'desc' };
    const limitMatch = rest.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) limit = Number(limitMatch[1]);

    const colClause = m[1].trim();
    const countMatch = colClause.match(/COUNT\s*\(\s*\*\s*\)(?:\s+AS\s+(\w+))?/i);
    if (countMatch) {
      return { table: m[2], columns: ['*'], where, orderBy, limit, countAlias: countMatch[1] ?? 'COUNT(*)' };
    }
    return { table: m[2], columns: splitList(colClause), where, orderBy, limit, countAlias: null };
  }

  /** Parse UPDATE: SET pairs + WHERE. */
  private _parseUpdate(sql: string): { table: string; sets: string[]; where: string } | null {
    const m = sql.match(/UPDATE\s+(\w+)\s+SET\s+([\s\S]*?)\s+WHERE\s+([\s\S]*)$/i);
    if (!m) return null;
    return { table: m[1], sets: splitList(m[2]), where: m[3].trim() };
  }

  /** Parse DELETE FROM table [WHERE ...]. */
  private _parseDelete(sql: string): { table: string; where: string | null } | null {
    const m = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]*))?$/i);
    if (!m) return null;
    return { table: m[1], where: m[2] ? m[2].trim() : null };
  }

  /** Resolve conditions list from a WHERE string using the bind order. */
  private _conditions(where: string, params: any[]): WhereCondition[] {
    const out: WhereCondition[] = [];
    let i = 0;
    for (const part of where.split(/\s+AND\s+/i)) {
      const m = part.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(=|<>|!=)\s*(\?\d*)$/i);
      if (!m) continue;
      let paramIndex: number | null;
      if (m[3] === '?') {
        paramIndex = i;
        i += 1;
      } else {
        paramIndex = Number(m[3].slice(1)) - 1;
      }
      out.push({ col: m[1], op: m[2].toLowerCase() === '=' ? '=' : '<>', paramIndex });
    }
    void params;
    return out;
  }

  private _rowMatches(row: WebRow, conditions: WhereCondition[], params: any[]): boolean {
    return conditions.every((c) => matchesCondition(row, c, params));
  }

  // ── IDatabase implementation ───────────────────────────────────────

  async runAsync(sql: string, params: any[] = []): Promise<{ rowsAffected?: number }> {
    const trimmed = sql.trim().replace(/;+\s*$/i, '');
    const upperSql = trimmed.toUpperCase();

    // Transactions / pragmas / indexes — no-op on web
    if (/^(BEGIN|COMMIT|ROLLBACK|VACUUM|PRAGMA|CREATE\s+(UNIQUE\s+)?INDEX)/i.test(trimmed)) {
      return { rowsAffected: 0 };
    }

    const table = this._getTableName(trimmed);

    if (upperSql.startsWith('CREATE TABLE')) {
      const schema = this._parseCreateTable(trimmed, table!);
      if (!this._data.has(table!)) this._data.set(table!, []);
      if (schema) this._schemas.set(table!, schema);
      return { rowsAffected: 0 };
    }

    if (upperSql.startsWith('ALTER TABLE')) {
      // ALTER TABLE <t> ADD COLUMN <name> <type>
      const m = trimmed.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+([A-Za-z_][A-Za-z0-9_]*)(\s+.*)?/i);
      if (m) {
        const cols = this._schemas.get(m[1]) ?? [];
        cols.push({ name: m[2], type: m[3]?.trim() ?? null, notnull: false, pk: false });
        this._schemas.set(m[1], cols);
      }
      return { rowsAffected: 0 };
    }

    if (upperSql.startsWith('DROP TABLE')) {
      if (table) {
        const prev = (this._data.get(table) ?? []).length;
        this._data.delete(table);
        this._schemas.delete(table);
        this._save();
        return { rowsAffected: prev };
      }
      return { rowsAffected: 0 };
    }

    if (upperSql.startsWith('INSERT')) {
      const parsed = this._parseInsert(trimmed);
      if (!parsed || !this._data.has(parsed.table)) return { rowsAffected: 0 };
      const rows = this._data.get(parsed.table)!;
      const row: WebRow = {};
      parsed.columns.forEach((col, idx) => {
        row[col] = params[idx];
      });

      if (parsed.orIgnore) {
        const dup = rows.some((r) => parsed.columns.every((col) => getCol(r, col) === row[col]));
        if (dup) return { rowsAffected: 0 };
      }

      rows.push(row);
      this._save();
      return { rowsAffected: 1 };
    }

    if (upperSql.startsWith('UPDATE')) {
      const parsed = this._parseUpdate(trimmed);
      if (!parsed || !this._data.has(parsed.table)) return { rowsAffected: 0 };
      const conditions = this._conditions(parsed.where, params);
      const rows = this._data.get(parsed.table)!;

      // SET params come first, then WHERE params (SQLite positional binding).
      let setCursor = 0;
      const setPairs: Array<{ col: string; value: unknown }> = [];
      for (const pair of parsed.sets) {
        const m = pair.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\?\d*)$/i);
        if (!m) continue;
        const value = m[2] === '?' ? params[setCursor] : params[Number(m[2].slice(1)) - 1];
        if (m[2] === '?') setCursor += 1;
        setPairs.push({ col: m[1], value });
      }
      const whereParams = params.slice(setCursor);

      let affected = 0;
      for (const row of rows) {
        if (!this._rowMatches(row, conditions, whereParams)) continue;
        for (const { col, value } of setPairs) {
          const key = Object.keys(row).find((k) => k.toLowerCase() === col.toLowerCase());
          if (key) row[key] = value;
          else row[col] = value;
        }
        affected += 1;
      }
      if (affected > 0) this._save();
      return { rowsAffected: affected };
    }

    if (upperSql.startsWith('DELETE')) {
      const parsed = this._parseDelete(trimmed);
      if (!parsed || !this._data.has(parsed.table)) return { rowsAffected: 0 };
      const rows = this._data.get(parsed.table)!;
      let affected = 0;
      if (parsed.where) {
        const conditions = this._conditions(parsed.where, params);
        const kept: WebRow[] = [];
        for (const row of rows) {
          if (this._rowMatches(row, conditions, params)) affected += 1;
          else kept.push(row);
        }
        this._data.set(parsed.table, kept);
      } else {
        affected = rows.length;
        this._data.set(parsed.table, []);
      }
      if (affected > 0) this._save();
      return { rowsAffected: affected };
    }

    return { rowsAffected: 0 };
  }

  async getAllAsync<T = unknown>(sql: string, params: any[] = []): Promise<T[]> {
    const trimmed = sql.trim().replace(/;+\s*$/i, '');

    // PRAGMA table_info: return column descriptors (name + metadata)
    const pragmaMatch = trimmed.match(/PRAGMA\s+table_info\((\w+)\)/i);
    if (pragmaMatch) {
      const table = pragmaMatch[1];
      const schema = this._schemas.get(table);
      const rows = this._data.get(table) ?? [];
      let columns: WebColumn[];
      if (schema) {
        columns = schema;
      } else if (rows.length > 0) {
        columns = Object.keys(rows[0]).map((name) => ({ name, type: null, notnull: false, pk: false }));
      } else {
        columns = [];
      }
      return columns.map((c, cid) => ({
        cid,
        name: c.name,
        type: c.type,
        notnull: c.notnull ? 1 : 0,
        dflt_value: null,
        pk: c.pk ? 1 : 0,
      })) as unknown as T[];
    }

    if (!/^SELECT/i.test(trimmed)) return [] as unknown as T[];

    const parsed = this._parseSelect(trimmed);
    if (!parsed || !this._data.has(parsed.table)) return [] as unknown as T[];
    const rows = this._data.get(parsed.table)!;

    // COUNT(*) — single numeric row (alias or literal key)
    if (parsed.countAlias) {
      const n = parsed.where ? rows.filter((r) => this._rowMatches(r, this._conditions(parsed.where!, params), params)).length : rows.length;
      return [{ [parsed.countAlias]: n }] as unknown as T[];
    }

    const conditions = parsed.where ? this._conditions(parsed.where, params) : [];
    let out = rows.filter((r) => this._rowMatches(r, conditions, params));

    if (parsed.orderBy) {
      const col = parsed.orderBy.col;
      out = [...out].sort((a, b) => {
        const av = getCol(a, col);
        const bv = getCol(b, col);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return av - bv;
        return String(av).localeCompare(String(bv));
      });
      if (parsed.orderBy.dir === 'desc') out.reverse();
    }

    if (parsed.limit != null && parsed.limit >= 0) out = out.slice(0, parsed.limit);

    return out.map((r) => project(r, parsed.columns)) as unknown as T[];
  }

  async getFirstAsync<T = unknown>(sql: string, params: any[] = []): Promise<T | null> {
    const all = await this.getAllAsync<T>(sql, params);
    return all.length > 0 ? all[0] : null;
  }

  async execAsync(sql: string): Promise<void> {
    // Support multi-statement strings (split on ';' outside of parens is
    // sufficient for the statements this app uses).
    for (const stmt of sql.split(';')) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      await this.runAsync(trimmed);
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────

let _db: IDatabase | null = null;

/** Open or return the singleton database (platform-aware). */
export async function openDatabase(name: string = 'yomulog.db'): Promise<IDatabase> {
  if (_db) return _db;

  if (isWeb) {
    console.log(`[web] Using web SQL-emulation DB for: ${name}`);
    _db = new WebMockDB();
    return _db;
  }

  // Native: lazy-load expo-sqlite
  try {
    const SQLite = await import('expo-sqlite');
    const nativeDb = SQLite.openDatabaseSync(name);

    // Adapt the native API to our IDatabase interface
    const db: IDatabase = {
      runAsync: (sql: string, params: any[] = []) =>
        nativeDb.runAsync(sql, params) as Promise<{ rowsAffected?: number }>,
      getAllAsync: <T = unknown>(sql: string, params: any[] = []) =>
        nativeDb.getAllAsync<T>(sql, params),
      getFirstAsync: <T = unknown>(sql: string, params: any[] = []) =>
        nativeDb.getFirstAsync<T>(sql, params),
      execAsync: (sql: string) => nativeDb.execAsync(sql),
    };

    _db = db;
    return db;
  } catch (err) {
    console.warn('[nativeDB] Failed to open native SQLite, falling back to web DB', err);
    _db = new WebMockDB();
    return _db;
  }
}

/** For modules that need the db symbol directly (compat with old API). */
export async function getDB(): Promise<IDatabase> {
  return openDatabase();
}
