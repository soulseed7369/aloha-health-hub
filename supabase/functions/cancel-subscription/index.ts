/**
 * cancel-subscription/index.ts
 * Supabase Edge Function — cancels a Stripe subscription at period end.
 *
 * Sets cancel_at_period_end: true, so the practitioner keeps access until
 * their current billing period expires, then Stripe fires
 * customer.subscription.deleted and our webhook downgrades the tier.
 *
 * Deploy:
 *   supabase functions deploy cancel-subscription --no-verify-jwt
 */

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeKey || !supabaseUrl || !supabaseServiceRole) {
      return json({ error: 'Server configuration error' }, 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const payload = decodeJwtPayload(token);
    if (!payload?.sub) return json({ error: 'Invalid token' }, 401);

    const userId = payload.sub as string;

    // ── Look up subscription ID ─────────────────────────────────────────────
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('stripe_subscription_id, subscription_status, tier')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return json({ error: 'Could not load billing profile' }, 404);
    }

    if (!profile.stripe_subscription_id) {
      return json({ error: 'No active subscription found' }, 400);
    }

    if (profile.subscription_status === 'cancel_at_period_end') {
      return json({ error: 'Subscription is already set to cancel' }, 400);
    }

    // ── Cancel at period end ────────────────────────────────────────────────
    const sub = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Mark in our DB immediately so the UI reflects it without waiting for webhook
    await supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_status: 'cancel_at_period_end',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return json({
      success: true,
      cancel_at: new Date(sub.current_period_end * 1000).toISOString(),
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('cancel-subscription error:', message);
    return json({ error: message || 'Internal server error' }, 500);
  }
});
