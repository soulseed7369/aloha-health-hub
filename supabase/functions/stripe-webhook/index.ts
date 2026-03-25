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
  'price_1TCo3PAmznBlrx8spOgZD1VC': 'premium',   // Practitioner $39/mo
  'price_1TErgTAmznBlrx8scCN6CsNa': 'featured',  // Practitioner $69/mo
  // Wellness Centers
  'price_1TErf1AmznBlrx8suRd3ARgM': 'premium',   // Center $69/mo
  'price_1TEszAAmznBlrx8sDwkodC8z': 'featured',  // Center $109/mo
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

        // Record billing event
        await supabase.from('billing_events').insert({
          user_id: userId,
          event_type: 'subscription_updated',
          new_tier: tier,
          new_status: sub.status,
          stripe_event_id: event.id,
          stripe_object_id: sub.id,
          metadata: { price_id: priceId },
        }).select();

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

        // Enter 90-day grace period instead of immediate deletion
        const graceUntil = new Date();
        graceUntil.setDate(graceUntil.getDate() + 90);
        await supabase
          .from('featured_slots')
          .update({ grace_until: graceUntil.toISOString() })
          .eq('owner_id', userId)
          .is('grace_until', null); // only update slots not already in grace

        // Record billing event
        await supabase.from('billing_events').insert({
          user_id: userId,
          event_type: 'subscription_canceled',
          new_tier: 'free',
          new_status: 'canceled',
          stripe_event_id: event.id,
          stripe_object_id: sub.id,
          metadata: { reason: 'subscription_deleted' },
        }).select();

        // Send downgrade notification email via Resend
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (resendKey) {
          // Get user email
          const { data: userData } = await supabase.auth.admin.getUserById(userId);
          const userEmail = userData?.user?.email;

          if (userEmail) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: "Hawaiʻi Wellness <billing@hawaiiwellness.net>",
                to: [userEmail],
                subject: "Your Hawaiʻi Wellness subscription has been cancelled",
                html: `
                  <p>Hi there,</p>
                  <p>Your subscription has been cancelled and your listing has been moved to the Free plan.</p>
                  <p><strong>What this means:</strong></p>
                  <ul>
                    <li>Your profile remains in the directory at no charge</li>
                    <li>Premium features (social links, working hours, testimonials) are hidden but preserved — they'll return if you resubscribe</li>
                    <li>Your featured listing slot has entered a 90-day grace period. If you resubscribe to Featured within 90 days, your slot priority will be restored</li>
                  </ul>
                  <p>To reactivate your premium listing, visit your <a href="https://hawaiiwellness.net/dashboard/billing">billing dashboard</a>.</p>
                  <p>Questions? Reply to this email or contact <a href="mailto:aloha@hawaiiwellness.net">aloha@hawaiiwellness.net</a>.</p>
                  <p>Mahalo,<br>The Hawaiʻi Wellness Team</p>
                `,
              }),
            }).catch(err => console.error('Failed to send downgrade email:', err));
          }
        }
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
  const is_featured = tier === 'featured';
  await supabase.from('practitioners').update({ tier, is_featured }).eq('owner_id', userId);
  await supabase.from('centers').update({ tier, is_featured }).eq('owner_id', userId);

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
    // Enter 90-day grace period when downgrading from featured instead of immediate deletion
    const graceUntil = new Date();
    graceUntil.setDate(graceUntil.getDate() + 90);
    const { error } = await supabase
      .from('featured_slots')
      .update({ grace_until: graceUntil.toISOString() })
      .eq('owner_id', userId)
      .is('grace_until', null); // only update slots not already in grace
    if (error) console.error('Error updating featured_slots grace period:', error);
  }
}
