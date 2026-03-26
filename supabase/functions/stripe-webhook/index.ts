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

// Price → listing type mapping — ensures a practitioner plan only upgrades
// practitioner listings, and a center plan only upgrades center listings.
// Without this, buying a practitioner plan would also free-upgrade linked centers.
const PRICE_LISTING_TYPE_MAP: Record<string, 'practitioner' | 'center'> = {
  'price_1TCo3PAmznBlrx8spOgZD1VC': 'practitioner',
  'price_1TErgTAmznBlrx8scCN6CsNa': 'practitioner',
  'price_1TErf1AmznBlrx8suRd3ARgM': 'center',
  'price_1TEszAAmznBlrx8sDwkodC8z': 'center',
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
        const listingType = PRICE_LISTING_TYPE_MAP[priceId] ?? 'practitioner';

        await upsertProfile(userId, {
          tier,
          stripe_customer_id:      customerId,
          stripe_subscription_id:  subscriptionId,
          stripe_price_id:         priceId,
          subscription_status:     sub.status,
          subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });

        await syncTierToListings(userId, tier, listingType);

        // Mark any active campaign_outreach rows for this user's listings as 'upgraded'
        await markCampaignUpgraded(userId, listingType);

        // Notify aloha@hawaiiwellness.net of new subscriber
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (resendKey) {
          const { data: userData } = await supabase.auth.admin.getUserById(userId);
          const userEmail = userData?.user?.email ?? 'unknown';

          // Fetch their listing name for context
          const { data: listings } = await supabase
            .from(listingType === 'center' ? 'centers' : 'practitioners')
            .select('name, island, city')
            .eq('owner_id', userId)
            .limit(1);
          const listing = listings?.[0];
          const listingName = listing?.name ?? 'unknown listing';
          const location = [listing?.city, listing?.island?.replace('_', ' ')].filter(Boolean).join(', ');

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Hawaiʻi Wellness <billing@hawaiiwellness.net>',
              to: ['aloha@hawaiiwellness.net'],
              subject: `🎉 New ${tier} subscriber — ${listingName}`,
              html: `
                <p><strong>New ${tier} subscription!</strong></p>
                <ul>
                  <li><strong>Listing:</strong> ${listingName}</li>
                  <li><strong>Type:</strong> ${listingType}</li>
                  <li><strong>Location:</strong> ${location || 'unknown'}</li>
                  <li><strong>Email:</strong> ${userEmail}</li>
                  <li><strong>Plan:</strong> ${tier} (${priceId})</li>
                </ul>
                <p><a href="https://hawaiiwellness.net/admin">View in Admin Panel →</a></p>
              `,
            }),
          }).catch(err => console.error('Failed to send admin notification:', err));
        }

        break;
      }

      // ── Subscription updated (plan change, renewal, etc.) ─────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const priceId    = sub.items.data[0]?.price.id ?? '';
        const tier = PRICE_TIER_MAP[priceId] ?? 'premium';
        const listingType = PRICE_LISTING_TYPE_MAP[priceId] ?? 'practitioner';

        // Look up user by stripe_customer_id
        const userId = await getUserByCustomerId(customerId);
        if (!userId) break;

        // Preserve cancel_at_period_end status so the UI shows "Cancels on [date]"
        // rather than overwriting back to 'active'.
        const subStatus = sub.cancel_at_period_end ? 'cancel_at_period_end' : sub.status;

        await upsertProfile(userId, {
          tier,
          stripe_price_id:         priceId,
          subscription_status:     subStatus,
          subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });

        await syncTierToListings(userId, tier, listingType);

        // If the tier is paid, mark campaign_outreach as upgraded
        if (tier === 'premium' || tier === 'featured') {
          await markCampaignUpgraded(userId, listingType);
        }

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
        const canceledPriceId = sub.items.data[0]?.price.id ?? '';
        const listingType = PRICE_LISTING_TYPE_MAP[canceledPriceId] ?? 'practitioner';

        const userId = await getUserByCustomerId(customerId);
        if (!userId) break;

        // Determine whether the other listing type still has a paid tier.
        // A user can hold a practitioner plan AND a center plan simultaneously.
        // Canceling one should not reset user_profiles.tier if the other is still active.
        const otherTable = listingType === 'practitioner' ? 'centers' : 'practitioners';
        const { data: otherListings } = await supabase
          .from(otherTable)
          .select('tier')
          .eq('owner_id', userId)
          .in('tier', ['premium', 'featured']);
        const otherStillPaid = (otherListings ?? []).length > 0;
        const otherTier = otherStillPaid
          ? ((otherListings ?? []).some(l => l.tier === 'featured') ? 'featured' : 'premium')
          : null;

        await upsertProfile(userId, otherStillPaid ? {
          // Other listing type still has an active subscription — preserve its tier
          subscription_status:     'canceled', // reflects this specific sub that ended
        } : {
          tier:                    'free',
          subscription_status:     'canceled',
          subscription_period_end: null,
          stripe_subscription_id:  null,
          stripe_price_id:         null,
        });

        // If the other plan is still paid, update user_profiles.tier to the other tier
        if (otherStillPaid && otherTier) {
          await upsertProfile(userId, { tier: otherTier });
        }

        await syncTierToListings(userId, 'free', listingType);

        // Note: 90-day grace period for featured_slots is handled inside syncTierToListings,
        // scoped to the correct listing_type. No additional update needed here.

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
    .upsert({ id: userId, ...data, updated_at: new Date().toISOString() });
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

