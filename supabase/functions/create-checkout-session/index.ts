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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://hawaiiwellness.net',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Verify auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

  const { priceId, successUrl, cancelUrl } = await req.json();
  if (!priceId || !successUrl || !cancelUrl) {
    return json({ error: 'Missing required fields' }, 400);
  }

  // Validate priceId is one of the known price IDs (strict whitelist)
  const VALID_PRICE_IDS = [
    'price_1T7lnYAmznBlrx8sZkolChSm', // Practitioner Premium $49/mo
    'price_1T7loEAmznBlrx8s5j92qxX8', // Practitioner Featured $129/mo
    'price_1TCA70AmznBlrx8sSVyl2HtA', // Center Premium $79/mo
    'price_1TCA7KAmznBlrx8s2IOtOThI', // Center Featured $199/mo
  ];
  if (typeof priceId !== 'string' || !VALID_PRICE_IDS.includes(priceId)) {
    return json({ error: 'Invalid price ID' }, 400);
  }

  // Active launch promo — ALOHA20 (20% off for 12 months)
  const PROMO_ACTIVE = Deno.env.get('PROMO_ACTIVE') === 'true';
  const PROMO_COUPON_ID = 'o1QERmQL';

  // Validate URLs are absolute and from same origin
  try {
    const success = new URL(successUrl);
    const cancel = new URL(cancelUrl);
    const origin = new URL(req.headers.get('origin') || '', req.url).origin;
    if (success.origin !== origin || cancel.origin !== origin) {
      return json({ error: 'URLs must be from the same origin' }, 400);
    }
  } catch {
    return json({ error: 'Invalid URLs provided' }, 400);
  }

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

  return json({ url: session.url });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
