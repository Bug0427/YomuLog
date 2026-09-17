// scripts/test-edge-functions.mjs: exercises the three Stripe Supabase Edge Functions with a Deno
// stub + mocked fetch. No network, no Deno runtime, no dependencies.
// Run:  node --experimental-strip-types scripts/test-edge-functions.mjs
import { createHmac } from 'node:crypto';

const FUNC_ROOT = new URL('../supabase/functions', import.meta.url).pathname;
const SUPABASE_URL = 'https://proj.supabase.co';
const SERVICE_KEY = 'service-role-key';
const STRIPE_KEY = 'sk_test_123';
const WEBHOOK_SECRET = 'whsec_test_secret';
const ACCESS_TOKEN = 'user-access-token';
const USER_ID = '11111111-2222-3333-4444-555555555555';
const OTHER_USER_ID = '99999999-8888-7777-6666-555555555555';

const ENV = {
  STRIPE_SECRET_KEY: STRIPE_KEY,
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
};

// ── Deno stub ─────────────────────────────────────────────────────────
const handlers = new Map();
let currentFile = '';
globalThis.Deno = {
  env: { get: (k) => ENV[k] },
  serve: (handler) => { handlers.set(currentFile, handler); },
};

// ── fetch mock ────────────────────────────────────────────────────────
const calls = [];
let stripeSubLookup = {};

function res(status, body) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const recorded = { url: u, method: init.method ?? 'GET', body: init.body ?? null };
  calls.push(recorded);
  if (u.startsWith(`${SUPABASE_URL}/auth/v1/user`)) {
    const auth = (init.headers?.Authorization ?? init.headers?.authorization ?? '');
    if (auth === `Bearer ${ACCESS_TOKEN}`) return res(200, { id: USER_ID, email: 'a@b.c' });
    return res(401, { message: 'invalid token' });
  }
  if (u.includes('/rest/v1/user_subscriptions')) {
    return res(200, [{
      user_id: USER_ID,
      stripe_customer_id: 'cus_123',
      stripe_subscription_id: 'sub_123',
      plan: 'monthly',
      is_active: true,
      current_period_end: '2026-10-01T00:00:00.000Z',
    }]);
  }
  if (u === 'https://api.stripe.com/v1/billing_portal/sessions') {
    return res(200, { url: 'https://billing.stripe.com/session/abc' });
  }
  if (u.startsWith('https://api.stripe.com/v1/subscriptions/')) {
    if (stripeSubLookup[u]) return res(200, stripeSubLookup[u]);
    return res(200, { id: 'sub_123', status: 'active', cancel_at_period_end: true });
  }
  if (u.includes('/rest/v1/rpc/upsert_subscription')) {
    return res(200, null);
  }
  return res(404, { error: `unmocked ${u}` });
};

async function load(fnName) {
  currentFile = fnName;
  await import(`${FUNC_ROOT}/${fnName}/index.ts`);
  return handlers.get(fnName);
}

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass += 1; console.log(`  PASS  ${name}`); }
  else { fail += 1; console.log(`  FAIL  ${name} ${detail}`); }
}

function signedHeader(raw, t = Math.floor(Date.now() / 1000), secret = WEBHOOK_SECRET) {
  const sig = createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  return `t=${t},v1=${sig}`;
}

// ── stripe-portal ─────────────────────────────────────────────────────
const portal = await load('stripe-portal');
const portalReq = (headers, body) => new Request(`${SUPABASE_URL}/functions/v1/stripe-portal`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

console.log('stripe-portal');
let r = await portal(portalReq({}, { userId: USER_ID }));
check('no Authorization header -> 401', r.status === 401, `got ${r.status}`);
r = await portal(portalReq({ Authorization: 'Bearer wrong-token' }, { userId: USER_ID }));
check('invalid token -> 401', r.status === 401, `got ${r.status}`);
r = await portal(portalReq({ Authorization: `Bearer ${ACCESS_TOKEN}` }, { userId: OTHER_USER_ID }));
check('body userId != JWT subject -> 403', r.status === 403, `got ${r.status}`);
calls.length = 0;
r = await portal(portalReq({ Authorization: `Bearer ${ACCESS_TOKEN}` }, { userId: USER_ID }));
const portalBody = await r.json();
check('valid token + own userId -> 200 + url', r.status === 200 && !!portalBody.url, JSON.stringify(portalBody));
check('lookup used JWT subject, not body',
  calls.some((c) => c.url.includes(`user_id=eq.${USER_ID}`)), JSON.stringify(calls.map((c) => c.url)));
r = await portal(portalReq({ Authorization: `Bearer ${ACCESS_TOKEN}` }, {}));
check('empty body still works (JWT is authoritative)', r.status === 200, `got ${r.status}`);

// ── stripe-cancel ─────────────────────────────────────────────────────
const cancel = await load('stripe-cancel');
const cancelReq = (headers, body) => new Request(`${SUPABASE_URL}/functions/v1/stripe-cancel`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});
console.log('stripe-cancel');
r = await cancel(cancelReq({}, { userId: USER_ID }));
check('no Authorization header -> 401', r.status === 401, `got ${r.status}`);
r = await cancel(cancelReq({ Authorization: `Bearer ${ACCESS_TOKEN}` }, { userId: OTHER_USER_ID }));
check('body userId != JWT subject -> 403', r.status === 403, `got ${r.status}`);
calls.length = 0;
r = await cancel(cancelReq({ Authorization: `Bearer ${ACCESS_TOKEN}` }, { userId: USER_ID }));
const cancelBody = await r.json();
check('valid token + own userId -> 200 success', r.status === 200 && cancelBody.success === true, JSON.stringify(cancelBody));
const rpcCall = calls.find((c) => c.url.includes('/rpc/upsert_subscription'));
const rpcPayload = rpcCall ? JSON.parse(rpcCall.body) : null;
check('mirror RPC carries p_event_created_at: null (explicit user action)',
  rpcPayload?.p_event_created_at === null, JSON.stringify(rpcPayload));

