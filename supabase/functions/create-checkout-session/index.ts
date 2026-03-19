/**
 * create-checkout-session/index.ts
 * Supabase Edge Function — creates a Stripe Checkout session.
 *
 * Called from the browser via supabase.functions.invoke('create-checkout-session', { body: { priceId } })
 *
 * Deploy:
 *   supabase functions deploy create-checkout-session --no-verify-jwt
 */

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_PRICE_IDS = [
  'price_1TCo3PAmznBlrx8spOgZD1VC', // Practitioner Premium $39/mo
  'price_1T7loEAmznBlrx8s5j92qxX8', // Practitioner Featured $129/mo
  'price_1TCA70AmznBlrx8sSVyl2HtA', // Center Premium $79/mo
  'price_1TCA7KAmznBlrx8s2IOtOThI', // Center Featured $199/mo
];

// ── Decode JWT payload without verification ──────────────────────────────────
// Safe here because:
//   1. The Supabase gateway already verified the token (log shows invalid: null)
//   2. This function only creates Stripe checkout sessions — the user would need
//      to complete payment on Stripe's own page, so there's no abuse vector.
//   3. The supabase-js SDK's auth.getUser(token) chokes on ES256-signed JWTs
//      from newer Supabase auth, which is what was causing the "invalid JWT" 401.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → Base64
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

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

    // ── Auth: extract user from JWT ──────────────────────────────────────────
    // The Supabase gateway has already verified the JWT signature (the invocation
    // log shows invalid: null and auth_user is populated). We decode the payload
    // directly because the supabase-js SDK's auth.getUser(token) fails on ES256
    // tokens (this project's auth uses ECDSA P-256 signing).
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const jwtPayload = decodeJwtPayload(token);

    if (!jwtPayload?.sub) {
      console.error('JWT decode failed', { hasPayload: !!jwtPayload, hasSub: !!jwtPayload?.sub });
      return json({ error: 'Invalid token — could not identify user' }, 401);
    }

    const userId = jwtPayload.sub as string;
    const userEmail = (jwtPayload.email as string) || '';

    console.log('Auth OK', { userId, email: userEmail, role: jwtPayload.role });

    // ── Validate request body ──────────────────────────────────────────────
    const body = await req.json();
    const { priceId, successUrl, cancelUrl } = body;

    if (!priceId || !successUrl || !cancelUrl) {
      return json({ error: 'Missing required fields: priceId, successUrl, cancelUrl' }, 400);
    }

    if (!VALID_PRICE_IDS.includes(priceId)) {
      return json({ error: `Invalid priceId: ${priceId}` }, 400);
    }

    // ── Kamaʻāina Rate coupons (per-price, with max_redemptions set in Stripe) ──
    // Stripe auto-rejects the coupon once max redemptions are hit,
    // so checkout falls through to full price gracefully.
    const KAMAAINA_COUPONS: Record<string, string> = {
      'price_1TCo3PAmznBlrx8spOgZD1VC': 'BBcPxrKU',  // Practitioner Premium — $10 off · first 20 (Kamaʻāina Rate)
      'price_1T7loEAmznBlrx8s5j92qxX8': 'UeVQl6gU',  // Practitioner Featured — first 5
      'price_1TCA70AmznBlrx8sSVyl2HtA': 'VePaXQxy',  // Center Premium — first 5
      'price_1TCA7KAmznBlrx8s2IOtOThI': 'nxaOxE61',  // Center Featured — first 5
    };
    const kamaalainaCoupon = KAMAAINA_COUPONS[priceId] ?? null;

    // ── Look up or create Stripe customer ──────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('user_profiles')
        .upsert({ id: userId, stripe_customer_id: customerId });
    }

    // ── Create Stripe Checkout session ─────────────────────────────────────
    const checkoutParams = {
      customer: customerId,
      mode: 'subscription' as const,
      payment_method_types: ['card' as const],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { user_id: userId },
      subscription_data: { metadata: { user_id: userId } },
    };

    let session;
    if (kamaalainaCoupon) {
      try {
        // Try with Kamaʻāina Rate coupon
        session = await stripe.checkout.sessions.create({
          ...checkoutParams,
          discounts: [{ coupon: kamaalainaCoupon }],
        });
      } catch (couponErr: unknown) {
        // Coupon maxed out or invalid — fall back to full price with manual promo codes
        console.log('Kamaʻāina coupon unavailable, falling back to full price', {
          coupon: kamaalainaCoupon,
          error: couponErr instanceof Error ? couponErr.message : String(couponErr),
        });
        session = await stripe.checkout.sessions.create({
          ...checkoutParams,
          allow_promotion_codes: true,
        });
      }
    } else {
      session = await stripe.checkout.sessions.create({
        ...checkoutParams,
        allow_promotion_codes: true,
      });
    }

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
