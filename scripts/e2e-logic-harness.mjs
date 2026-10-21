#!/usr/bin/env node
// e2e-logic-harness.mjs — logic-level regression harness (E2E STEP 1).
//
// Runs the REAL service code (services/sync/syncCore.ts, services/downloadManager.ts,
// services/funnelService.ts, services/retentionService.ts, services/readingStatsService.ts)
// in plain Node — no browser, no real network, no Supabase — so the deterministic
// logic paths get PASS/FAIL evidence on this box:
//
//   1. Sync merge/conflict resolution across ALL scopes:
//      - fallback path: syncFavoritesFallback / syncProgressFallback / syncDownloadsFallback
//        + the shared mergeLWW primitive
//      - real-Supabase path: syncFavoritesReal / syncProgressReal / syncDownloadsReal
//        against an in-memory fake Supabase client (so the L291 downloads guard and
//        the per-scope timestamp winners are exercised against REAL code, not copies)
//   2. Download queue state machine: pending -> completed, failure -> retry ->
//      permanent failure -> re-enqueue recovery, interrupted-download recovery,
//      free-tier 5-chapter cap, and the KPI-3 reliability counters (web vs native).
//   3. KPI instrumentation: funnel events (KPI 4, incl. E5 dedupe), retention
//      heartbeat (KPI 1), reading stats (KPI 2), download reliability (KPI 3).
//
// How it works: copies services/ + utils/ verbatim into a scratch dir, appends the
// missing `.ts` to relative import specifiers (Node ESM needs explicit extensions;
// Metro doesn't), and installs tiny ESM stubs for the only bare packages the
// services import (react-native Platform, async-storage, supabase-js fake, and the
// three expo-* modules that are never exercised here). The suite then imports the
// COPIED modules — the same source files that ship in the app.
//
// Run (from the repo root):
//   node scripts/e2e-logic-harness.mjs [--out /tmp/e2e-logic-results.txt]
//
// It runs two platform passes automatically:
//   E2E_PLATFORM=web  (downloads simulated — webSimulated counters, rate invalid)
//   E2E_PLATFORM=ios  (native path — real counters, completed/(completed+failed))
//
// Compilation: the copied sources are compiled with the repo's real `tsc`
// (rewriteRelativeImportExtensions emits extensionless imports as .js), because
// Node's own TS transform cannot do semantic type elision — downloadManager's
// DownloadLimitError uses a parameter-property constructor, and several
// services import types as plain named imports (e.g. readingStatsService
// imports BookmarkedManga from favoritesService). Real tsc handles both.
//
// Exit code = number of failed assertions (0 = all green).

import { execFileSync } from 'node:child_process';
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = '/tmp/e2e-logic-harness';
const OUT_ARG = process.argv.indexOf('--out');
const OUT_PATH = OUT_ARG >= 0 ? process.argv[OUT_ARG + 1] : null;

function log(...a) { console.log('[logic-harness]', ...a); }

// ─── 1. Copy real sources ─────────────────────────────────────────────
rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(join(SCRATCH, 'node_modules'), { recursive: true });
for (const dir of ['services', 'utils']) {
  cpSync(join(REPO_ROOT, dir), join(SCRATCH, dir), { recursive: true });
}

// ─── 2. Append .ts to relative import/export specifiers (Node ESM) ────
const EXT_RE = /\.(ts|js|mjs|cjs|json|png|jpe?g|gif|svg|webp|ttf|otf)$/;
function fixImports(code) {
  return code.replace(
    /((?:from|import)\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
    (m, pre, spec, post) => (EXT_RE.test(spec) ? m : pre + spec + '.ts' + post),
  );
}
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.ts')) out.push(p);
  }
  return out;
}
for (const f of walk(SCRATCH)) {
  writeFileSync(f, fixImports(readFileSync(f, 'utf8')));
}

// ─── 3. ESM stubs for the bare packages the services import ───────────
function writeStub(pkg, files) {
  const dir = join(SCRATCH, 'node_modules', pkg);
  mkdirSync(dir, { recursive: true });
  for (const [rel, body] of Object.entries(files)) writeFileSync(join(dir, rel), body);
}

writeStub('react-native', {
  'package.json': '{"name":"react-native","version":"0.0.0","type":"module","main":"index.js"}\n',
  'index.js': `export const Platform = { OS: process.env.E2E_PLATFORM === 'ios' ? 'ios' : 'web' };
export const NativeModules = {};
export const TurboModuleRegistry = { get: () => null };
export const Linking = {
  openURL: async () => {},
  canOpenURL: async () => true,
  addEventListener: () => ({ remove: () => {} }),
};
export const DeviceEventEmitter = { addListener: () => ({ remove: () => {} }), emit: () => {} };
export const useWindowDimensions = () => ({ width: 390, height: 844, scale: 1, fontScale: 1 });
`,
});

writeStub('@react-native-async-storage/async-storage', {
  'package.json': '{"name":"@react-native-async-storage/async-storage","version":"2.2.0","type":"module","main":"index.js"}\n',
  'index.js': `const s = new Map();
export default {
  getItem: async (k) => (s.has(k) ? s.get(k) : null),
  setItem: async (k, v) => { s.set(k, String(v)); },
  removeItem: async (k) => { s.delete(k); },
  multiGet: async (ks) => ks.map((k) => [k, s.has(k) ? s.get(k) : null]),
  multiSet: async (pairs) => { for (const [k, v] of pairs) s.set(k, String(v)); },
  multiRemove: async (ks) => { for (const k of ks) s.delete(k); },
  getAllKeys: async () => Array.from(s.keys()),
  clear: async () => { s.clear(); },
};
export { s as __store };
`,
});