/**
 * Mark campaign_outreach rows as 'upgraded' for all listings owned by this user.
 * Non-critical — errors are logged but don't fail the webhook.
 */
async function markCampaignUpgraded(userId: string, listingType: 'practitioner' | 'center') {
  try {
    const table = listingType === 'center' ? 'centers' : 'practitioners';
    const { data: listings } = await supabase
      .from(table)
      .select('id')
      .eq('owner_id', userId);

    if (!listings || listings.length === 0) return;

    const listingIds = listings.map((l: { id: string }) => l.id);
    await supabase
      .from('campaign_outreach')
      .update({ status: 'upgraded' })
      .in('listing_id', listingIds)
      .in('status', ['not_contacted', 'email_queued', 'email_1_sent', 'email_1_opened',
                     'email_1b_sent', 'email_2_sent', 'replied', 'claimed']);
  } catch (err) {
    console.error('markCampaignUpgraded failed (non-critical):', err);
  }
}

async function syncTierToListings(userId: string, tier: string, listingType: 'practitioner' | 'center') {
  const is_featured = tier === 'featured';

  // Only update the table that matches the purchased plan.
  // A practitioner plan must never auto-upgrade a linked center (and vice versa).
  if (listingType === 'practitioner') {
    await supabase.from('practitioners').update({ tier, is_featured }).eq('owner_id', userId);
  } else {
    await supabase.from('centers').update({ tier, is_featured }).eq('owner_id', userId);
  }

  if (tier === 'featured') {
    // Upsert featured_slots only for the listing type that was upgraded
    const isPractitioner = listingType === 'practitioner';
    const { data: listings } = isPractitioner
      ? await supabase.from('practitioners').select('id, island').eq('owner_id', userId)
      : await supabase.from('centers').select('id, island').eq('owner_id', userId);

    const slots = (listings ?? []).map(l => ({
      listing_id: l.id,
      listing_type: listingType,
      island: l.island ?? 'big_island',
      owner_id: userId,
    }));

    if (slots.length > 0) {
      const { error } = await supabase
        .from('featured_slots')
        .upsert(slots, { onConflict: 'listing_id' });
      if (error) console.error('Error upserting featured_slots:', error);
    }
  } else {
    // Enter 90-day grace period when downgrading from featured instead of immediate deletion.
    // Must filter by listing_type so that downgrading one plan (e.g. practitioner)
    // does not accidentally enter the other plan type's (e.g. center) featured slot into grace.
    const graceUntil = new Date();
    graceUntil.setDate(graceUntil.getDate() + 90);
    const { error } = await supabase
      .from('featured_slots')
      .update({ grace_until: graceUntil.toISOString() })
      .eq('owner_id', userId)
      .eq('listing_type', listingType)
      .is('grace_until', null); // only update slots not already in grace
    if (error) console.error('Error updating featured_slots grace period:', error);
  }
}
