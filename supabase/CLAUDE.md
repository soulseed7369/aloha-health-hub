# Supabase / Stripe / Auth — Guardrails

## SQL Editor

**URL:** https://supabase.com/dashboard/project/sccksxvjckllxlvyuotv/sql/new

To run a migration: navigate to this URL (must be logged into Supabase in Chrome), paste the SQL, and execute. Claude can do this automatically when Chrome is open and logged in.

---

## supabaseAdmin Is Server-Only

`src/lib/supabaseAdmin.ts` returns null in the browser. The service role key was removed from VITE_ env vars after a security audit. Any client-side code calling `supabaseAdmin` will fail silently with no error thrown.

Admin mutations that need elevated access must go through Supabase Edge Functions, not client hooks.

---

## Stripe Is Live Mode

Account T47YY. Never run checkout flows locally without switching to a Stripe test mode key. Real charges will occur.

Edge functions:
- `supabase/functions/create-checkout-session/index.ts` — requires auth JWT, validates `priceId` starts with `price_`, validates same-origin URLs
- `supabase/functions/stripe-webhook/index.ts` — verifies Stripe signature, handles `checkout.session.completed` / `subscription.updated` / `subscription.deleted`

---

## Featured Slots — DB Trigger Cap

5 featured slots per island maximum, enforced by Postgres trigger `check_featured_slot_limit`. Inserting a 6th slot throws a DB error. Always handle this gracefully — do not let it propagate as an unhandled exception in the UI.

Featured slot rows are created/deleted atomically via two paths:
- **Via payment:** Stripe webhook fires on `checkout.session.completed` → calls `syncTierToListings(userId, tier)`, which updates `practitioners.tier` + `centers.tier` and upserts/deletes `featured_slots` rows
- **Via admin override:** `useSetListingTier.mutate()` in `src/hooks/useAdmin.ts` — updates listing tier and manages `featured_slots` atomically

---

## useAccounts.ts Admin Functions Are Stubbed

`useAdminAccounts`, `useSetAccountTier`, `useAdminFeaturedSlots`, and `useRemoveFeaturedSlot` all bail out with no-ops. They require a service-role client that is not available in the browser. To implement properly, these need to be wrapped in an Edge Function.

---

## Tier System

| Tier | Price | Features |
|------|-------|----------|
| `free` | $0 | Name, bio, location, modalities, contact |
| `premium` | $39/mo | + Retreat posts, social links, working hours, testimonials |
| `featured` | $129/mo | + Homepage rotation, crown badge, priority sort — 5/island cap |

Price ID constants are defined in `src/lib/stripe.ts` → `STRIPE_PRICES.PREMIUM_MONTHLY` / `STRIPE_PRICES.FEATURED_MONTHLY`.

---

## Auth Security Rules

- **`pendingPlan` localStorage key** must be validated against a whitelist of known `price_xxx` IDs before acting on it. Prevents open redirect abuse. Validation lives in `Auth.tsx`, `DashboardHome.tsx`, and `AuthCallback.tsx`. Do not simplify or remove this validation.
- **Magic link OTP expires after 60 minutes.** Prompt users to request a new one on expired-link errors. Do not silently swallow the error.

---

## Photo Upload

Use the regular `supabase` client (not `supabaseAdmin`). Bucket: `images`. Path format: `practitioners/{timestamp}-{random}.{ext}`.