// Fake Supabase: an in-memory query client so the REAL sync*Real functions
// (which push/pull through supabase.from(...)) run end-to-end locally.
writeStub('@supabase/supabase-js', {
  'package.json': '{"name":"@supabase/supabase-js","version":"2.0.0","type":"module","main":"index.js"}\n',
  'index.js': `const tables = { user_library: [], reading_progress: [], download_queue: [], sync_state: [] };
const db = {
  session: null,
  tables,
  seed(table, rows) { tables[table] = tables[table].concat(rows); },
  clear() { for (const t of Object.keys(tables)) tables[t] = []; },
  dump(table) { return JSON.parse(JSON.stringify(tables[table] || [])); },
};
function applyFilters(table, filters) {
  let rows = db.tables[table] || [];
  for (const [op, a, b] of filters) {
    if (op === 'eq') rows = rows.filter((r) => r[a] === b);
    else if (op === 'order') {
      const dir = (b && b.ascending) ? 1 : -1;
      rows = [...rows].sort((x, y) => {
        const xv = x[a], yv = y[a];
        if (xv == null && yv == null) return 0;
        if (xv == null) return 1 * dir;
        if (yv == null) return -1 * dir;
        return (String(xv) < String(yv) ? -1 : String(xv) > String(yv) ? 1 : 0) * dir;
      });
    }
    else if (op === 'limit') rows = rows.slice(0, a);
  }
  return rows;
}
export function createClient() {
  const client = {
    auth: { getSession: async () => ({ data: { session: db.session } }) },
    from(table) {
      const filters = [];
      const run = () => applyFilters(table, filters);
      const q = {
        eq(col, val) { filters.push(['eq', col, val]); return q; },
        order(col, opts) { filters.push(['order', col, opts]); return q; },
        limit(n) { filters.push(['limit', n]); return q; },
        select() { return q; },
        maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
        // select() is terminal in supabase-js: awaiting the chain yields {data,error}.
        then(resolve, reject) { resolve({ data: run(), error: null }); },
        async upsert(rows, opts) {
          const conflictKeys = (opts && opts.onConflict ? opts.onConflict.split(',') : ['id']).map((k) => k.trim());
          for (const row of rows) {
            const idx = db.tables[table].findIndex((r) => conflictKeys.every((k) => r[k] === row[k]));
            if (idx >= 0) db.tables[table][idx] = JSON.parse(JSON.stringify(row));
            else db.tables[table].push(JSON.parse(JSON.stringify(row)));
          }
          return { error: null };
        },
        async delete() {
          db.tables[table] = run();
          return { error: null };
        },
      };
      return q;
    },
  };
  return client;
}
export const __db = db;
`,
});

// expo-* modules never exercised by this suite — inert stubs so a stray
// dynamic import inside nativeFS/other services can't crash module loading.
writeStub('expo-file-system', {
  'package.json': '{"name":"expo-file-system","version":"1.0.0","type":"module","main":"index.js","exports":{".":"./index.js","./legacy":"./legacy.js"}}\n',
  'index.js': `const ok = { status: 200, uri: '/tmp/e2e-fs/file' };
const documentDirectory = '/tmp/e2e-fs/';
const downloadAsync = async () => ok;
const makeDirectoryAsync = async () => {};
const getInfoAsync = async () => ({ exists: true, size: 1 });
const readDirectoryAsync = async () => [];
const deleteAsync = async () => {};
export { documentDirectory, downloadAsync, makeDirectoryAsync, getInfoAsync, readDirectoryAsync, deleteAsync };
export default { documentDirectory, downloadAsync, makeDirectoryAsync, getInfoAsync, readDirectoryAsync, deleteAsync };
`,
  'legacy.js': `const ok = { status: 200, uri: '/tmp/e2e-fs/file' };
const documentDirectory = '/tmp/e2e-fs/';
const downloadAsync = async () => ok;
const makeDirectoryAsync = async () => {};
const getInfoAsync = async () => ({ exists: true, size: 1 });
const readDirectoryAsync = async () => [];
const deleteAsync = async () => {};
export { documentDirectory, downloadAsync, makeDirectoryAsync, getInfoAsync, readDirectoryAsync, deleteAsync };
export default { documentDirectory, downloadAsync, makeDirectoryAsync, getInfoAsync, readDirectoryAsync, deleteAsync };
`,
});
for (const pkg of ['expo-image-manipulator', 'expo-image-picker', 'expo-sqlite', 'expo-secure-store']) {
  writeStub(pkg, {
    'package.json': `{"name":"${pkg}","version":"0.0.0","type":"module","main":"index.js"}\n`,
    'index.js': `export default {};
export const manipulateAsync = undefined;
export const launchImageLibraryAsync = undefined;
export const requestMediaLibraryPermissionsAsync = async () => ({ status: 'granted' });
export const getItemAsync = undefined;
export const setItemAsync = undefined;
export const deleteItemAsync = undefined;
export const openDatabaseSync = undefined;
export const SQLiteProvider = undefined;
export const useSQLiteContext = undefined;
`,
  });
}

