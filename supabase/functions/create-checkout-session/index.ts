/**
 * create-checkout-session/index.ts
 * Supabase Edge Function — creates a Stripe Checkout session.
 *
 * Called from the browser with:
 *   POST /functions/v1/create-checkout-session
 *   Authorization: Bearer <user JWT>
 *   Body: { priceId: "price_xxx", successUrl: "...", cancelUrl: "..." }
 *
 * Deploy:
 *   supabase functions deploy create-checkout-session
 */

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const ALLOWED_ORIGINS = [
  'https://hawaiiwellness.net',
  'https://www.hawaiiwellness.net',
  'http://localhost:5173',
  'http://localhost:4173',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  // Verify auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401, origin);

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401, origin);

  const { priceId, successUrl, cancelUrl } = await req.json();
  if (!priceId || !successUrl || !cancelUrl) {
    return json({ error: 'Missing required fields' }, 400, origin);
  }

  // Validate priceId is one of the known price IDs (strict whitelist)
  const VALID_PRICE_IDS = [
    'price_1T7lnYAmznBlrx8sZkolChSm', // Practitioner Premium $49/mo
    'price_1T7loEAmznBlrx8s5j92qxX8', // Practitioner Featured $129/mo
    'price_1TCA70AmznBlrx8sSVyl2HtA', // Center Premium $79/mo
    'price_1TCA7KAmznBlrx8s2IOtOThI', // Center Featured $199/mo
  ];
  if (typeof priceId !== 'string' || !VALID_PRICE_IDS.includes(priceId)) {
    return json({ error: 'Invalid price ID' }, 400, origin);
  }

  // Active launch promo — ALOHA20 (20% off for 12 months)
  const PROMO_ACTIVE = Deno.env.get('PROMO_ACTIVE') === 'true';
  const PROMO_COUPON_ID = 'o1QERmQL';

  // Validate URLs are absolute and from an allowed origin
  try {
    const success = new URL(successUrl);
    const cancel  = new URL(cancelUrl);
    if (
      !ALLOWED_ORIGINS.some(o => success.origin === o) ||
      !ALLOWED_ORIGINS.some(o => cancel.origin  === o)
    ) {
      return json({ error: 'URLs must be from an allowed origin' }, 400, origin);
    }
  } catch {
    return json({ error: 'Invalid URLs provided' }, 400, origin);
  }

  try {
    // Look up or create Stripe customer
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
      // Apply ALOHA20 launch promo automatically when active
      ...(PROMO_ACTIVE ? { discounts: [{ coupon: PROMO_COUPON_ID }] } : { allow_promotion_codes: true }),
    });

    return json({ url: session.url }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    console.error('Checkout session error:', message);
    return json({ error: message }, 500, origin);
  }
});

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}
