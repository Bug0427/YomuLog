// services/nativeDB.ts
// Platform-safe database abstraction.
// On native: uses expo-sqlite (SQLite.openDatabaseSync).
// On web: provides an in-memory mock database that doesn't crash
// but gracefully degrades (no persistence, no-op on destructive ops).

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

class WebMockDB implements IDatabase {
  private _data: Map<string, any[]> = new Map();
  private _tables: Set<string> = new Set();

  private _getTableName(sql: string): string | null {
    // Match CREATE TABLE IF NOT EXISTS <tableName> or INSERT INTO <tableName>
    const createMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
    if (createMatch) return createMatch[1];
    const insertMatch = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
    if (insertMatch) return insertMatch[1];
    const selectMatch = sql.match(/FROM\s+(\w+)/i);
    if (selectMatch) return selectMatch[1];
    const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
    if (updateMatch) return updateMatch[1];
    return null;
  }

  async runAsync(sql: string, params: any[] = []): Promise<{ rowsAffected?: number }> {
    const table = this._getTableName(sql);
    const upperSql = sql.trim().toUpperCase();

    if (upperSql.startsWith('CREATE TABLE')) {
      this._tables.add(table!);
      if (!this._data.has(table!)) this._data.set(table!, []);
      return { rowsAffected: 0 };
    }

    if (upperSql.startsWith('INSERT')) {
      if (!table) return { rowsAffected: 0 };
      const rows = this._data.get(table) ?? [];
      rows.push(params);
      this._data.set(table, rows);
      return { rowsAffected: 1 };
    }

    if (upperSql.startsWith('UPDATE')) {
      return { rowsAffected: 0 };
    }

    if (upperSql.startsWith('DELETE')) {
      if (table) {
        const prev = (this._data.get(table) ?? []).length;
        this._data.set(table, []);
        return { rowsAffected: prev };
      }
      return { rowsAffected: 0 };
    }

    return { rowsAffected: 0 };
  }

  async getAllAsync<T = unknown>(sql: string, _params: any[] = []): Promise<T[]> {
    const table = this._getTableName(sql);
    if (!table) return [];
    const rows = this._data.get(table) ?? [];
    // For PRAGMA table_info, return column-like structure
    if (/pragma\s+table_info/i.test(sql)) {
      return rows.length > 0
        ? Object.keys(rows[0] ?? {}).map((name) => ({ name } as unknown as T))
        : [];
    }
    return rows as unknown as T[];
  }

  async getFirstAsync<T = unknown>(sql: string, params: any[] = []): Promise<T | null> {
    const all = await this.getAllAsync<T>(sql, params);
    return all.length > 0 ? all[0] : null;
  }

  async execAsync(sql: string): Promise<void> {
    // No-op on web
  }
}

// ─── Singleton ────────────────────────────────────────────────────────

let _db: IDatabase | null = null;

/** Open or return the singleton database (platform-aware). */
export async function openDatabase(name: string = 'yomulog.db'): Promise<IDatabase> {
  if (_db) return _db;

  if (isWeb) {
    console.log(`[web] Using in-memory mock DB for: ${name}`);
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
    console.warn('[nativeDB] Failed to open native SQLite, falling back to mock', err);
    _db = new WebMockDB();
    return _db;
  }
}

/** For modules that need the db symbol directly (compat with old API). */
export async function getDB(): Promise<IDatabase> {
  return openDatabase();
}