// ─── 4. The suite (test.ts) ───────────────────────────────────────────
// IMPORTANT: this embedded file must not use backticks or ${} — it is written
// into the scratch dir, compiled by tsc, and executed as plain ESM JS.
const TEST_SOURCE = `// E2E logic-level regression suite — runs against COPIED repo sources.
// Set env BEFORE importing modules so module-scope env reads see it.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://fake.supabase.local';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon';
process.env.EXPO_PUBLIC_MANGADEX_PROXY_URL = '';

const PLATFORM = process.env.E2E_PLATFORM || 'web';

// ─── tiny assert harness ──────────────────────────────────────────────
const results = [];
let suite = 'setup';
function setSuite(name) { suite = name; }
function assert(cond, name, detail = '') {
  results.push({ suite, name, ok: !!cond, detail: detail ?? '' });
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function assertEq(name, actual, expected) {
  assert(eq(actual, expected), name, 'actual=' + JSON.stringify(actual) + ' expected=' + JSON.stringify(expected));
}
// Documented-gap marker: the lead asked for EVIDENCE for the sync-scopes gap.
// gapExists=true means the documented LWW intent is violated on the real
// Supabase path (push-first clobbers newer cloud rows). These lines FAIL the
// suite on purpose and are tallied separately from real assertions.
let evidenceCount = 0;
function evidence(name, gapExists, detail) {
  results.push({ suite, name: 'EVIDENCE-FAIL ' + name, ok: !gapExists, detail: detail ?? '' });
  if (gapExists) evidenceCount++;
}

// ─── module imports (real repo code, copied) ─────────────────────────
const ASMod = await import('@react-native-async-storage/async-storage');
const AS = ASMod.default;
const sbMod = await import('@supabase/supabase-js');
const __db = sbMod.__db;
const sync = await import('./services/sync/syncCore.ts');
const funnel = await import('./services/funnelService.ts');
const retention = await import('./services/retentionService.ts');
const dm = await import('./services/downloadManager.ts');
const statsSvc = await import('./services/readingStatsService.ts');

// ─── fetch stub — MangaDex at-home + uploads, or a forced network failure
const AT_HOME = JSON.stringify({
  result: 'ok', baseUrl: 'https://uploads.mangadex.org',
  chapter: { hash: 'abc', data: ['p1.jpg', 'p2.jpg', 'p3.jpg'], dataSaver: ['s1.jpg', 's2.jpg', 's3.jpg'] },
});
let failDownloads = false;
globalThis.__setFailDownloads = (v) => { failDownloads = v; };
globalThis.fetch = async (input) => {
  const anyInput: any = input;
  const url = typeof anyInput === 'string' ? anyInput : String(anyInput && anyInput.url ? anyInput.url : anyInput);
  if (failDownloads && url.includes('/at-home/server/')) throw new Error('simulated network failure');
  if (url.includes('/at-home/server/')) return new Response(AT_HOME, { status: 200, headers: { 'content-type': 'application/json' } });
  if (url.includes('uploads.mangadex.org')) return new Response(new Uint8Array([137, 80, 78, 71]), { status: 200 });
  throw new Error('unexpected fetch in harness: ' + url);
};

const K = (await import('./services/sync/types.ts')).KEYS;

// Mirrors the MAX_RETRIES = 3 constant in services/downloadManager.ts
// (not exported from that module) — keep in sync if it ever changes.
const MAX_RETRIES = 3;

// ══════════════════════════════════════════════════════════════════════
// SUITE A — mergeLWW primitive
// ══════════════════════════════════════════════════════════════════════
setSuite('A.mergeLWW');
{
  const items = (id, ts, v) => [{ id, ts, v }];
  // union of disjoint ids
  let m = sync.mergeLWW(items('a', '1', 'local'), items('b', '1', 'cloud'), 'id', 'ts');
  assertEq('disjoint ids union', m.map((x) => x.id).sort(), ['a', 'b']);
  // newer cloud ts wins
  m = sync.mergeLWW(items('a', '1', 'local'), items('a', '2', 'cloud'), 'id', 'ts');
  assertEq('newer cloud ts wins', m[0].v, 'cloud');
  // older cloud ts loses (local kept)
  m = sync.mergeLWW(items('a', '3', 'local'), items('a', '2', 'cloud'), 'id', 'ts');
  assertEq('older cloud ts loses', m[0].v, 'local');
  // equal ts -> local kept (strict >, never clobber on tie)
  m = sync.mergeLWW(items('a', '5', 'local'), items('a', '5', 'cloud'), 'id', 'ts');
  assertEq('equal ts keeps local', m[0].v, 'local');
  // empty sides
  m = sync.mergeLWW([], items('a', '1', 'cloud'), 'id', 'ts');
  assertEq('empty local merges cloud', m.length, 1);
}

// ══════════════════════════════════════════════════════════════════════
// SUITE B — fallback scope merges (AsyncStorage mirrors)
// ══════════════════════════════════════════════════════════════════════
setSuite('B.sync-fallback-scopes');
{
  await AS.clear();
  // favorites: local older, cloud newer -> cloud wins everywhere
  await AS.setItem(K.LOCAL_FAVORITES, JSON.stringify([{ mangaId: 'm1', mangaTitle: 'L', bookmarkedAt: '2026-01-01T00:00:00Z', readingStatus: 'reading' }]));
  await AS.setItem(K.CLOUD_FAVORITES, JSON.stringify([{ mangaId: 'm1', mangaTitle: 'C', bookmarkedAt: '2026-01-02T00:00:00Z', readingStatus: 'completed' }]));
  await sync.syncFavoritesFallback();
  let local = JSON.parse((await AS.getItem(K.LOCAL_FAVORITES)) || '[]');
  assertEq('favorites: newer cloud bookmarkedAt wins', local[0].bookmarkedAt, '2026-01-02T00:00:00Z');
  assertEq('favorites: winner carries cloud fields', local[0].mangaTitle, 'C');

  await AS.clear();
  // favorites: local newer -> local kept
  await AS.setItem(K.LOCAL_FAVORITES, JSON.stringify([{ mangaId: 'm1', mangaTitle: 'L', bookmarkedAt: '2026-01-03T00:00:00Z' }]));
  await AS.setItem(K.CLOUD_FAVORITES, JSON.stringify([{ mangaId: 'm1', mangaTitle: 'C', bookmarkedAt: '2026-01-01T00:00:00Z' }]));
  await sync.syncFavoritesFallback();
  local = JSON.parse((await AS.getItem(K.LOCAL_FAVORITES)) || '[]');
  assertEq('favorites: newer local bookmarkedAt kept', local[0].bookmarkedAt, '2026-01-03T00:00:00Z');

  await AS.clear();
  // favorites: disjoint -> union both directions
  await AS.setItem(K.LOCAL_FAVORITES, JSON.stringify([{ mangaId: 'm1', bookmarkedAt: '2026-01-01T00:00:00Z' }]));
  await AS.setItem(K.CLOUD_FAVORITES, JSON.stringify([{ mangaId: 'm2', bookmarkedAt: '2026-01-02T00:00:00Z' }]));
  await sync.syncFavoritesFallback();
  local = JSON.parse((await AS.getItem(K.LOCAL_FAVORITES)) || '[]');
  assertEq('favorites: disjoint union', local.map((x) => x.mangaId).sort(), ['m1', 'm2']);

  await AS.clear();
  // progress: composite key mangaId::chapterId — same chapterId in DIFFERENT
  // mangas must not collide
  await AS.setItem(K.LOCAL_PROGRESS, JSON.stringify([
    { mangaId: 'A', chapterId: 'ch1', chapterNumber: '1', lastReadAt: '2026-01-01T00:00:00Z', scrollPercentage: 10, isRead: false },
  ]));
  await AS.setItem(K.CLOUD_PROGRESS, JSON.stringify([
    { mangaId: 'B', chapterId: 'ch1', chapterNumber: '1', lastReadAt: '2026-01-02T00:00:00Z', scrollPercentage: 90, isRead: true },
  ]));
  await sync.syncProgressFallback();
  local = JSON.parse((await AS.getItem(K.LOCAL_PROGRESS)) || '[]');
  assertEq('progress: same chapterId in different manga kept apart', local.length, 2);

  await AS.clear();
  // progress: same key, cloud newer -> cloud wins; local newer -> local kept
  await AS.setItem(K.LOCAL_PROGRESS, JSON.stringify([
    { mangaId: 'A', chapterId: 'ch1', lastReadAt: '2026-01-01T00:00:00Z', scrollPercentage: 10, isRead: false },
  ]));
  await AS.setItem(K.CLOUD_PROGRESS, JSON.stringify([
    { mangaId: 'A', chapterId: 'ch1', lastReadAt: '2026-01-02T00:00:00Z', scrollPercentage: 95, isRead: true },
  ]));
  await sync.syncProgressFallback();
  local = JSON.parse((await AS.getItem(K.LOCAL_PROGRESS)) || '[]');
  assertEq('progress: newer lastReadAt wins', local[0].lastReadAt, '2026-01-02T00:00:00Z');
  assertEq('progress: winner carries isRead', local[0].isRead, true);

  await AS.clear();
  await AS.setItem(K.LOCAL_PROGRESS, JSON.stringify([
    { mangaId: 'A', chapterId: 'ch1', lastReadAt: '2026-01-03T00:00:00Z' },
  ]));
  await AS.setItem(K.CLOUD_PROGRESS, JSON.stringify([
    { mangaId: 'A', chapterId: 'ch1', lastReadAt: '2026-01-01T00:00:00Z' },
  ]));
  await sync.syncProgressFallback();
  local = JSON.parse((await AS.getItem(K.LOCAL_PROGRESS)) || '[]');
  assertEq('progress: newer local lastReadAt kept', local[0].lastReadAt, '2026-01-03T00:00:00Z');

  await AS.clear();
  // downloads: mergeLWW on jobId/createdAt
  await AS.setItem(K.LOCAL_DOWNLOAD_QUEUE, JSON.stringify([{ jobId: 'j1', chapterId: 'c1', status: 'failed', createdAt: '2026-01-01T00:00:00Z', retryCount: 2 }]));
  await AS.setItem(K.CLOUD_DOWNLOAD_QUEUE, JSON.stringify([{ jobId: 'j1', chapterId: 'c1', status: 'completed', createdAt: '2026-01-02T00:00:00Z', retryCount: 0 }]));
  await sync.syncDownloadsFallback();
  local = JSON.parse((await AS.getItem(K.LOCAL_DOWNLOAD_QUEUE)) || '[]');
  assertEq('downloads: newer createdAt wins', local[0].status, 'completed');
}

// ══════════════════════════════════════════════════════════════════════
// SUITE C — REAL Supabase scope syncs (in-memory fake client)
// ══════════════════════════════════════════════════════════════════════
setSuite('C.sync-real-scopes');
{
  await AS.clear();
  __db.clear();
  __db.session = { user: { id: 'user-1' } };

  // favorites (library scope): local A older than cloud A -> cloud wins and is
  // reflected locally; local B newer than cloud B -> local kept; local C pushed
  // (upsert) into the cloud; cloud D pulled into local (union).
  await AS.setItem(K.LOCAL_FAVORITES, JSON.stringify([
    { mangaId: 'A', mangaTitle: 'local-A-old', bookmarkedAt: '2026-01-01T00:00:00Z', readingStatus: 'reading' },
    { mangaId: 'B', mangaTitle: 'local-B-new', bookmarkedAt: '2026-01-03T00:00:00Z', readingStatus: 'plan_to_read' },
    { mangaId: 'C', mangaTitle: 'local-C-only', bookmarkedAt: '2026-01-05T00:00:00Z', readingStatus: 'reading' },
  ]));
  __db.seed('user_library', [
    { user_id: 'user-1', manga_id: 'A', manga_title: 'cloud-A-new', bookmarked_at: '2026-01-02T00:00:00Z', reading_status: 'completed', updated_at: '2026-01-02T00:00:00Z' },
    { user_id: 'user-1', manga_id: 'B', manga_title: 'cloud-B-old', bookmarked_at: '2026-01-01T00:00:00Z', reading_status: 'reading', updated_at: '2026-01-01T00:00:00Z' },
    { user_id: 'user-1', manga_id: 'D', manga_title: 'cloud-D-only', bookmarked_at: '2026-01-04T00:00:00Z', reading_status: 'dropped', updated_at: '2026-01-04T00:00:00Z' },
  ]);
  await sync.syncFavoritesReal('user-1');
  let local = JSON.parse((await AS.getItem(K.LOCAL_FAVORITES)) || '[]');
  const byId = Object.fromEntries(local.map((x) => [x.mangaId, x]));
  assertEq('real favorites: newer cloud bookmarked_at wins (true LWW)', byId['A'].mangaTitle, 'cloud-A-new');
  assertEq('real favorites: lost local A not re-pushed (no clobber)', __db.dump('user_library').find((r) => r.manga_id === 'A').manga_title, 'cloud-A-new');
  assertEq('real favorites: newer local kept', byId['B'].mangaTitle, 'local-B-new');
  assertEq('real favorites: local C pushed to cloud', __db.dump('user_library').some((r) => r.manga_id === 'C'), true);
  assertEq('real favorites: cloud D pulled to local', !!byId['D'], true);

  // progress scope: cloud row with newer last_read_at wins; newer local kept.
  await AS.setItem(K.LOCAL_PROGRESS, JSON.stringify([
    { chapterId: 'p1', mangaId: 'M', mangaTitle: 'M', chapterNumber: '1', lastReadAt: '2026-01-01T00:00:00Z', scrollPercentage: 20, isRead: false },
    { chapterId: 'p2', mangaId: 'M', mangaTitle: 'M', chapterNumber: '2', lastReadAt: '2026-01-03T00:00:00Z', scrollPercentage: 100, isRead: true },
  ]));
  __db.clear();
  __db.seed('reading_progress', [
    { user_id: 'user-1', chapter_id: 'p1', manga_id: 'M', last_read_at: '2026-01-02T00:00:00Z', scroll_percentage: 88, is_read: true },
    { user_id: 'user-1', chapter_id: 'p2', manga_id: 'M', last_read_at: '2026-01-01T00:00:00Z', scroll_percentage: 10, is_read: false },
  ]);
  await sync.syncProgressReal('user-1');
  local = JSON.parse((await AS.getItem(K.LOCAL_PROGRESS)) || '[]');
  const byCh = Object.fromEntries(local.map((x) => [x.chapterId, x]));
  assertEq('real progress: newer cloud last_read_at wins (true LWW)', byCh['p1'].scrollPercentage, 88);
  assertEq('real progress: lost local p1 not re-pushed (no clobber)', __db.dump('reading_progress').find((r) => r.chapter_id === 'p1').scroll_percentage, 88);
  assertEq('real progress: newer local last_read_at kept', byCh['p2'].scrollPercentage, 100);

  // downloads scope — the L291 guard (updated_at > local updatedAt || createdAt):
  //   q1: cloud updated_at newer  -> cloud wins
  //   q2: local updatedAt newer   -> local kept
  //   q3: local has NO updatedAt but a newer createdAt -> local kept (fallback)
  //   q4: cloud only              -> pulled (union)
  await AS.setItem(K.LOCAL_DOWNLOAD_QUEUE, JSON.stringify([
    { jobId: 'q1', chapterId: 'c1', status: 'failed', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', retryCount: 3 },
    { jobId: 'q2', chapterId: 'c2', status: 'failed', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z', retryCount: 1 },
    { jobId: 'q3', chapterId: 'c3', status: 'completed', createdAt: '2026-01-05T00:00:00Z', retryCount: 0 },
  ]));
  __db.clear();
  __db.seed('download_queue', [
    { user_id: 'user-1', job_id: 'q1', chapter_id: 'c1', status: 'completed', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', retry_count: 0 },
    { user_id: 'user-1', job_id: 'q2', chapter_id: 'c2', status: 'failed', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', retry_count: 2 },
    { user_id: 'user-1', job_id: 'q3', chapter_id: 'c3', status: 'failed', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-04T00:00:00Z', retry_count: 1 },
    { user_id: 'user-1', job_id: 'q4', chapter_id: 'c4', status: 'completed', created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', retry_count: 0 },
  ]);
  await sync.syncDownloadsReal('user-1');
  local = JSON.parse((await AS.getItem(K.LOCAL_DOWNLOAD_QUEUE)) || '[]');
  const byJob = Object.fromEntries(local.map((x) => [x.jobId, x]));
  assertEq('real downloads L291: newer cloud updated_at wins (true LWW)', byJob['q1'].status, 'completed');
  assertEq('real downloads L291: lost local q1 not re-pushed (no clobber)', __db.dump('download_queue').find((r) => r.job_id === 'q1').status, 'completed');
  assertEq('real downloads L291: newer local updatedAt kept', byJob['q2'].status, 'failed');
  assertEq('real downloads L291: local createdAt fallback beats older cloud', byJob['q3'].status, 'completed');
  assertEq('real downloads L291: cloud-only row pulled', byJob['q4'] && byJob['q4'].status, 'completed');
  assertEq('real downloads: local rows pushed to cloud', __db.dump('download_queue').length, 4);

  // Full fallback orchestration (no real Supabase): setSyncEnabled(true) runs
  // performFullSync over all four local scopes and lands in 'synced'.
  __db.session = null; // force the fallback path even though env is configured
  await AS.clear();
  await AS.setItem(K.LOCAL_FAVORITES, JSON.stringify([{ mangaId: 'm1', bookmarkedAt: '2026-01-01T00:00:00Z' }]));
  await AS.setItem(K.CLOUD_FAVORITES, JSON.stringify([{ mangaId: 'm2', bookmarkedAt: '2026-01-02T00:00:00Z' }]));
  await AS.setItem(K.LOCAL_PROGRESS, JSON.stringify([{ mangaId: 'A', chapterId: 'ch1', lastReadAt: '2026-01-01T00:00:00Z' }]));
  const state = await sync.setSyncEnabled(true);
  assertEq('orchestration: status synced', state.status, 'synced');
  assert(state.lastSyncedAt !== null, 'orchestration: lastSyncedAt stamped');
  for (const scope of ['favorites', 'progress', 'downloads', 'preferences']) {
    assert(!!state.scopeTimestamps[scope], 'orchestration: scope timestamp for ' + scope);
  }
}

// ══════════════════════════════════════════════════════════════════════
// SUITE D — download queue state machine + KPI-3 counters
// ══════════════════════════════════════════════════════════════════════
setSuite('D.download-state-machine-' + PLATFORM);
{
  await AS.clear();
  const PREMIUM_KEY = '@YomuLog:premium';

  // free-tier cap: 5 non-failed queue entries -> 6th enqueue throws
  await AS.setItem(PREMIUM_KEY, 'false');
  for (let i = 1; i <= 5; i++) {
    await dm.enqueueDownload('cap-' + i, 'capm', 'Cap Manga', String(i));
  }
  let capThrew = false;
  try { await dm.enqueueDownload('cap-6', 'capm', 'Cap Manga', '6'); } catch (e) { capThrew = e instanceof dm.DownloadLimitError; }
  assertEq('free tier: 6th download throws DownloadLimitError', capThrew, true);
  await AS.clear(); // drop the cap-test jobs so the queue is clean for the next scenario

  // premium flow: success cycle
  await AS.setItem(PREMIUM_KEY, 'true');
  const job = await dm.enqueueDownload('ch-ok', 'm1', 'Manga One', '1', 'First chapter');
  let processed = await dm.processNextDownload();
  assertEq('success: processNextDownload true', processed, true);
  let q = await dm.getDownloadQueue();
  let j = q.find((x) => x.chapterId === 'ch-ok');
  assertEq('success: status completed', j.status, 'completed');
  assertEq('success: progress 100', j.progress, 100);
  assertEq('success: totalPages from at-home data', j.totalPages, 3);
  assertEq('success: chapter title preserved', j.chapterTitle, 'First chapter');
  const rel1 = await dm.getDownloadReliabilityStats();
  if (PLATFORM === 'web') {
    assertEq('web: webSimulatedCompleted +1', rel1.webSimulatedCompleted, 1);
    const rate = await dm.getDownloadReliabilityRate();
    assertEq('web: reliability rate invalid (simulated)', rate.valid, false);
  } else {
    assertEq('ios: totalCompleted +1', rel1.totalCompleted, 1);
    const rate = await dm.getDownloadReliabilityRate();
    assertEq('ios: reliability rate computed', rate.rate, 1);
  }

  // failure -> retry -> exhaustion -> re-enqueue recovery
  await AS.clear();
  await AS.setItem(PREMIUM_KEY, 'true');
  await dm.enqueueDownload('ch-fail', 'm2', 'Manga Two', '2');
  globalThis.__setFailDownloads(true);
  for (let i = 0; i < 4; i++) { await dm.processNextDownload(); } // one attempt per call
  q = await dm.getDownloadQueue();
  j = q.find((x) => x.chapterId === 'ch-fail');
  assertEq('failure: status failed after exhaustion', j.status, 'failed');
  assertEq('failure: retryCount == MAX_RETRIES', j.retryCount, MAX_RETRIES);
  assert(j.errorMessage && j.errorMessage.length > 0, 'failure: errorMessage recorded');
  const exhaustedCall = await dm.processNextDownload();
  assertEq('failure: no retryable picks after exhaustion', exhaustedCall, false);
  const rel2 = await dm.getDownloadReliabilityStats();
  if (PLATFORM === 'web') {
    assertEq('web: failed counter NOT incremented (simulated)', rel2.totalFailed, 0);
  } else {
    assertEq('ios: failed counter +1 only at exhaustion', rel2.totalFailed, 1);
  }
  // recovery: re-enqueueing a failed job resets it and succeeds on retry
  globalThis.__setFailDownloads(false);
  const re = await dm.enqueueDownload('ch-fail', 'm2', 'Manga Two', '2');
  assertEq('recovery: failed job reset to pending', re.status, 'pending');
  assertEq('recovery: retryCount reset', re.retryCount, 0);
  const reprocessed = await dm.processNextDownload();
  q = await dm.getDownloadQueue();
  j = q.find((x) => x.chapterId === 'ch-fail');
  assertEq('recovery: reprocessed to completed', j.status, 'completed');
  const rel3 = await dm.getDownloadReliabilityStats();
  if (PLATFORM === 'web') {
    assertEq('web: recovery counted as simulated', rel3.webSimulatedCompleted, 2);
  } else {
    assertEq('ios: recovery counted as completed', rel3.totalCompleted, 2);
  }

  // interrupted-download recovery: a job stuck in 'downloading' is reconciled.
  // resumeInterruptedDownloads() re-queues it AND drains the queue — so the
  // job ends COMPLETED (retry count 1 = one pick after reconciliation).
  await AS.clear();
  await AS.setItem(PREMIUM_KEY, 'true');
  const stuck = await dm.enqueueDownload('ch-stuck', 'm3', 'Manga Three', '3');
  q = await dm.getDownloadQueue();
  q.find((x) => x.jobId === stuck.jobId).status = 'downloading';
  await AS.setItem(K.LOCAL_DOWNLOAD_QUEUE, JSON.stringify(q));
  const reconciled = await dm.resumeInterruptedDownloads();
  assertEq('recovery: stuck downloading job reconciled', reconciled, 1);
  q = await dm.getDownloadQueue();
  const sj = q.find((x) => x.jobId === stuck.jobId);
  assertEq('recovery: reconciled job completed after drain', sj.status, 'completed');
  assertEq('recovery: reconciled job retryCount 1', sj.retryCount, 1);
}

// ══════════════════════════════════════════════════════════════════════
// SUITE E — KPI 1 retention (install id + heartbeat debounce)
// ══════════════════════════════════════════════════════════════════════
setSuite('E.kpi-retention');
{
  await AS.clear();
  const id1 = await retention.getOrCreateInstallId();
  const id2 = await retention.getOrCreateInstallId();
  assertEq('install id stable across calls', id1, id2);
  assert(id1.startsWith('inst_'), 'install id has inst_ prefix');
  const hb1 = await retention.recordHeartbeat();
  const hb2 = await retention.recordHeartbeat();
  assert(hb1 !== null, 'first heartbeat writes');
  assertEq('heartbeat debounced (60s min interval)', hb2, null);
  const snap = await retention.getRetentionSnapshot();
  assertEq('snapshot install id matches', snap.installId, id1);
  assert(snap.firstLaunchAt !== null, 'firstLaunchAt stamped on first launch');
  assert(snap.lastActiveAt !== null, 'lastActiveAt stamped by heartbeat');
}

// ══════════════════════════════════════════════════════════════════════
// SUITE F — KPI 2 reading stats (measured minutes this week)
// ══════════════════════════════════════════════════════════════════════
setSuite('F.kpi-reading-stats');
{
  await AS.clear();
  await AS.setItem('@YomuLog:chapterProgress', JSON.stringify([
    { chapterId: 'c1', mangaId: 'm1', mangaTitle: 'M1', chapterNumber: '1', scrollPercentage: 100, isRead: true, lastReadAt: '2026-01-01T00:00:00Z' },
    { chapterId: 'c2', mangaId: 'm1', mangaTitle: 'M1', chapterNumber: '2', scrollPercentage: 50, isRead: true, lastReadAt: '2026-01-02T00:00:00Z' },
    { chapterId: 'c3', mangaId: 'm2', mangaTitle: 'M2', chapterNumber: '1', scrollPercentage: 30, isRead: false, lastReadAt: '2026-01-03T00:00:00Z' },
  ]));
  const dayStr = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return y + '-' + mo + '-' + da;
  };
  const days = {};
  days[dayStr(0)] = 1800; // today
  days[dayStr(1)] = 1800; // yesterday -> 3600s total within trailing 7 days
  await AS.setItem('@YomuLog:readingSecondsByDay', JSON.stringify(days));
  const stats = await statsSvc.computeReadingStats();
  assertEq('reading stats: totalChaptersRead', stats.totalChaptersRead, 2);
  assertEq('reading stats: totalChaptersStarted', stats.totalChaptersStarted, 3);
  assertEq('reading stats: minutes this week (measured)', stats.readingMinutesThisWeek, 60);
  assertEq('reading stats: minutes today', stats.readingMinutesToday, 30);
}

// ══════════════════════════════════════════════════════════════════════
// SUITE G — KPI 4 premium funnel events (incl. E5 dedupe)
// ══════════════════════════════════════════════════════════════════════
setSuite('G.kpi-funnel');
{
  await AS.clear();
  const install = await retention.getOrCreateInstallId();
  await funnel.recordFunnelEvent('signup_complete');
  await funnel.recordFunnelEvent('paywall_viewed');
  await funnel.recordFunnelEvent('checkout_started', { plan: 'monthly' });
  await funnel.recordFunnelEvent('checkout_completed', { subscriptionId: 'sub_123' });
  await funnel.recordFunnelEvent('checkout_completed', { subscriptionId: 'sub_123' }); // E5 dedupe
  const log = await funnel.getFunnelEventLog();
  assertEq('funnel: exactly 4 events (dedupe worked)', log.length, 4);
  assertEq('funnel: order signup->paywall->checkout', log.map((e) => e.name).join(','), 'signup_complete,paywall_viewed,checkout_started,checkout_completed');
  assertEq('funnel: install id attached', log.every((e) => e.install_id === install), true);
  assertEq('funnel: checkout_completed count 1 after dedupe', log.filter((e) => e.name === 'checkout_completed').length, 1);
  assertEq('funnel: event ids unique', new Set(log.map((e) => e.event_id)).size, 4);
  assertEq('funnel: checkout payload preserved', log.find((e) => e.name === 'checkout_completed').payload.subscriptionId, 'sub_123');
}

// ─── summary ──────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok);
console.log('── E2E LOGIC SUITE [' + PLATFORM + '] ──');
let lastSuite = '';
for (const r of results) {
  if (r.suite !== lastSuite) { console.log('  ' + r.suite); lastSuite = r.suite; }
  console.log('  ' + (r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + (r.ok ? '' : '  — ' + r.detail));
}
console.log('EVIDENCE-GAPS ' + evidenceCount + (evidenceCount > 0 ? ' (documented LWW-intent gaps on the real sync path — expected FAILs)' : ' (documented LWW-intent gaps — all closed by the true-LWW real-path fix)') + ' [' + PLATFORM + ']');
console.log('TOTAL ' + results.length + ' assertions, ' + failed.length + ' failed, ' + evidenceCount + ' evidence-gaps [' + PLATFORM + ']');
process.exitCode = failed.length - evidenceCount;
export {};
`;

