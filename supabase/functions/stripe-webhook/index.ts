/**
 * stripe-webhook/index.ts
 * Supabase Edge Function — handles Stripe webhook events.
 *
 * Deploy:
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *
 * Set secrets (one-time):
 *   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
 *   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
 *   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
 *
 * In Stripe Dashboard → Webhooks → Add endpoint:
 *   URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
 *   Events to listen for:
 *     - checkout.session.completed
 *     - customer.subscription.updated
 *     - customer.subscription.deleted
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

// Price → tier mapping — keep in sync with src/lib/stripe.ts
// Covers both practitioner and center price IDs (same tier names, different prices).
const PRICE_TIER_MAP: Record<string, 'premium' | 'featured'> = {
  // Practitioners
  'price_1T7lnYAmznBlrx8sZkolChSm': 'premium',   // $49/mo
  'price_1T7loEAmznBlrx8s5j92qxX8': 'featured',  // $129/mo
  // Wellness Centers
  'price_1TCA70AmznBlrx8sSVyl2HtA': 'premium',   // $79/mo
  'price_1TCA7KAmznBlrx8s2IOtOThI': 'featured',  // $199/mo
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature')!;
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook error', { status: 400 });
  }

  try {
    switch (event.type) {

      // ── New subscription created (or completed checkout) ──────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const customerId     = session.customer as string;
        const subscriptionId = session.subscription as string;
        const userId         = session.metadata?.user_id;

        if (!userId) {
          console.error('No user_id in checkout session metadata');
          break;
        }

        // Fetch the subscription to get price / status
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price.id ?? '';
        const tier = PRICE_TIER_MAP[priceId] ?? 'premium';

        await upsertProfile(userId, {
          tier,
          stripe_customer_id:      customerId,
          stripe_subscription_id:  subscriptionId,
          stripe_price_id:         priceId,
          subscription_status:     sub.status,
          subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });

        await syncTierToListings(userId, tier);
        break;
      }

      // ── Subscription updated (plan change, renewal, etc.) ─────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const priceId    = sub.items.data[0]?.price.id ?? '';
        const tier = PRICE_TIER_MAP[priceId] ?? 'premium';

        // Look up user by stripe_customer_id
        const userId = await getUserByCustomerId(customerId);
        if (!userId) break;

        await upsertProfile(userId, {
          tier,
          stripe_price_id:         priceId,
          subscription_status:     sub.status,
          subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });

        await syncTierToListings(userId, tier);
        break;
      }

      // ── Subscription cancelled / lapsed ──────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const userId = await getUserByCustomerId(customerId);
        if (!userId) break;

        await upsertProfile(userId, {
          tier:                    'free',
          subscription_status:     'canceled',
          subscription_period_end: null,
          stripe_subscription_id:  null,
          stripe_price_id:         null,
        });

        await syncTierToListings(userId, 'free');

        // Remove any featured slots for this user
        await supabase
          .from('featured_slots')
          .delete()
          .eq('owner_id', userId);
        break;
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response('Internal error', { status: 500 });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function upsertProfile(userId: string, data: Record<string, unknown>) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

async function getUserByCustomerId(customerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  if (error || !data) return null;
  return data.id;
}

async function syncTierToListings(userId: string, tier: string) {
  await supabase.from('practitioners').update({ tier }).eq('owner_id', userId);
  await supabase.from('centers').update({ tier }).eq('owner_id', userId);

  if (tier === 'featured') {
    // Upsert featured_slots for all listings owned by this user
    const [{ data: practitioners }, { data: centers }] = await Promise.all([
      supabase.from('practitioners').select('id, island').eq('owner_id', userId),
      supabase.from('centers').select('id, island').eq('owner_id', userId),
    ]);

    const slots = [
      ...(practitioners ?? []).map(p => ({
        listing_id: p.id,
        listing_type: 'practitioner' as const,
        island: p.island ?? 'big_island',
        owner_id: userId,
      })),
      ...(centers ?? []).map(c => ({
        listing_id: c.id,
        listing_type: 'center' as const,
        island: c.island ?? 'big_island',
        owner_id: userId,
      })),
    ];

    if (slots.length > 0) {
      const { error } = await supabase
        .from('featured_slots')
        .upsert(slots, { onConflict: 'listing_id' });
      if (error) console.error('Error upserting featured_slots:', error);
    }
  } else {
    // Remove any featured slots when downgrading from featured
    const { error } = await supabase
      .from('featured_slots')
      .delete()
      .eq('owner_id', userId);
    if (error) console.error('Error removing featured_slots:', error);
  }
}
