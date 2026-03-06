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

Deno.serve(async (req) => {
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

  // Validate priceId format (should start with 'price_')
  if (typeof priceId !== 'string' || !priceId.startsWith('price_')) {
    return json({ error: 'Invalid price ID format' }, 400);
  }

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
  });

  return json({ url: session.url });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
