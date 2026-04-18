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
  // 'all' means no island filter — used on the All-Islands homepage.
  // When there's no paid tier filling the grid on the all-islands view,
  // pad with *claimed* free listings only (owner_id not null) so we don't
  // surface un-curated scraped rows on the most-visited page.
  const isAll = island === 'all';
  const listingsQuery = useQuery<Provider[]>({
    queryKey: ['home-practitioners', island],
    queryFn: async () => {
      if (!supabase) return mockPractitioners;

      // Query 1: All featured + premium listings (optionally scoped to island)
      let paidQuery = supabase
        .from('practitioners')
        .select('*, business:centers!practitioners_business_id_fkey(id,name)')
        .eq('status', 'published')
        .in('tier', ['featured', 'premium'])
        .order('name');
      if (!isAll) paidQuery = paidQuery.eq('island', island);
      const { data: paidData, error: paidError } = await paidQuery;

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
      let freeQuery = supabase
        .from('practitioners')
        .select('*, business:centers!practitioners_business_id_fkey(id,name)')
        .eq('status', 'published')
        .or('tier.eq.free,tier.is.null')
        .limit(50);
      if (!isAll) freeQuery = freeQuery.eq('island', island);
      // Only show *claimed* free listings in the cross-island view.
      if (isAll) freeQuery = freeQuery.not('owner_id', 'is', null);
      const { data: freeData, error: freeError } = await freeQuery;

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

      let q = supabase
        .from('practitioners')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published');
      if (!isAll) q = q.eq('island', island);
      const { count, error } = await q;

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

      let q = supabase
        .from('practitioners')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .not('owner_id', 'is', null);
      if (!isAll) q = q.eq('island', island);
      const { count, error } = await q;

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
  const isAll = island === 'all';
  const listingsQuery = useQuery<Center[]>({
    queryKey: ['home-centers', island],
    queryFn: async () => {
      if (!supabase) return mockCenters;

      // Query 1: All featured + premium centers (optionally scoped to island)
      let paidQuery = supabase
        .from('centers')
        .select('*')
        .eq('status', 'published')
        .in('tier', ['featured', 'premium'])
        .order('name');
      if (!isAll) paidQuery = paidQuery.eq('island', island);
      const { data: paidData, error: paidError } = await paidQuery;

      if (paidError) throw paidError;

      const paid = (paidData ?? []).map(centerRowToCenter);
      const featured = paid.filter(c => c.tier === 'featured');
      const premium = paid.filter(c => c.tier === 'premium');
      const prioritized = [...featured, ...premium];

      if (prioritized.length >= DISPLAY_SLOTS) return prioritized;

      // Query 2: Fetch a larger pool and shuffle.
      const needed = DISPLAY_SLOTS - prioritized.length;
      let freeQuery = supabase
        .from('centers')
        .select('*')
        .eq('status', 'published')
        .or('tier.eq.free,tier.is.null')
        .limit(50);
      if (!isAll) freeQuery = freeQuery.eq('island', island);
      if (isAll) freeQuery = freeQuery.not('owner_id', 'is', null);
      const { data: freeData, error: freeError } = await freeQuery;

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

      let q = supabase
        .from('centers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published');
      if (!isAll) q = q.eq('island', island);
      const { count, error } = await q;

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
      let q = supabase
        .from('centers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .not('owner_id', 'is', null);
      if (!isAll) q = q.eq('island', island);
      const { count, error } = await q;
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
