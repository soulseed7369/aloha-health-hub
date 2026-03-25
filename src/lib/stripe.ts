/**
 * stripe.ts
 * Stripe client-side helper (publishable key only).
 * Server-side Stripe calls (checkout, webhooks) must use the secret key
 * inside Supabase Edge Functions — never in the browser bundle.
 */

// ── Price IDs ─────────────────────────────────────────────────────────────────
// Confirmed live price IDs from Stripe Dashboard (account T47YY).
// Products → click product → Pricing tab → copy price_xxx ID.

export const STRIPE_PRICES = {
  // ── Practitioners ────────────────────────────────────────────────────────
  /** Practitioner Premium: $39/mo (kamaaina $29/mo) */
  PREMIUM_MONTHLY:         'price_1TCo3PAmznBlrx8spOgZD1VC',
  /** Practitioner Featured: $69/mo (kamaaina $49/mo) */
  FEATURED_MONTHLY:        'price_1TErgTAmznBlrx8scCN6CsNa',

  // ── Wellness Centers ─────────────────────────────────────────────────────
  /** Center Premium: $69/mo (kamaaina $49/mo) */
  CENTER_PREMIUM_MONTHLY:  'price_1TErf1AmznBlrx8suRd3ARgM',
  /** Center Featured: $109/mo (kamaaina $79/mo) */
  CENTER_FEATURED_MONTHLY: 'price_1TEszAAmznBlrx8sDwkodC8z',
} as const;

export type StripePriceId = typeof STRIPE_PRICES[keyof typeof STRIPE_PRICES];

/** All valid paid price IDs — used for whitelist validation throughout the app */
export const VALID_PRICE_IDS: string[] = Object.values(STRIPE_PRICES);

// ── Launch promotion ──────────────────────────────────────────────────────────
/** ALOHA20: 20% off for the first 12 billing cycles.
 *  Enable by setting VITE_PROMO_ACTIVE=true in .env.local */
export const PROMO_COUPON_ID = 'o1QERmQL';
export const PROMO_ACTIVE = import.meta.env.VITE_PROMO_ACTIVE === 'true';

/** Publishable key — safe to include in browser bundle */
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
