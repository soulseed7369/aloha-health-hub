import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { practitionerRowToProvider } from '@/lib/adapters';
import { centerRowToCenter } from '@/lib/adapters';
import { mockPractitioners, mockCenters, type Provider, type Center } from '@/data/mockData';

/**
 * Slot-filling display count — how many cards the homepage shows.
 * We fetch more than this so the randomization has variety.
 */
const DISPLAY_SLOTS = 4;


/**
 * Returns practitioners for the island homepage cards, fetching only
 * what's needed: all featured + all premium, padded with free listings
 * only when paying tiers don't fill the display slots.
 *
 * Also returns `totalCount` (the full island count for stats/SEO)
 * via a cheap count-only query.
 */
export function useHomePractitioners(island: string) {
  const listingsQuery = useQuery<Provider[]>({
    queryKey: ['home-practitioners', island],
    queryFn: async () => {
      if (!supabase) return mockPractitioners;

      // Two-query strategy: first grab all paid listings (guaranteed small set),
      // then backfill with free listings only if needed.
      // This avoids the broken alphabetical sort on `tier` text column
      // (where 'featured' < 'free' < 'premium') and the unreliable `is_featured`
      // boolean which is never set to true by any code path.

      // Query 1: All featured + premium listings for this island
      const { data: paidData, error: paidError } = await supabase
        .from('practitioners')
        .select('*, business:centers!practitioners_business_id_fkey(id,name)')
        .eq('island', island)
        .eq('status', 'published')
        .in('tier', ['featured', 'premium'])
        .order('name');

      if (paidError) throw paidError;

      const paid = (paidData ?? []).map(practitionerRowToProvider);
      const featured = paid.filter(p => p.tier === 'featured');
      const premium = paid.filter(p => p.tier === 'premium');
      const prioritized = [...featured, ...premium];

      // If paid listings already fill the display, no need for free
      if (prioritized.length >= DISPLAY_SLOTS) return prioritized;

      // Query 2: Fetch a larger pool of free listings and shuffle so the
      // same two alphabetically-first listings don't stick every time.
      const needed = DISPLAY_SLOTS - prioritized.length;
      const { data: freeData, error: freeError } = await supabase
        .from('practitioners')
        .select('*, business:centers!practitioners_business_id_fkey(id,name)')
        .eq('island', island)
        .eq('status', 'published')
        .or('tier.eq.free,tier.is.null')
        .limit(50);

      if (freeError) throw freeError;

      const freeAll = (freeData ?? []).map(practitionerRowToProvider);
      const freeShuffled = [...freeAll].sort(() => Math.random() - 0.5).slice(0, needed);
      return [...prioritized, ...freeShuffled];
    },
    staleTime: 1000 * 60 * 5,
  });

  const countQuery = useQuery<number>({
    queryKey: ['practitioners-count', island],
    queryFn: async () => {
      if (!supabase) return mockPractitioners.length;

      const { count, error } = await supabase
        .from('practitioners')
        .select('id', { count: 'exact', head: true })
        .eq('island', island)
        .eq('status', 'published');

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Count of practitioners with a claimed (owned) listing — used for social proof
  const claimedQuery = useQuery<number>({
    queryKey: ['practitioners-claimed-count', island],
    queryFn: async () => {
      if (!supabase) return 0;

      const { count, error } = await supabase
        .from('practitioners')
        .select('id', { count: 'exact', head: true })
        .eq('island', island)
        .eq('status', 'published')
        .not('owner_id', 'is', null);

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    data: listingsQuery.data ?? [],
    isLoading: listingsQuery.isLoading,
    totalCount: countQuery.data ?? 0,
    claimedCount: claimedQuery.data ?? 0,
  };
}

/**
 * Same logic as useHomePractitioners, but for centers.
 */
export function useHomeCenters(island: string) {
  const listingsQuery = useQuery<Center[]>({
    queryKey: ['home-centers', island],
    queryFn: async () => {
      if (!supabase) return mockCenters;

      // Same two-query strategy as practitioners — see comments above.

      // Query 1: All featured + premium centers
      const { data: paidData, error: paidError } = await supabase
        .from('centers')
        .select('*')
        .eq('island', island)
        .eq('status', 'published')
        .in('tier', ['featured', 'premium'])
        .order('name');

      if (paidError) throw paidError;

      const paid = (paidData ?? []).map(centerRowToCenter);
      const featured = paid.filter(c => c.tier === 'featured');
      const premium = paid.filter(c => c.tier === 'premium');
      const prioritized = [...featured, ...premium];

      if (prioritized.length >= DISPLAY_SLOTS) return prioritized;

      // Query 2: Fetch a larger pool and shuffle — same fix as practitioners.
      const needed = DISPLAY_SLOTS - prioritized.length;
      const { data: freeData, error: freeError } = await supabase
        .from('centers')
        .select('*')
        .eq('island', island)
        .eq('status', 'published')
        .or('tier.eq.free,tier.is.null')
        .limit(50);

      if (freeError) throw freeError;

      const freeAll = (freeData ?? []).map(centerRowToCenter);
      const freeShuffled = [...freeAll].sort(() => Math.random() - 0.5).slice(0, needed);
      return [...prioritized, ...freeShuffled];
    },
    staleTime: 1000 * 60 * 5,
  });

  const countQuery = useQuery<number>({
    queryKey: ['centers-count', island],
    queryFn: async () => {
      if (!supabase) return mockCenters.length;

      const { count, error } = await supabase
        .from('centers')
        .select('id', { count: 'exact', head: true })
        .eq('island', island)
        .eq('status', 'published');

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Count of centers with a claimed (owned) listing — used for social proof
  const claimedQuery = useQuery<number>({
    queryKey: ['centers-claimed-count', island],
    queryFn: async () => {
      if (!supabase) return 0;
      const { count, error } = await supabase
        .from('centers')
        .select('id', { count: 'exact', head: true })
        .eq('island', island)
        .eq('status', 'published')
        .not('owner_id', 'is', null);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    data: listingsQuery.data ?? [],
    isLoading: listingsQuery.isLoading,
    totalCount: countQuery.data ?? 0,
    claimedCount: claimedQuery.data ?? 0,
  };
}
