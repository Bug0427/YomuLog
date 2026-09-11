// supabase/functions/stripe-portal/index.ts — Stripe Customer Portal session.
//
// Called by the app's Manage Subscription screen (services/stripeService.ts →
// openCustomerPortal) with `{ userId }`. Looks up the user's
// stripe_customer_id from user_subscriptions, creates a Customer Portal
// session via the Stripe REST API, and returns `{ url }`.
//
// Deploy:
//   supabase functions deploy stripe-portal --project-ref <your-project>
//
// Required secrets (supabase secrets set):
//   STRIPE_SECRET_KEY   — sk_live_... (or sk_test_... for testing)
//   SUPABASE_URL        — https://<project-ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY — sb_secret_... (server-side only, never in app)
//
// Request:  POST { "userId": "<supabase-auth-uuid>" } (auth JWT required)
// Response: 200 { "url": "https://billing.stripe.com/..." }
//           4xx/5xx { "error": "<message>" }

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
    // 1) Look up the Stripe customer id for this user (service role bypasses RLS).
    const rowRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=stripe_customer_id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    if (!rowRes.ok) return json(502, { error: 'Failed to look up subscription' });
    const rows = (await rowRes.json()) as Array<{ stripe_customer_id: string | null }>;
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) return json(404, { error: 'No Stripe customer found for user' });
    // 2) Create a Customer Portal session (Stripe REST API, no SDK needed).
    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        return_url: 'yomulog://settings',
      }).toString(),
    });
    if (!portalRes.ok) {
      const detail = await portalRes.text().catch(() => '');
      return json(502, { error: `Stripe portal error: ${detail.slice(0, 200)}` });
    }
    const session = (await portalRes.json()) as { url?: string };
    if (!session.url) return json(502, { error: 'No portal URL returned' });
    return json(200, { url: session.url });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : 'Portal failed' });
  }
});
