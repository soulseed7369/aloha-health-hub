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
// Islands shown in the all-islands homepage grid (one card each).
const ALL_ISLANDS = ['big_island', 'maui', 'oahu', 'kauai'] as const;

export function useHomePractitioners(island: string) {
  const isAll = island === 'all';
  const listingsQuery = useQuery<Provider[]>({
    queryKey: ['home-practitioners', island],
    queryFn: async () => {
      if (!supabase) return mockPractitioners;

      // ── All-Islands mode: one representative per island ──────────────────
      // Fetch 4 parallel island queries. Each gets the best available listing
      // (featured > premium > any published) so every island gets a card slot
      // even if it only has unclaimed free listings.
      if (isAll) {
        const perIsland = await Promise.all(
          ALL_ISLANDS.map(async (isl) => {
            // Prefer paid tiers
            const { data: paid } = await supabase!
              .from('practitioners')
              .select('*, business:centers!practitioners_business_id_fkey(id,name)')
              .eq('island', isl)
              .eq('status', 'published')
              .in('tier', ['featured', 'premium'])
              .order('name')
              .limit(3);

            if (paid?.length) {
              const providers = paid.map(practitionerRowToProvider);
              const feat = providers.filter(p => p.tier === 'featured');
              return feat.length ? feat[0] : providers[0];
            }

            // Fall back to any published listing for this island
            const { data: any_ } = await supabase!
              .from('practitioners')
              .select('*, business:centers!practitioners_business_id_fkey(id,name)')
              .eq('island', isl)
              .eq('status', 'published')
              .limit(20);

            if (!any_?.length) return null;
            const pool = any_.map(practitionerRowToProvider);
            return pool[Math.floor(Math.random() * pool.length)];
          })
        );
        return perIsland.filter((p): p is Provider => p !== null);
      }

      // ── Single-island mode ───────────────────────────────────────────────
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

      if (prioritized.length >= DISPLAY_SLOTS) return prioritized;

      // Query 2: Free listings to pad remaining slots
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

      // ── All-Islands mode: one representative center per island ───────────
      if (isAll) {
        const perIsland = await Promise.all(
          ALL_ISLANDS.map(async (isl) => {
            const { data: paid } = await supabase!
              .from('centers')
              .select('*')
              .eq('island', isl)
              .eq('status', 'published')
              .in('tier', ['featured', 'premium'])
              .order('name')
              .limit(3);

            if (paid?.length) {
              const centers = paid.map(centerRowToCenter);
              const feat = centers.filter(c => c.tier === 'featured');
              return feat.length ? feat[0] : centers[0];
            }

            const { data: any_ } = await supabase!
              .from('centers')
              .select('*')
              .eq('island', isl)
              .eq('status', 'published')
              .limit(20);

            if (!any_?.length) return null;
            const pool = any_.map(centerRowToCenter);
            return pool[Math.floor(Math.random() * pool.length)];
          })
        );
        return perIsland.filter((c): c is Center => c !== null);
      }

      // ── Single-island mode ───────────────────────────────────────────────
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
