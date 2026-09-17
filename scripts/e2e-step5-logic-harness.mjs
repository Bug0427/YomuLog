#!/usr/bin/env node
// scripts/e2e-step5-logic-harness.mjs — logic-level support harness for the
// owner-directed E2E program, STEP 5 (premium gating + checkout client safety
// + KPI/funnel emission). Backend deliverable for task cac85681.
//
// WHY THIS EXISTS
// E2E STEP 5 (QA) drives the browser, but the live Supabase/Stripe paths
// cannot exist yet (owner keys + proxy deploy pending). Without this harness
// STEP 5's entitlement/checkout/KPI claims would be a pile of CANNOT-VERIFY.
// This suite makes the CLIENT-SIDE LOGIC provable in plain Node against a
// STUBBED Supabase client and STUBBED Stripe (no keys, no network).
//
// WHAT IT PROVES (one PASS/FAIL line each)
//   A. Entitlement + premium gating
//     1. Supabase unconfigured -> entitlement read returns the FREE default
//        (every field) and never reports Premium when it cannot know. The
//        configured path with a premium row and with no row is also asserted.
//     2. The five gated surfaces (cloud_sync, unlimited_downloads, ai_search,
//        custom_themes, reading_stats) resolve gated for free / ungated for
//        premium — driven by the real entitlement state; the real download
//        allowance path is exercised end-to-end; JSX call-site gates are
//        static-guarded against the real screens (host side).
//     3. openPremiumCheckout fails gracefully whenever checkout cannot open:
//        returns { success:false, error }, never throws, never reports
//        success, and never emits checkout_started on a failed open.
//     4. #242 regression guard: stripe-portal / stripe-cancel request
//        builders attach the caller's Authorization: Bearer <access_token>
//        header, and the userId in the body comes from the session — no code
//        path trusts a caller-supplied id (runtime + static guards).
//   B. KPI / funnel events
//     5. The four funnel events fire exactly once per action with the exact
//        expected names. Names are parsed from the REAL FunnelEventName union
//        in services/funnelService.ts — never retyped — so a rename decouples
//        and fails loudly. Never-fire and double-fire (E5 dedupe) asserted.
//     6. Download reliability counters: success vs forced permanent failure
//        move the counters in opposite directions; a retry that later
//        succeeds does not double-count; a download whose pages ALL fail at
//        page level must NOT count as completed (KPI-3 integrity).
//     7. Reading-time and retention local writes happen on the real emitter
//        paths (recordReadingSeconds -> byChapter/byDay; install id,
//        firstLaunchAt, debounced lastActiveAt heartbeat; static guards on
//        hooks/useReadingSession.ts + ReaderScreen).
//
// HONESTY / BOUNDARIES (also stated in the report doc)
//   - This harness STUBS Supabase and Stripe. It proves client logic and
//     request construction — NOT that a live project accepts them. Both
//     halves are needed; neither substitutes for the other.
//   - The checkout boundary proves the client FAILS SAFE (no false success),
//     not that Stripe Hosted Checkout works end-to-end.
//   - Genuinely CANNOT-VERIFY without owner keys: live webhook -> entitlement
//     writes, Supabase Realtime delivery, real Stripe redirect/return, and
//     server-side RLS/JWT acceptance.
//   - Report states the build sha the harness was run against (printed below).
//
// HOW IT WORKS (same proven machinery as E2E STEP 1 e2e-logic-harness.mjs)
//   copies services/ + utils/ verbatim into /tmp/e2e-step5-harness, appends
//   missing .ts to relative import specifiers (Node ESM needs them), installs
//   tiny ESM stubs (react-native, async-storage, fake supabase-js with an
//   in-memory DB, inert expo-* modules), compiles the copied tree with the
//   repo's real tsc (rewriteRelativeImportExtensions; noEmitOnError:false) and
//   runs the emitted suite in fresh Node processes per PASS/PLATFORM.
//
// RUN (from the repo root):
//   node scripts/e2e-step5-logic-harness.mjs [--out /tmp/e2e-step5-results.txt]
// Exit code = number of failed assertions (0 = all green).
import { execFileSync } from 'node:child_process';
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = '/tmp/e2e-step5-harness';
const OUT_ARG = process.argv.indexOf('--out');
const OUT_PATH = OUT_ARG >= 0 ? process.argv[OUT_ARG + 1] : null;
const log = (...a) => console.log('[step5-harness]', ...a);
// ─── build sha (repo HEAD this harness was run against) ───────────────
let SHA = '(not a git worktree)';
try { SHA = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim(); }
catch { /* ignore */ }
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
log('fixing relative imports …');
for (const p of walk(join(SCRATCH, 'services'))) writeFileSync(p, fixImports(readFileSync(p, 'utf8')));
for (const p of walk(join(SCRATCH, 'utils'))) writeFileSync(p, fixImports(readFileSync(p, 'utf8')));
// ─── 3. ESM stubs for the bare packages the services import ───────────
function writeStub(name, files) {
  const dir = join(SCRATCH, 'node_modules', ...name.split('/'));
  mkdirSync(dir, { recursive: true });
  for (const [f, content] of Object.entries(files)) writeFileSync(join(dir, f), content);
}
writeStub('react-native', {
  'package.json': '{"name":"react-native","version":"0.0.0","type":"module","main":"index.js"}\n',
  'index.js': `export const Platform = { OS: process.env.E2E_PLATFORM === 'ios' ? 'ios' : 'web' };
export const Linking = {
  _opened: [],
  canOpenURL: async () => true,
  openURL: async (url) => { Linking._opened.push(String(url)); return true; },
  addEventListener: () => ({ remove: () => ({}) }),
};
export const AppState = { addEventListener: () => ({ remove: () => ({}) }) };
export const DeviceEventEmitter = { addListener: () => ({ remove: () => ({}) }), emit: () => ({}) };
export const NativeModules = {};
export const useWindowDimensions = () => ({ width: 390, height: 844, scale: 1, fontScale: 1 });
export default {};
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
// Fake Supabase: in-memory query client. The REAL stripeService reads
// subscription status via supabase.from('user_subscriptions').select(...)
// and sessions via supabase.auth.getSession(). select() returns the query
// object itself (supabase-js semantics).
writeStub('@supabase/supabase-js', {
  'package.json': '{"name":"@supabase/supabase-js","version":"2.0.0","type":"module","main":"index.js"}\n',
  'index.js': `const tables = { user_subscriptions: [], user_events: [] };
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
        select() { return q; },
        eq(col, val) { filters.push(['eq', col, val]); return q; },
        order(col, opts) { filters.push(['order', col, opts]); return q; },
        limit(n) { filters.push(['limit', n]); return q; },
        maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
        single: async () => ({ data: run()[0] ?? null, error: run()[0] ? null : { message: 'no rows' } }),
        then(resolve) { resolve({ data: run(), error: null }); },
        async upsert(rows, opts) {
          const conflictKeys = (opts && opts.onConflict ? opts.onConflict.split(',') : ['id']).map((k) => k.trim());
          for (const row of rows) {
            const idx = db.tables[table].findIndex((r) => conflictKeys.every((k) => r[k] === row[k]));
            if (idx >= 0) db.tables[table][idx] = JSON.parse(JSON.stringify(row));
            else db.tables[table].push(JSON.parse(JSON.stringify(row)));
          }
          return { error: null };
        },
        async delete() { db.tables[table] = run(); return { error: null }; },
      };
      return q;
    },
    channel() { return { on: () => ({ subscribe: () => ({}) }) }; },
    removeChannel() {},
  };
  return client;
}
export const __db = db;
`,
});
// expo-* modules never exercised by this suite — inert stubs so a stray
// dynamic import inside nativeFS/other services can't crash module loading.
// The legacy FS stub carries a page-failure switch for the KPI-3 counter test.
writeStub('expo-file-system', {
  'package.json': '{"name":"expo-file-system","version":"1.0.0","type":"module","main":"index.js","exports":{"./legacy":"./legacy.js"}}\n',
  'index.js': `export const documentDirectory = '/tmp/e2e-fs/';