writeFileSync(join(SCRATCH, 'test.ts'), fixImports(TEST_SOURCE));
// Make the emitted dist/test.js ESM (top-level await needs it).
writeFileSync(join(SCRATCH, 'package.json'), JSON.stringify({ name: 'e2e-logic-scratch', type: 'module', private: true }, null, 2), null);

// ─── 4b. Ambient declarations + tsconfig for the real-tsc compile ─────
writeFileSync(join(SCRATCH, 'env.d.ts'), `declare const __DEV__: boolean;
declare const window: any;
declare module 'react-native' {
  export const Platform: any; export const Linking: any; export const DeviceEventEmitter: any;
  export const NativeModules: any; export const useWindowDimensions: any;
  export type AccessibilityProps = any;
}
declare module '@react-native-async-storage/async-storage' { const A: any; export default A; }
declare module '@supabase/supabase-js' { export function createClient(...args: any[]): any; export type SupabaseClient = any; export const __db: any; }
declare module 'expo-file-system' {
  const M: any; export default M;
  export const documentDirectory: any; export const makeDirectoryAsync: any; export const downloadAsync: any;
  export const getInfoAsync: any; export const readDirectoryAsync: any; export const deleteAsync: any;
}
declare module 'expo-file-system/legacy' {
  const M: any; export default M;
  export const documentDirectory: any; export const makeDirectoryAsync: any; export const downloadAsync: any;
  export const getInfoAsync: any; export const readDirectoryAsync: any; export const deleteAsync: any;
}
declare module 'expo-image-manipulator' { const M: any; export default M; export const manipulateAsync: any; }
declare module 'expo-image-picker' {
  const M: any; export default M;
  export type ImagePickerAsset = any;
  export const requestMediaLibraryPermissionsAsync: any; export const launchImageLibraryAsync: any;
}
declare module 'expo-secure-store' {
  const M: any; export default M;
  export const getItemAsync: any; export const setItemAsync: any; export const deleteItemAsync: any;
  export const WHEN_UNLOCKED: any; export const WHEN_UNLOCKED_THIS_DEVICE_ONLY: any; export const AFTER_FIRST_UNLOCK: any;
}
declare module 'expo-sqlite' {
  const M: any; export default M;
  export type SQLiteBindValue = any;
  export type SQLiteDatabase = any;
  export const SQLiteProvider: any;
  export const openDatabaseSync: any;
  export const useSQLiteContext: any;
}
`);
writeFileSync(join(SCRATCH, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    target: 'es2022',
    module: 'esnext',
    moduleResolution: 'bundler',
    allowImportingTsExtensions: true,
    rewriteRelativeImportExtensions: true,
    outDir: 'dist',
    strict: false,
    noImplicitAny: false,
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    noEmitOnError: false,
    types: ['node'],
    typeRoots: [join(REPO_ROOT, 'node_modules/@types')],
    lib: ['es2022'],
  },
  include: ['./services/**/*.ts', './utils/**/*.ts', './test.ts', './env.d.ts'],
}, null, 2), null);

