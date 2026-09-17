// supabase/functions/stripe-webhook/index.ts — Stripe → Supabase entitlement bridge.
//
// Stripe Dashboard → Developers → Webhooks → Add endpoint:
//   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// Events to send: checkout.session.completed, customer.subscription.created,
// customer.subscription.updated, customer.subscription.deleted,
// invoice.payment_failed.
//
// Verifies the Stripe-Signature header (Web Crypto SubtleCrypto, no SDK),
// resolves the Supabase user id (subscription metadata `supabase_user_id`,
// falling back to customer email → auth admin lookup), and upserts
// user_subscriptions via the migration-006 upsert_subscription RPC.
//
// Required secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

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

// Verify Stripe webhook signature (https://docs.stripe.com/webhooks/signature).
async function verifySignature(raw: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;
  // 5-minute timestamp tolerance (also enforced server-side by Stripe).
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === v1;
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
    const event = JSON.parse(raw) as { type: string; data: { object: any } };
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
      }),
    });
    if (!rpcRes.ok) return json(502, { error: 'Entitlement upsert failed' });
    return json(200, { received: true });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : 'Webhook failed' });
  }
});
