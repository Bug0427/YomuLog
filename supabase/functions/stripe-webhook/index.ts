// supabase/functions/stripe-webhook/index.ts — Stripe → Supabase entitlement bridge.
//
// Stripe Dashboard → Developers → Webhooks → Add endpoint:
//   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// Events to send: checkout.session.completed, customer.subscription.created,
// customer.subscription.updated, customer.subscription.deleted,
// invoice.payment_failed.
//
// Verifies the Stripe-Signature header (Web Crypto SubtleCrypto, no SDK — every
// `v1` signature in the header is checked with a constant-time comparison, so a
// secret rotation that sends multiple signatures is accepted: PR #239 review
// finding 3), resolves the Supabase user id (subscription metadata
// `supabase_user_id`, falling back to customer email → auth admin lookup), and
// upserts user_subscriptions via the migration-006 upsert_subscription RPC.
//
// Out-of-order protection (PR #239 review finding 4): the event's `created`
// timestamp is forwarded as p_event_created_at; migration 006 stores it as a
// high-water mark and ignores events older than the row's stored value, so a
// delayed/retried invoice.payment_failed or subscription.deleted cannot revoke
// (or restore) entitlements that a newer event already settled.
//
// Required secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.
//
// Deploy (--no-verify-jwt is REQUIRED — the caller is Stripe, which sends a
// Stripe-Signature header, never a Supabase JWT; requiring one would 401 every
// entitlement write):
//   supabase functions deploy stripe-webhook --no-verify-jwt --project-ref <your-project>

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

async function stripeGet(secret: string, path: string): Promise<any> {
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) throw new Error(`Stripe GET ${path}: ${res.status}`);
  return res.json();
}

/** Length-checked, value-independent hex comparison (no early exit). */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Verify Stripe webhook signature (https://docs.stripe.com/webhooks/signature).
// Header format: `t=<unix>[,v1=<hex>...]` — Stripe emits more than one `v1`
// value while a signing secret is being rotated, and any of them may be the
// valid one, so all candidates are compared.
async function verifySignature(raw: string, header: string, secret: string): Promise<boolean> {
  const parts = header.split(',').map((p) => p.trim());
  const t = parts.find((p) => p.startsWith('t='))?.slice(2);
  const candidates = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!t || candidates.length === 0) return false;
  const ts = Number(t);
  if (!Number.isFinite(ts)) return false;
  // 5-minute timestamp tolerance (also enforced server-side by Stripe).
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`));
  const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return candidates.some((candidate) => timingSafeEqualHex(candidate, expected));
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
  const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!STRIPE_SECRET_KEY || !WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_KEY) {
    return json(500, { error: 'Server misconfigured (missing secrets)' });
  }
  const raw = await req.text();
  const sigHeader = req.headers.get('stripe-signature') ?? '';
  if (!(await verifySignature(raw, sigHeader, WEBHOOK_SECRET))) {
    return json(400, { error: 'Invalid signature' });
  }
  const svcHeaders = {
    apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json',
  };
  try {
    const event = JSON.parse(raw) as {
      type: string; created?: number; data: { object: any };
    };
    const obj = event.data.object ?? {};
    // Only subscription-lifecycle events carry entitlement state.
    const HANDLED = new Set([
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed',
    ]);
    if (!HANDLED.has(event.type)) return json(200, { received: true });
    // Resolve the full subscription object for every event shape.
    // checkout.session.completed carries subscription id only → fetch it.
    let sub: any = obj.object === 'subscription' ? obj : null;
    const subId: string | undefined = sub?.id ?? obj.subscription;
    if (!sub && subId) sub = await stripeGet(STRIPE_SECRET_KEY, `/v1/subscriptions/${subId}`);
    if (!sub) return json(200, { received: true });
    // Map subscription → plan from the price lookup key (set in Dashboard).
    const priceKey: string = sub.items?.data?.[0]?.price?.lookup_key ?? '';
    const plan = priceKey.includes('yearly') ? 'yearly' : 'monthly';
    const isActive =
      event.type === 'invoice.payment_failed' ? false
      : event.type === 'customer.subscription.deleted' ? false
      : ['active', 'trialing'].includes(sub.status);
    const periodEnd = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;
    // Ordering high-water mark: Stripe's own event creation time (unix seconds).
    const eventCreatedAt =
      typeof event.created === 'number' && Number.isFinite(event.created)
        ? new Date(event.created * 1000).toISOString()
        : null;
    // Resolve the Supabase user: prefer the id stamped at checkout time.
    let supabaseUserId: string | undefined = sub.metadata?.supabase_user_id;
    if (!supabaseUserId && event.type === 'checkout.session.completed') {
      supabaseUserId = obj.metadata?.supabase_user_id ?? obj.client_reference_id;
    }
    // Fallback: match the Stripe customer email to an Auth user.
    if (!supabaseUserId) {
      const customer = sub.customer
        ? await stripeGet(STRIPE_SECRET_KEY, `/v1/customers/${sub.customer}`)
        : null;
      const email: string | undefined = customer?.email;
      if (email) {
        const adminRes = await fetch(
          `${SUPABASE_URL}/auth/v1/admin/users`,
          { headers: svcHeaders },
        );
        if (adminRes.ok) {
          const { users } = (await adminRes.json()) as { users: Array<{ id: string; email?: string }> };
          supabaseUserId = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
        }
      }
    }
    if (!supabaseUserId) return json(200, { received: true, note: 'no user match; ignored' });
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_subscription`, {
      method: 'POST',
      headers: svcHeaders,
      body: JSON.stringify({
        p_user_id: supabaseUserId,
        p_stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
        p_stripe_subscription_id: sub.id,
        p_plan: plan,
        p_is_active: isActive,
        p_current_period_end: periodEnd,
        p_cancel_at_period_end: sub.cancel_at_period_end ?? false,
        p_event_created_at: eventCreatedAt,
      }),
    });
    if (!rpcRes.ok) return json(502, { error: 'Entitlement upsert failed' });
    return json(200, { received: true });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : 'Webhook failed' });
  }
});