// ── stripe-webhook ────────────────────────────────────────────────────
const webhook = await load('stripe-webhook');
const EVENT_CREATED = 1780000000; // fixed
const event = {
  id: 'evt_1',
  type: 'customer.subscription.updated',
  created: EVENT_CREATED,
  data: { object: { object: 'subscription', id: 'sub_123', status: 'active', cancel_at_period_end: false, customer: 'cus_123', current_period_end: EVENT_CREATED + 2592000, metadata: { supabase_user_id: USER_ID }, items: { data: [{ price: { lookup_key: 'yomulog_monthly' } }] } } },
};
const eventRaw = JSON.stringify(event);
const hookReq = (sigHeader, raw) => new Request(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': sigHeader }, body: raw,
});

console.log('stripe-webhook (signature)');
const now = Math.floor(Date.now() / 1000);
let hdr = signedHeader(eventRaw, now);
calls.length = 0;
r = await webhook(hookReq(hdr, eventRaw));
check('single valid v1 -> 200', r.status === 200, `got ${r.status}`);
const hookRpc = calls.find((c) => c.url.includes('/rpc/upsert_subscription'));
const hookPayload = hookRpc ? JSON.parse(hookRpc.body) : null;
check('event.created forwarded as p_event_created_at',
  hookPayload?.p_event_created_at === new Date(EVENT_CREATED * 1000).toISOString(),
  JSON.stringify(hookPayload));

const good = createHmac('sha256', WEBHOOK_SECRET).update(`${now}.${eventRaw}`).digest('hex');
r = await webhook(hookReq(`t=${now},v1=${good},v1=${'f'.repeat(64)}`, eventRaw));
check('multiple v1, valid first -> 200', r.status === 200, `got ${r.status}`);
r = await webhook(hookReq(`t=${now},v1=${'f'.repeat(64)},v1=${good}`, eventRaw));
check('multiple v1, valid second -> 200 (rotation)', r.status === 200, `got ${r.status}`);
r = await webhook(hookReq(`t=${now},v1=${good}`, eventRaw + ' '));
check('body tampered -> 400', r.status === 400, `got ${r.status}`);
r = await webhook(hookReq(signedHeader(eventRaw, now, 'whsec_wrong'), eventRaw));
check('wrong secret -> 400', r.status === 400, `got ${r.status}`);
r = await webhook(hookReq(signedHeader(eventRaw, now - 600), eventRaw));
check('stale timestamp (>5min) -> 400', r.status === 400, `got ${r.status}`);
r = await webhook(hookReq('', eventRaw));
check('missing signature header -> 400', r.status === 400, `got ${r.status}`);
r = await webhook(hookReq(`t=${now}`, eventRaw));
check('header without v1 -> 400', r.status === 400, `got ${r.status}`);

console.log('stripe-webhook (checkout.session.completed → subscription fetch)');
const checkoutEvent = {
  id: 'evt_2', type: 'checkout.session.completed', created: EVENT_CREATED,
  data: { object: { object: 'checkout.session', id: 'cs_1', subscription: 'sub_999', client_reference_id: USER_ID } },
};
const checkoutRaw = JSON.stringify(checkoutEvent);
stripeSubLookup = { 'https://api.stripe.com/v1/subscriptions/sub_999': { id: 'sub_999', status: 'active', customer: 'cus_123', current_period_end: EVENT_CREATED + 1000, metadata: { supabase_user_id: USER_ID }, items: { data: [{ price: { lookup_key: 'yomulog_yearly' } }] } } };
calls.length = 0;
r = await webhook(hookReq(signedHeader(checkoutRaw, now), checkoutRaw));
const checkoutRpc = calls.find((c) => c.url.includes('/rpc/upsert_subscription'));
const checkoutPayload = checkoutRpc ? JSON.parse(checkoutRpc.body) : null;
check('checkout.session.completed -> 200 + plan from yearly lookup key',
  r.status === 200 && checkoutPayload?.p_plan === 'yearly', JSON.stringify(checkoutPayload));

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
