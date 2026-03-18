/**
 * create-checkout-session/index.ts
 * Supabase Edge Function — creates a Stripe Checkout session.
 *
 * Called from the browser via supabase.functions.invoke('create-checkout-session', { body: { priceId } })
 *
 * Deploy:
 *   supabase functions deploy create-checkout-session
 */

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_PRICE_IDS = [
  'price_1T7lnYAmznBlrx8sZkolChSm', // Practitioner Premium $49/mo
  'price_1T7loEAmznBlrx8s5j92qxX8', // Practitioner Featured $129/mo
  'price_1TCA70AmznBlrx8sSVyl2HtA', // Center Premium $79/mo
  'price_1TCA7KAmznBlrx8s2IOtOThI', // Center Featured $199/mo
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ── Guard env vars up front so missing secrets surface as clean errors ──
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY is missing from Supabase secrets');
      return json({ error: 'Stripe configuration error: STRIPE_SECRET_KEY not set' }, 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRole) {
      console.error('Missing Supabase configuration', { supabaseUrl: !!supabaseUrl, supabaseServiceRole: !!supabaseServiceRole });
      return json({ error: 'Supabase configuration error' }, 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

    // ── Auth: verify JWT via admin client (service role can verify any JWT) ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      console.error('Auth error', { authErr: authErr?.message, hasUser: !!user });
      return json({ error: authErr?.message ?? 'Unauthorized' }, 401);
    }

    // ── Validate request body ──────────────────────────────────────────────
    const body = await req.json();
    const { priceId, successUrl, cancelUrl } = body;

    if (!priceId || !successUrl || !cancelUrl) {
      return json({ error: 'Missing required fields: priceId, successUrl, cancelUrl' }, 400);
    }

    if (!VALID_PRICE_IDS.includes(priceId)) {
      return json({ error: `Invalid priceId: ${priceId}` }, 400);
    }

    // ── Promo ──────────────────────────────────────────────────────────────
    const PROMO_ACTIVE = Deno.env.get('PROMO_ACTIVE') === 'true';
    const PROMO_COUPON_ID = 'o1QERmQL';

    // ── Look up or create Stripe customer ──────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('user_profiles')
        .upsert({ id: user.id, stripe_customer_id: customerId });
    }

    // ── Create Stripe Checkout session ─────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      ...(PROMO_ACTIVE
        ? { discounts: [{ coupon: PROMO_COUPON_ID }] }
        : { allow_promotion_codes: true }),
    });

    return json({ url: session.url });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('create-checkout-session error:', { message, stack });
    return json({ error: message || 'Internal server error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
