/**
 * useStripe.ts
 * Client-side hooks for Stripe Checkout integration.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STRIPE_PRICES, VALID_PRICE_IDS, PROMO_ACTIVE } from '@/lib/stripe';

// ── Create checkout session ───────────────────────────────────────────────────

interface CheckoutParams {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async ({ priceId, successUrl, cancelUrl }: CheckoutParams) => {
      if (!supabase) throw new Error('Supabase not configured');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in to upgrade');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            priceId,
            successUrl: successUrl ?? `${window.location.origin}/dashboard/billing?success=1`,
            cancelUrl:  cancelUrl  ?? `${window.location.origin}/dashboard/billing`,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to create checkout session');
      }

      const { url } = await res.json();
      return url as string;
    },
    onSuccess: (url) => {
      // Redirect to Stripe Checkout
      window.location.href = url;
    },
  });
}

// ── Fetch current user's billing profile ─────────────────────────────────────

export interface BillingProfile {
  tier: 'free' | 'premium' | 'featured';
  subscription_status: string | null;
  subscription_period_end: string | null;
  stripe_customer_id: string | null;
}

export function useMyBillingProfile() {
  return useQuery<BillingProfile | null>({
    queryKey: ['my-billing-profile'],
    queryFn: async () => {
      if (!supabase) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('tier, subscription_status, subscription_period_end, stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return { tier: 'free', subscription_status: null, subscription_period_end: null, stripe_customer_id: null };
        throw error;
      }
      return data as BillingProfile;
    },
    staleTime: 1000 * 60,
  });
}

// ── Upgrade plan helpers ──────────────────────────────────────────────────────

// Practitioner plan options (used in DashboardBilling for practitioner accounts)
export const PRACTITIONER_PLAN_OPTIONS = [
  {
    id: 'premium' as const,
    name: 'Premium',
    price: '$49 / month',
    priceId: STRIPE_PRICES.PREMIUM_MONTHLY,
    features: [
      'All Free features',
      'Offerings, Classes & Testimonials',
      'Social media links on your profile',
      'Booking & messaging CTAs',
      'Priority listing placement',
    ],
  },
  {
    id: 'featured' as const,
    name: 'Featured',
    price: '$129 / month',
    priceId: STRIPE_PRICES.FEATURED_MONTHLY,
    features: [
      'All Premium features',
      '"Featured Practitioner" badge',
      'Homepage rotation spotlight',
      'Island search page top placement',
      'Limited to 5 per island',
    ],
  },
] as const;

// Center plan options (used in DashboardBilling for center accounts)
export const CENTER_PLAN_OPTIONS = [
  {
    id: 'premium' as const,
    name: 'Premium',
    price: '$79 / month',
    priceId: STRIPE_PRICES.CENTER_PREMIUM_MONTHLY,
    features: [
      'All Free features',
      'Photo gallery (up to 10 photos)',
      'Staff / practitioner roster',
      'Events calendar & class schedule',
      'Amenities list & working hours',
    ],
  },
  {
    id: 'featured' as const,
    name: 'Featured',
    price: '$199 / month',
    priceId: STRIPE_PRICES.CENTER_FEATURED_MONTHLY,
    features: [
      'All Premium features',
      'Verified Center badge',
      'Homepage rotation spotlight',
      'Island search top placement',
      'Limited to 5 per island',
    ],
  },
] as const;

// Legacy alias — default to practitioner plans
export const PLAN_OPTIONS = PRACTITIONER_PLAN_OPTIONS;

export { VALID_PRICE_IDS, PROMO_ACTIVE };