// tsc is run with noEmitOnError:false — it type-checks the whole copied tree
// but EMITS regardless, so a stray type error in a module the suite does not
// exercise (e.g. nativeDB/stripeService json typing under @types/node) must
// not block the runtime evidence. Emit success is what gates the run.
log('compiling copied sources with repo tsc …');
const tscBin = join(REPO_ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
try {
  execFileSync('node', [tscBin, '-p', join(SCRATCH, 'tsconfig.json')], { cwd: SCRATCH, stdio: 'inherit' });
} catch (e) {
  if (!existsSync(join(SCRATCH, 'dist', 'test.js'))) {
    process.stderr.write((e.stdout ?? '') + (e.stderr ?? ''));
    log('TSC FAILED AND NO EMIT — aborting (compile errors in exercised sources).');
    process.exit(e.status || 1);
  }
  log('tsc reported type errors (see above) but emitted JS — proceeding (noEmitOnError: false).');
}

// ─── 5. Run the compiled suite for each platform pass ─────────────────
let aggregate = 0;
const allOut = [];
const emitted = join(SCRATCH, 'dist', 'test.js');
for (const platform of ['web', 'ios']) {
  log(`running pass E2E_PLATFORM=${platform} …`);
  try {
    const out = execFileSync('node', [emitted], {
      cwd: SCRATCH,
      env: { ...process.env, E2E_PLATFORM: platform },
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    allOut.push(out);
    process.stdout.write(out);
    const m = out.match(/TOTAL \d+ assertions, (\d+) failed, (\d+) evidence-gaps/);
    aggregate += m ? (Number(m[1]) - Number(m[2])) : 999;
  } catch (e) {
    allOut.push(e.stdout ?? '');
    process.stdout.write(e.stdout ?? '');
    process.stderr.write(e.stderr ?? '');
    // Child test exits with (failed - evidenceCount); map that straight through.
    aggregate += typeof e.status === 'number' ? e.status : 999;
  }
}

if (OUT_PATH) writeFileSync(OUT_PATH, allOut.join('\n'));
log(`aggregate failed assertions: ${aggregate}`);
process.exitCode = aggregate;