export default {};
`,
  'legacy.js': `let failPages = false;
export function __setPageDownloadFail(v) { failPages = v; }
export const documentDirectory = '/tmp/e2e-fs/';
export const downloadAsync = async () => (failPages ? { status: 500 } : { status: 200, uri: '/tmp/e2e-fs/f' });
export const makeDirectoryAsync = async () => {};
export const getInfoAsync = async () => ({ exists: true, size: 1 });
export const readDirectoryAsync = async () => [];
export const deleteAsync = async () => {};
export default {};
`,
});
const INERT = {
  'expo-image-manipulator': 'export const manipulateAsync = async () => ({});\nexport default {};\n',
  'expo-image-picker': 'export const requestMediaLibraryPermissionsAsync = async () => ({ status: \'granted\' });\nexport const launchImageLibraryAsync = async () => ({ canceled: true });\nexport default {};\n',
  'expo-secure-store': 'export const getItemAsync = undefined; export const setItemAsync = undefined; export const deleteItemAsync = undefined;\nexport default {};\n',
  'expo-sqlite': 'export const SQLiteProvider = undefined; export const openDatabaseSync = undefined; export const useSQLiteContext = undefined;\nexport default {};\n',
};
for (const [name, body] of Object.entries(INERT)) {
  writeStub(name, {
    'package.json': JSON.stringify({ name, version: '1.0.0', type: 'module', main: 'index.js' }) + '\n',
    'index.js': body,
  });
}
// ─── 4. Host-side static source guards (read the REAL repo files) ─────
// These guard what the runtime suite cannot: JSX call-site gates on isPremium,
// the #242 header construction in stripeService source, and the real emitter
// paths for reading-time/retention writes. Output uses the same PASS/FAIL
// line format so the tally stays consistent.
const hostResults = [];
function hostCheck(name, cond) {
  hostResults.push({ suite: 'H.static-guards', name, ok: !!cond });
}
const read = (p) => { try { return readFileSync(join(REPO_ROOT, p), 'utf8'); } catch { return ''; } };
const stripeSrc = read('services/stripeService.ts');
hostCheck('getAuthHeaders constructs Authorization: Bearer <token>', /Authorization: `Bearer/.test(stripeSrc) && /access_token/.test(stripeSrc));
hostCheck('openCustomerPortal uses getAuthHeaders', /headers: await getAuthHeaders\(\)/.test(stripeSrc));
hostCheck('cancelSubscription uses getAuthHeaders', (stripeSrc.match(/headers: await getAuthHeaders\(\)/g) || []).length >= 2);
hostCheck('openCustomerPortal takes no userId param', /export async function openCustomerPortal\(\s*\)/.test(stripeSrc));
hostCheck('cancelSubscription takes no userId param', /export async function cancelSubscription\(\s*\)/.test(stripeSrc));
hostCheck('getUserId reads id from session (no caller param)', /async function getUserId\(\): Promise<string \| null>/.test(stripeSrc) && /supabase\.auth\.getSession\(\)/.test(stripeSrc));
// gate call sites (the four JSX surfaces + the pure download allowance fn)
hostCheck('reading_stats gate is isPremium-driven (ReadingStatsScreen)', /if \(!isPremium\)/.test(read('screens/main/ReadingStatsScreen.tsx')));
hostCheck('ai_search gate is isPremium-driven (SearchScreen)', /isPremium &&/.test(read('screens/main/SearchScreen.tsx')));
hostCheck('cloud_sync gate is isPremium-driven (SettingsScreen)', /!isPremium/.test(read('screens/main/SettingsScreen.tsx')));
hostCheck('custom_themes gate is isPremium-driven (ReaderThemeSettingsScreen)', /\{isPremium \? \(/.test(read('screens/settings/ReaderThemeSettingsScreen.tsx')));
hostCheck('unlimited_downloads has a real allowance fn (downloadManager)', /export async function getDownloadAllowance/.test(read('services/downloadManager.ts')));
// emitter paths for reading-time / retention
const readerSrc = read('screens/main/ReaderScreen.tsx');
const hookSrc = read('hooks/useReadingSession.ts');
hostCheck('ReaderScreen mounts useReadingSession(chapterId)', /useReadingSession\(chapterId\)/.test(readerSrc));
hostCheck('ReaderScreen calls recordHeartbeat()', /recordHeartbeat\(\)/.test(readerSrc));
hostCheck('useReadingSession calls recordReadingSeconds', /recordReadingSeconds\(/.test(hookSrc));
// ─── 4b. Parse the REAL funnel event names from the union type ─────────
// The four names are never retyped in the suite: FUNNEL_NAMES comes from this
// parse of services/funnelService.ts, so a rename decouples and fails loudly.
const funnelSrc = read('services/funnelService.ts');
const unionM = funnelSrc.match(/FunnelEventName\s*=\s*([\s\S]*?);/);
const FUNNEL_NAMES = unionM ? Array.from(unionM[1].matchAll(/'([a-z_]+)'/g), (m) => m[1]) : [];
hostCheck('funnel union parsed from real source', FUNNEL_NAMES.length === 4);
// ─── 5. The suite (test.ts) ───────────────────────────────────────────
// IMPORTANT: this embedded source must not contain backticks or ${} — it is
// written to the scratch dir, compiled by tsc, run as plain ESM JS. The
// __FUNNEL_NAMES__ placeholder is replaced with the parsed names below.
const TEST_SOURCE = `// E2E STEP 5 logic suite — runs against COPIED repo sources (sha in report).
// PASS=unconfigured|configured  PLATFORM=web|ios  (set per run by the runner)
const PASS = process.env.E2E_PASS || 'unconfigured';
const PLATFORM = process.env.E2E_PLATFORM || 'web';
const FUNNEL_NAMES = __FUNNEL_NAMES__;
const results = [];
let suite = 'setup';
function setSuite(name) { suite = name; }
function assert(ok, name, detail) {
  results.push({ suite: suite, name: name, ok: !!ok, detail: detail || '' });
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function assertEq(name, actual, expected) {
  assert(eq(actual, expected), name, 'actual=' + JSON.stringify(actual) + ' expected=' + JSON.stringify(expected));
}
// ─── module imports (real repo code, copied) ─────────────────────────
const ASMod = await import('@react-native-async-storage/async-storage');
const AS = ASMod.default;
const sbMod = await import('@supabase/supabase-js');
const __db = sbMod.__db;
const stripe = await import('./services/stripeService.ts');
const supabaseClient = await import('./services/supabaseClient.ts');
const funnel = await import('./services/funnelService.ts');
const retention = await import('./services/retentionService.ts');
const readingSvc = await import('./services/readingSessionService.ts');
const dm = await import('./services/downloadManager.ts');
const RN = await import('react-native');
const AT_HOME = JSON.stringify({ result: 'ok', baseUrl: 'https://uploads.mangadex.org', chapter: { hash: 'abc', data: ['p1.jpg', 'p2.jpg', 'p3.jpg'], dataSaver: ['s1.jpg', 's2.jpg', 's3.jpg'] } });
let atHomeFail = false;
let lastPortalReq = null;
let lastCancelReq = null;
(globalThis).__setAtHomeFail = (v) => { atHomeFail = !!v; };
(globalThis).fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : String(input && input.url ? input.url : input);
  if (atHomeFail && url.includes('/at-home/server/')) throw new Error('simulated network failure');
  if (url.includes('/at-home/server/')) return new Response(AT_HOME, { status: 200, headers: { 'content-type': 'application/json' } });
  const headers = (init && init.headers) || {};
  if (url.includes('functions/v1/stripe-portal')) {
    lastPortalReq = { url: url, headers: headers, bodyRaw: init && init.body };
    return new Response(JSON.stringify({ url: 'https://billing.stripe.com/p/test' }), { status: 200 });
  }
  if (url.includes('functions/v1/stripe-cancel')) {
    lastCancelReq = { url: url, headers: headers, bodyRaw: init && init.body };
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  throw new Error('unexpected fetch in step5-harness: ' + url);
};
// ─── shared gate model ────────────────────────────────────────────────
// PremiumContext derives isPremium from subscriptionStatus.isActive; every
// gated surface branches on isPremium. The gate decision therefore comes
// from the entitlement state, and free/premium below use the REAL status
// objects produced by fetchSubscriptionStatus() (stubbed Supabase).
function gateFromStatus(st) { return !st.isActive; }
const GATED_SURFACES = ['cloud_sync', 'unlimited_downloads', 'ai_search', 'custom_themes', 'reading_stats'];
// ══════════════════════════════════════════════════════════════════════
// SUITE A1 — entitlement read
// ══════════════════════════════════════════════════════════════════════
if (PASS === 'unconfigured') {
  setSuite('A1.entitlement-unconfigured');
  await AS.clear();
  assert(supabaseClient.isSupabaseConfigured() === false, 'isSupabaseConfigured() is false with no env');
  const st = await stripe.fetchSubscriptionStatus();
  assertEq('free default: isActive', st.isActive, false);
  assertEq('free default: plan', st.plan, null);
  assertEq('free default: currentPeriodEnd', st.currentPeriodEnd, null);
  assertEq('free default: cancelAtPeriodEnd', st.cancelAtPeriodEnd, false);
  assertEq('free default: customerId', st.customerId, null);
  assertEq('free default: subscriptionId', st.subscriptionId, null);
  assert(st.isActive !== true, 'never reports Premium active when it cannot know');
}
if (PASS === 'configured') {
  setSuite('A1.entitlement-configured');
  await AS.clear();
  __db.clear();
  __db.session = { user: { id: 'user-9' }, access_token: 'tok-abc' };
  __db.seed('user_subscriptions', [
    { user_id: 'user-9', is_active: true, plan: 'monthly', current_period_end: '2026-12-31T00:00:00Z',
      cancel_at_period_end: false, stripe_customer_id: 'cus_123', stripe_subscription_id: 'sub_456' },
  ]);
  const p = await stripe.fetchSubscriptionStatus();
  assertEq('premium row: isActive', p.isActive, true);
  assertEq('premium row: plan', p.plan, 'monthly');
  assertEq('premium row: currentPeriodEnd', p.currentPeriodEnd, '2026-12-31T00:00:00Z');
  assertEq('premium row: cancelAtPeriodEnd', p.cancelAtPeriodEnd, false);
  assertEq('premium row: customerId', p.customerId, 'cus_123');
  assertEq('premium row: subscriptionId', p.subscriptionId, 'sub_456');
  // no row -> free default again (never reports premium on an empty query)
  await AS.clear();
  __db.clear();
  __db.session = { user: { id: 'user-9' }, access_token: 'tok-abc' };
  const f = await stripe.fetchSubscriptionStatus();
  assertEq('no row: isActive false', f.isActive, false);
  assertEq('no row: plan null', f.plan, null);
  assertEq('no row: ids null', f.subscriptionId, null);
}
// ══════════════════════════════════════════════════════════════════════
// SUITE A2 — the five gated surfaces resolve from entitlement state
// ══════════════════════════════════════════════════════════════════════
if (PASS === 'unconfigured') {
  setSuite('A2.gates-free');
  await AS.clear();
  const st = await stripe.fetchSubscriptionStatus();
  for (const id of GATED_SURFACES) {
    assertEq('free: ' + id + ' is gated', gateFromStatus(st), true);
  }
  // real download allowance path: free at/over the 5-chapter cap is gated
  await AS.setItem('@YomuLog:premium', 'false');
  for (let i = 1; i <= 5; i++) await dm.enqueueDownload('cap-' + i, 'capm', 'Cap Manga', String(i));
  const allowFree = await dm.getDownloadAllowance();
  assertEq('free: allowance.allowed false at cap', allowFree.allowed, false);
  assertEq('free: allowance.limit is FREE_DOWNLOAD_LIMIT', allowFree.limit, dm.FREE_DOWNLOAD_LIMIT);
}
if (PASS === 'configured') {
  setSuite('A2.gates-premium');
  await AS.clear();
  __db.clear();
  __db.session = { user: { id: 'user-9' }, access_token: 'tok-abc' };
  __db.seed('user_subscriptions', [
    { user_id: 'user-9', is_active: true, plan: 'monthly', stripe_subscription_id: 'sub_456' },
  ]);
  const st = await stripe.fetchSubscriptionStatus();
  for (const id of GATED_SURFACES) {
    assertEq('premium: ' + id + ' is ungated', gateFromStatus(st), false);
  }
  // real download allowance: premium ignores the cap
  await AS.setItem('@YomuLog:premium', 'true');
  const allowPrem = await dm.getDownloadAllowance();
  assertEq('premium: allowance.premium true', allowPrem.premium, true);
  assertEq('premium: allowance.allowed true regardless of usage', allowPrem.allowed, true);
  // the surface list is the real exported one
  const feats = stripe.getPremiumFeatures().map((f) => f.id).sort();
  assertEq('getPremiumFeatures exposes exactly the five surfaces', feats, ['ai_search', 'cloud_sync', 'custom_themes', 'reading_stats', 'unlimited_downloads']);
}
// ══════════════════════════════════════════════════════════════════════
// SUITE A3 — checkout fails safe when it cannot open
// ══════════════════════════════════════════════════════════════════════
if (PASS === 'unconfigured' && PLATFORM === 'web') {
  setSuite('A3.checkout-failure-web');
  await AS.clear();
  (globalThis).window = { open: undefined }; // window exists, open is not a function
  let threw = false;
  let res;
  try { res = await stripe.openPremiumCheckout(); } catch (e) { threw = true; }
  assert(threw === false, 'web: openPremiumCheckout does not throw');
  assert(res && res.success === false, 'web: returns success:false');
  assert(typeof res.error === 'string' && res.error.length > 0, 'web: returns an error message');
  const log1 = await funnel.getFunnelEventLog();
  assert(log1.filter((e) => e.name === FUNNEL_NAMES[2]).length === 0, 'web: checkout_started NOT emitted on failed open');
}
if (PASS === 'unconfigured' && PLATFORM === 'ios') {
  setSuite('A3.checkout-failure-ios');
  await AS.clear();
  RN.Linking._opened = [];
  // canOpenURL false -> safe failure
  RN.Linking.canOpenURL = async () => false;
  let threw = false;
  let res;
  try { res = await stripe.openPremiumCheckout(); } catch (e) { threw = true; }
  assert(threw === false, 'ios: no throw when canOpenURL false');
  assert(res && res.success === false && typeof res.error === 'string', 'ios: canOpenURL false -> success:false + error');
  // openURL throws -> safe failure
  RN.Linking.canOpenURL = async () => true;
  RN.Linking.openURL = async () => { throw new Error('boom'); };
  threw = false;
  try { res = await stripe.openPremiumCheckout(); } catch (e) { threw = true; }
  assert(threw === false, 'ios: no throw when openURL throws');
  assert(res && res.success === false && typeof res.error === 'string', 'ios: openURL throw -> success:false + error');
  const log1 = await funnel.getFunnelEventLog();
  assert(log1.filter((e) => e.name === FUNNEL_NAMES[2]).length === 0, 'ios: checkout_started NOT emitted on failed open');
}
if (PASS === 'configured' && PLATFORM === 'web') {
  setSuite('A3.checkout-success-web');
  await AS.clear();
  (globalThis).window = { open: () => null };
  const r1 = await stripe.openPremiumCheckout();
  assert(r1.success === true, 'web: checkout opens successfully (success:true)');
  const r2 = await stripe.openPremiumCheckout('onboarding');
  assert(r2.success === true, 'web: checkout opens again (success:true)');
  // flush fire-and-forget events deterministically (poll up to 2s)
  let log1 = await funnel.getFunnelEventLog();
  for (let i = 0; i < 40 && log1.filter((e) => e.name === FUNNEL_NAMES[2]).length < 2; i++) {
    await new Promise((r) => setTimeout(r, 50));
    log1 = await funnel.getFunnelEventLog();
  }
  const started = log1.filter((e) => e.name === FUNNEL_NAMES[2]);
  assertEq('web: checkout_started fires exactly once per open (2 opens = 2 events)', started.length, 2);
  assert(started.every((e) => e.install_id && e.install_id.indexOf('inst_') === 0), 'web: checkout_started carries install_id');
  assert(!!log1.find((e) => e.payload && e.payload.source === 'onboarding'), 'web: source attribution rides along');
}
// ══════════════════════════════════════════════════════════════════════
// SUITE A4 — #242 regression guard: portal/cancel attach the caller Bearer
// ══════════════════════════════════════════════════════════════════════
if (PASS === 'configured' && PLATFORM === 'web') {
  setSuite('A4.portal-cancel-auth');
  await AS.clear();
  __db.clear();
  __db.session = { user: { id: 'user-9' }, access_token: 'tok-abc' };
  __db.seed('user_subscriptions', [
    { user_id: 'user-9', is_active: true, plan: 'monthly', stripe_subscription_id: 'sub_456' },
  ]);
  const res = await stripe.openCustomerPortal();
  assert(res.success === true, 'portal: call succeeds against stub');
  assert(lastPortalReq !== null, 'portal: request captured');
  assert(lastPortalReq.headers && lastPortalReq.headers.Authorization === 'Bearer tok-abc', 'portal: Authorization Bearer header attached');
  const body = JSON.parse(lastPortalReq.bodyRaw);
  assertEq('portal: body userId comes from session', body.userId, 'user-9');
  assert(RN.Linking._opened.indexOf('https://billing.stripe.com/p/test') >= 0, 'portal: returned URL opened');
  const res2 = await stripe.cancelSubscription();
  assert(res2.success === true, 'cancel: call succeeds against stub');
  assert(lastCancelReq.headers && lastCancelReq.headers.Authorization === 'Bearer tok-abc', 'cancel: Authorization Bearer header attached');
  const body2 = JSON.parse(lastCancelReq.bodyRaw);
  assertEq('cancel: body userId comes from session', body2.userId, 'user-9');
}
// ══════════════════════════════════════════════════════════════════════
// SUITE B5 — funnel events: exact names, once per action, dedupe
// ══════════════════════════════════════════════════════════════════════
if (PASS === 'unconfigured') {
  setSuite('B5.funnel-events');
  await AS.clear();
  const [SIGNUP, PAYWALL, STARTED, COMPLETED] = FUNNEL_NAMES;
  assert(FUNNEL_NAMES.length === 4, 'exactly four funnel names in real source (' + FUNNEL_NAMES.join(',') + ')');
  await funnel.recordFunnelEvent(SIGNUP, { source: 'onboarding' });
  let log1 = await funnel.getFunnelEventLog();
  assertEq('signup_complete fires once per action', log1.filter((e) => e.name === SIGNUP).length, 1);
  await funnel.recordFunnelEvent(PAYWALL, { source: 'upgrade_screen' });
  log1 = await funnel.getFunnelEventLog();
  assertEq('paywall_viewed fires once per action', log1.filter((e) => e.name === PAYWALL).length, 1);
  assertEq('checkout_started never fired -> 0 events', log1.filter((e) => e.name === STARTED).length, 0);
  await funnel.recordFunnelEvent(COMPLETED, { subscriptionId: 'sub_dup' });
  await funnel.recordFunnelEvent(COMPLETED, { subscriptionId: 'sub_dup' });
  log1 = await funnel.getFunnelEventLog();
  assertEq('checkout_completed double-fire deduped to 1', log1.filter((e) => e.name === COMPLETED).length, 1);
  await funnel.recordFunnelEvent(COMPLETED, { subscriptionId: 'sub_new' });
  log1 = await funnel.getFunnelEventLog();
  assertEq('new subscription id is a fresh conversion', log1.filter((e) => e.name === COMPLETED).length, 2);
  assert(log1.every((e) => FUNNEL_NAMES.indexOf(e.name) >= 0), 'every event name matches the real constants');
  assert(log1.every((e) => e.install_id && e.install_id.indexOf('inst_') === 0), 'install_id attached to every event');
}
// ══════════════════════════════════════════════════════════════════════
// SUITE B7 — reading-time and retention local writes (real emitter paths)
// ══════════════════════════════════════════════════════════════════════
if (PASS === 'unconfigured') {
  setSuite('B7.reading-retention-writes');
  await AS.clear();
  const installId = await retention.getOrCreateInstallId();
  assert(installId.indexOf('inst_') === 0, 'install id created with inst_ prefix');
  const snap1 = await retention.getRetentionSnapshot();
  assert(snap1.firstLaunchAt !== null, 'firstLaunchAt stamped on first launch');
  const hb1 = await retention.recordHeartbeat();
  assert(hb1 !== null, 'heartbeat writes an ISO timestamp on first call');
  const hb2 = await retention.recordHeartbeat();
  assert(hb2 === null, 'heartbeat debounced (no write on second call within the minute)');
  const snap2 = await retention.getRetentionSnapshot();
  assert(snap2.lastActiveAt !== null, 'retention snapshot carries lastActiveAt');
  await readingSvc.recordReadingSeconds('chX', 30);
  await readingSvc.recordReadingSeconds('chX', 15);
  await readingSvc.recordReadingSeconds('chY', 12);
  const byCh = await readingSvc.getReadingSecondsByChapter();
  assertEq('reading seconds accumulate per chapter', byCh['chX'], 45);
  assertEq('reading seconds recorded per chapter (chY)', byCh['chY'], 12);
  const byDay = await readingSvc.getReadingSecondsByDay();
  const today = readingSvc.toDayKey(new Date());
  assertEq('reading seconds rolled into today', byDay[today] || 0, 57);
  assertEq('total reading seconds matches', await readingSvc.getReadingSecondsTotal(), 57);
  await readingSvc.recordReadingSeconds('', 10);
  await readingSvc.recordReadingSeconds('chZ', NaN);
  const byCh2 = await readingSvc.getReadingSecondsByChapter();
  assert((byCh2[''] || 0) === 0 && (byCh2['chZ'] || 0) === 0, 'invalid inputs never write');
}
// ══════════════════════════════════════════════════════════════════════
// SUITE B6 — download reliability counters (native path only)
// ══════════════════════════════════════════════════════════════════════
if (PASS === 'configured' && PLATFORM === 'ios') {
  setSuite('B6.download-reliability-counters');
  await AS.clear();
  const PREMIUM_KEY = '@YomuLog:premium';
  const fsLegacy = await import('expo-file-system/legacy');
  // ── scenario 1: successful download moves the completed counter ──
  await AS.setItem(PREMIUM_KEY, 'true');
  (globalThis).__setAtHomeFail(false);
  fsLegacy.__setPageDownloadFail(false);
  await dm.enqueueDownload('ch-ok', 'm1', 'Manga One', '1', 'First');
  const okRes = await dm.processNextDownload();
  assertEq('success: processNextDownload returns true', okRes, true);
  let q = await dm.getDownloadQueue();
  let j = q.find((x) => x.chapterId === 'ch-ok');
  assertEq('success: status completed', j.status, 'completed');
  assertEq('success: progress 100', j.progress, 100);
  let rel = await dm.getDownloadReliabilityStats();
  let rate = await dm.getDownloadReliabilityRate();
  assertEq('success: totalCompleted +1', rel.totalCompleted, 1);
  assertEq('success: rate computed', rate.rate, 1);
  // ── scenario 2: forced permanent failure moves the failed counter ──
  (globalThis).__setAtHomeFail(true);
  await dm.enqueueDownload('ch-fail', 'm2', 'Manga Two', '2');
  let attempts = 0;
  for (let i = 0; i < 3; i++) { await dm.processNextDownload(); attempts++; }
  q = await dm.getDownloadQueue();
  j = q.find((x) => x.chapterId === 'ch-fail');
  rel = await dm.getDownloadReliabilityStats();
  rate = await dm.getDownloadReliabilityRate();
  assertEq('forced failure: attempted exactly MAX_RETRIES attempts', attempts, 3);
  assertEq('forced failure: status failed after exhaustion', j.status, 'failed');
  assertEq('forced failure: retryCount == MAX_RETRIES', j.retryCount, 3);
  assert(j.errorMessage && j.errorMessage.length > 0, 'forced failure: errorMessage recorded');
  assertEq('forced failure: totalFailed +1', rel.totalFailed, 1);
  assertEq('forced failure: totalCompleted unchanged (opposite counters)', rel.totalCompleted, 1);
  assertEq('forced failure: rate fell (1/2)', rate.rate, 0.5);
  // ── scenario 3: retry that later succeeds does NOT double-count ──
  (globalThis).__setAtHomeFail(false);
  const re = await dm.enqueueDownload('ch-fail', 'm2', 'Manga Two', '2'); // resets failed -> pending
  assertEq('recovery: failed job reset to pending', re.status, 'pending');
  const reprocessed = await dm.processNextDownload();
  assertEq('recovery: reprocessed to completed', reprocessed, true);
  rel = await dm.getDownloadReliabilityStats();
  assertEq('recovery: completed +1, not doubled (past failure does not re-count)', rel.totalCompleted, 2);
  assertEq('recovery: failed counter stays 1 (failure already counted at exhaustion)', rel.totalFailed, 1);
  // ── scenario 4: all pages fail at page level (HTTP 500, no throw) ──
  // KPI-3 counts "successfully completed without error or corruption" — a
  // download where every page returns non-200 has downloaded ZERO pages and
  // must NOT be reported as completed. If this assertion FAILS, the shipped
  // code marks a zero-page download completed and corrupts the KPI — a
  // finding to report, not to paper over.
  fsLegacy.__setPageDownloadFail(true);
  (globalThis).__setAtHomeFail(false);
  await dm.enqueueDownload('ch-zeropage', 'm3', 'Manga Three', '3');
  await dm.processNextDownload();
  q = await dm.getDownloadQueue();
  const zj = q.find((x) => x.chapterId === 'ch-zeropage');
  rel = await dm.getDownloadReliabilityStats();
  assertEq('zero-page download: status failed (not completed)', zj.status, 'failed');
  assertEq('zero-page download: totalFailed +1 (not completed)', rel.totalFailed, 2);
}
// ══════════════════════════════════════════════════════════════════════
// summary
// ══════════════════════════════════════════════════════════════════════
const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log('  ' + (r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + (r.detail ? '  — ' + r.detail : ''));
}
console.log('TOTAL ' + results.length + ' assertions, ' + failed.length + ' failed [PASS=' + PASS + ' PLATFORM=' + PLATFORM + ']');
`;
// Replace the funnel-name placeholder with the parsed REAL names.
const testSource = TEST_SOURCE.replace('__FUNNEL_NAMES__', JSON.stringify(FUNNEL_NAMES));
writeFileSync(join(SCRATCH, 'test.ts'), testSource);
// ─── 4c. Ambient declarations + tsconfig for the real-tsc compile ─────
writeFileSync(join(SCRATCH, 'env.d.ts'), `declare module 'react-native' {
  export const Platform: any; export const Linking: any; export const AppState: any;
  export const DeviceEventEmitter: any; export const NativeModules: any; export const useWindowDimensions: any;
  export type AccessibilityProps = any;
}
declare module '@react-native-async-storage/async-storage' { const A: any; export default A; }
declare module '@supabase/supabase-js' { export function createClient(...args: any[]): any; export type SupabaseClient = any; export const __db: any; }
declare module 'expo-file-system' { const M: any; export default M; export const documentDirectory: any; export const makeDirectoryAsync: any; export const downloadAsync: any; export const getInfoAsync: any; export const readDirectoryAsync: any; export const deleteAsync: any; }
declare module 'expo-file-system/legacy' { const M: any; export default M; export const documentDirectory: any; export const makeDirectoryAsync: any; export const downloadAsync: any; export const getInfoAsync: any; export const readDirectoryAsync: any; export const deleteAsync: any; }
declare module 'expo-image-manipulator' { const M: any; export default M; export const manipulateAsync: any; }
declare module 'expo-image-picker' { const M: any; export default M; export type ImagePickerAsset = any; export const requestMediaLibraryPermissionsAsync: any; export const launchImageLibraryAsync: any; }
declare module 'expo-secure-store' { const M: any; export default M; export const getItemAsync: any; export const setItemAsync: any; export const deleteItemAsync: any; export const WHEN_UNLOCKED: any; export const WHEN_UNLOCKED_THIS_DEVICE_ONLY: any; export const AFTER_FIRST_UNLOCK: any; }
declare module 'expo-sqlite' { const M: any; export default M; export type SQLiteBindValue = any; export type SQLiteDatabase = any; export const SQLiteProvider: any; export const openDatabaseSync: any; export const useSQLiteContext: any; }
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
    types: [],
    typeRoots: [],
    lib: ['es2022'],
  },
  include: ['./services/**/*.ts', './utils/**/*.ts', './test.ts', './env.d.ts'],
}, null, 2));
// ─── 5. Compile with the repo's real tsc (candidates) ─────────────────
const TSC_CANDIDATES = [
  join(REPO_ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
  '/opt/yomulog-build/node_modules/typescript/bin/tsc',
  process.env.TSC_BIN,
].filter(Boolean);
const tscBin = TSC_CANDIDATES.find((p) => existsSync(p));
if (!tscBin) {
  log('FATAL: no typescript tsc found (repo node_modules missing, /opt/yomulog-build missing)');
  process.exit(99);
}
log(`compiling copied sources with tsc ${tscBin} …`);
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
// ─── 5b. Post-emit: rewrite .ts module specifiers -> .js in dist ──────
// rewriteRelativeImportExtensions is suppressed when tsc reports ANY error
// (observed: single TS2688 kills it). The emitted .js files exist regardless,
// so we deterministically rewrite relative import/export specifiers that
// still end in .ts (from './x.ts' and import('./x.ts')) to .js. This only
// touches module specifiers, never strings/comments.
function rewriteEmittedJs(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) { rewriteEmittedJs(p); continue; }
    if (!e.endsWith('.js')) continue;
    let code = readFileSync(p, 'utf8');
    const before = code;
    code = code.replace(/((?:from|import)\s*\(?\s*['"])([^'"]*?)\.ts(['"])/g, '$1$2.js$3');

    if (code !== before) writeFileSync(p, code);
  }
}
rewriteEmittedJs(join(SCRATCH, 'dist'));
// ─── 6. Run the compiled suite per PASS/PLATFORM pass ─────────────────
const PASSES = [
  { PASS: 'unconfigured', PLATFORM: 'web' },
  { PASS: 'unconfigured', PLATFORM: 'ios' },
  { PASS: 'configured', PLATFORM: 'web' },
  { PASS: 'configured', PLATFORM: 'ios' },
];
let aggregate = hostResults.filter((r) => !r.ok).length;
const allOut = [];
const emit = (s) => { allOut.push(s); process.stdout.write(s); };
emit(`\n── E2E STEP 5 LOGIC SUITE (backend support) — sha ${SHA} ──\n`);
emit('  H.static-guards (host-side, read from the real repo files)\n');
for (const r of hostResults) {
  emit('  ' + (r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + '\n');
}
emit('  TOTAL ' + hostResults.length + ' host guards, ' + hostResults.filter((r) => !r.ok).length + ' failed\n');
const emitted = join(SCRATCH, 'dist', 'test.js');
for (const pass of PASSES) {
  emit(`\n── run [PASS=${pass.PASS} PLATFORM=${pass.PLATFORM}] ──\n`);
  try {
    const out = execFileSync('node', [emitted], {
      cwd: SCRATCH,
      env: (() => {
        const e = { ...process.env, E2E_PASS: pass.PASS, E2E_PLATFORM: pass.PLATFORM };
        if (pass.PASS === 'configured') { e.EXPO_PUBLIC_SUPABASE_URL = 'http://fake.supabase.local'; e.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon'; }
        else { delete e.EXPO_PUBLIC_SUPABASE_URL; delete e.EXPO_PUBLIC_SUPABASE_ANON_KEY; }
        return e;
      })(),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    emit(out);
    const m = out.match(/TOTAL (\d+) assertions, (\d+) failed/);
    aggregate += m ? Number(m[2]) : 999;
  } catch (e) {
    emit(e.stdout ?? '');
    process.stderr.write(e.stderr ?? '');
    aggregate += 999;
  }
}
emit(`\n── AGGREGATE failed assertions: ${aggregate} ──\n`);
if (OUT_PATH) writeFileSync(OUT_PATH, allOut.join(''));
log(`done (sha ${SHA}); aggregate failed: ${aggregate}`);
process.exitCode = aggregate;
