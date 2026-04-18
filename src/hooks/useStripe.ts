/**
 * useStripe.ts
 * Client-side hooks for Stripe Checkout integration.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

      // Force a token refresh so we always send a valid, non-expired JWT.
      // getSession() only returns the cached token and does NOT auto-refresh.
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      const session = refreshData?.session;
      if (refreshErr || !session) {
        console.error('[checkout] session refresh failed:', refreshErr?.message);
        throw new Error('You must be logged in to upgrade. Please sign in again.');
      }

      if (import.meta.env.DEV) {
        console.log('[checkout] token refreshed, expires_at:', session.expires_at);
      }

      // Use supabase.functions.invoke — the official SDK method that correctly
      // handles apikey, Authorization, session refresh, and response parsing.
      const { data, error } = await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: {
            priceId,
            successUrl: successUrl ?? `${window.location.origin.replace('://www.', '://')}/dashboard/billing?success=1`,
            cancelUrl:  cancelUrl  ?? `${window.location.origin.replace('://www.', '://')}/dashboard/billing`,
          },
          // Explicitly pass the freshly-refreshed token.
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (error) {
        // Read raw body text first (more reliable than .json() which fails on non-JSON)
        // Then try to parse as JSON and pull out error/message field.
        // Gateway errors use { code, message }; our function uses { error }.
        let message = error.message || 'Failed to create checkout session';
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const context = (error as any).context as Response | undefined;
          if (context) {
            const text = await context.text();
            console.error('[checkout] raw error response:', text);
            if (text) {
              try {
                const body = JSON.parse(text);
                message = body.error || body.message || text;
              } catch {
                message = text;
              }
            }
          }
        } catch (readErr) {
          console.warn('[checkout] could not read error body:', readErr);
        }
        throw new Error(message);
      }

      if (!data?.url) throw new Error('No checkout URL returned');
      return data.url as string;
    },
    onSuccess: (url) => {
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

      const FREE_DEFAULT = { tier: 'free', subscription_status: null, subscription_period_end: null, stripe_customer_id: null } as const;

      if (error) {
        if (error.code === 'PGRST116') {
          // No row exists — create one so future queries/admin overrides have a target
          await supabase
            .from('user_profiles')
            .insert({ id: user.id, tier: 'free' })
            .then(({ error: insertErr }) => {
              // 23505 = unique violation (race condition, row already created)
              if (insertErr && insertErr.code !== '23505') {
                console.error('Failed to create user profile:', insertErr);
              }
            });
        } else {
          console.error('Failed to fetch billing profile:', error);
        }
        return FREE_DEFAULT;
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
    price: '$29 / month',
    originalPrice: '$39',
    spots: 25,
    priceId: STRIPE_PRICES.PREMIUM_MONTHLY,
    features: [
      '"Verified Practitioner" badge',
      'Verified client testimonials',
      'Expanded listing details (bio, services, hours & more)',
      'Photo gallery (up to 5 photos)',
      'Social media links',
      'Direct booking link',
      'Profile analytics',
      'Priority placement in search results',
    ],
  },
  {
    id: 'featured' as const,
    name: 'Featured',
    price: '$49 / month',
    originalPrice: '$69',
    spots: 10,
    priceId: STRIPE_PRICES.FEATURED_MONTHLY,
    features: [
      'Everything in Premium, plus:',
      'Homepage spotlight rotation',
      'Top placement in search results',
      'Offerings, classes & events calendar',
      'Photo gallery (up to 10 photos)',
      'Rich directory card with bio preview',
      'Enhanced Google search visibility',
      'Advanced analytics & monthly reports',
    ],
  },
] as const;

// Center plan options (used in DashboardBilling for center accounts)
export const CENTER_PLAN_OPTIONS = [
  {
    id: 'premium' as const,
    name: 'Premium',
    price: '$49 / month',
    originalPrice: '$69',
    spots: 25,
    priceId: STRIPE_PRICES.CENTER_PREMIUM_MONTHLY,
    features: [
      '"Verified Center" badge',
      'Verified client testimonials',
      'Expanded listing details (full description, services, hours & more)',
      'Photo gallery (up to 5 photos)',
      'Social media links',
      'Direct booking link',
      'Center analytics',
      'Priority placement in search results',
      'Up to 3 locations',
    ],
  },
  {
    id: 'featured' as const,
    name: 'Featured',
    price: '$79 / month',
    originalPrice: '$109',
    spots: 10,
    priceId: STRIPE_PRICES.CENTER_FEATURED_MONTHLY,
    features: [
      'Everything in Premium, plus:',
      'Homepage spotlight rotation',
      'Top placement in search results',
      'Events, classes & retreats calendar',
      'Photo gallery (up to 10 photos)',
      'Rich directory card with description preview',
      'Enhanced Google search visibility',
      'Advanced analytics & monthly reports',
      'Up to 6 locations',
    ],
  },
] as const;

// Legacy alias — default to practitioner plans
export const PLAN_OPTIONS = PRACTITIONER_PLAN_OPTIONS;

// ── Cancel subscription ───────────────────────────────────────────────────────

export interface CancelResult {
  success: boolean;
  cancel_at: string; // ISO timestamp — when access ends
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<CancelResult> => {
      if (!supabase) throw new Error('Supabase not configured');

      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      const session = refreshData?.session;
      if (refreshErr || !session) throw new Error('Please sign in again to continue.');

      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        let message = error.message || 'Failed to cancel subscription';
        try {
          const context = (error as any).context as Response | undefined;
          if (context) {
            const text = await context.text();
            if (text) {
              try { message = JSON.parse(text).error || text; } catch { message = text; }
            }
          }
        } catch { /* ignore */ }
        throw new Error(message);
      }

      if (!data?.success) throw new Error('Cancellation failed — please try again.');
      return data as CancelResult;
    },
    onSuccess: () => {
      // Refresh billing profile so UI immediately shows "Cancels on [date]"
      queryClient.invalidateQueries({ queryKey: ['my-billing-profile'] });
    },
  });
}

export { VALID_PRICE_IDS, PROMO_ACTIVE };
