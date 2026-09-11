// supabase/functions/stripe-cancel/index.ts — cancel-at-period-end.
//
// Called by the app's Manage Subscription screen (services/stripeService.ts →
// cancelSubscription) with `{ userId }`. Looks up the user's
// stripe_subscription_id, sets cancel_at_period_end=true via the Stripe REST
// API, and mirrors cancel_at_period_end=true onto the user_subscriptions row
// (via the existing upsert_subscription function, migration 006).
//
// Deploy:
//   supabase functions deploy stripe-cancel --project-ref <your-project>
//
// Required secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (same as stripe-portal).
//
// Request:  POST { "userId": "<supabase-auth-uuid>" } (auth JWT required)
// Response: 200 { "success": true } / 4xx/5xx { "error": "<message>" }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const { userId } = (await req.json()) as { userId?: string };
    if (!userId) return json(400, { error: 'Missing userId' });
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SERVICE_KEY) {
      return json(500, { error: 'Server misconfigured (missing secrets)' });
    }
    const svcHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
    // 1) Look up the subscription id for this user.
    const rowRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=user_id,stripe_customer_id,stripe_subscription_id,plan,is_active,current_period_end`,
      { headers: svcHeaders },
    );
    if (!rowRes.ok) return json(502, { error: 'Failed to look up subscription' });
    const rows = (await rowRes.json()) as Array<{
      user_id: string; stripe_customer_id: string | null;
      stripe_subscription_id: string | null; plan: string | null;
      is_active: boolean; current_period_end: string | null;
    }>;
    const subId = rows[0]?.stripe_subscription_id;
    if (!subId) return json(404, { error: 'No active Stripe subscription for user' });
    // 2) Flip cancel_at_period_end on the Stripe subscription.
    const stripeRes = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subId)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ cancel_at_period_end: 'true' }).toString(),
    });
    if (!stripeRes.ok) {
      const detail = await stripeRes.text().catch(() => '');
      return json(502, { error: `Stripe cancel error: ${detail.slice(0, 200)}` });
    }
    // 3) Mirror the flag onto the local row (keeps the app's Manage screen honest
    //    even before the customer.subscription.updated webhook lands).
    const cur = rows[0];
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_subscription`, {
      method: 'POST',
      headers: { ...svcHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_user_id: cur.user_id,
        p_stripe_customer_id: cur.stripe_customer_id,
        p_stripe_subscription_id: cur.stripe_subscription_id,
        p_plan: cur.plan ?? 'monthly',
        p_is_active: cur.is_active,
        p_current_period_end: cur.current_period_end,
        p_cancel_at_period_end: true,
      }),
    });
    if (!rpcRes.ok) return json(502, { error: 'Stripe updated; local mirror failed (webhook will reconcile)' });
    return json(200, { success: true });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : 'Cancel failed' });
  }
});
