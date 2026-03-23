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
 * Max listings to fetch. Covers the case where an island has many
 * premium/featured subscribers while keeping the query lightweight.
 */
const FETCH_CAP = 30;

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

      // Fetch featured + premium + enough free to fill slots.
      // Sort by is_featured first (boolean, reliable) then tier descending.
      // Note: tier is text so alphabetical desc = premium > free > featured —
      // the client-side filter below handles correct priority regardless.
      const { data, error } = await supabase
        .from('practitioners')
        .select('*, business:centers!practitioners_business_id_fkey(id,name)')
        .eq('island', island)
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('tier', { ascending: false })
        .order('name')
        .limit(FETCH_CAP);

      if (error) throw error;

      const all = (data ?? []).map(practitionerRowToProvider);

      // If we have enough featured to fill all slots, only return featured
      const featured = all.filter(p => p.tier === 'featured');
      if (featured.length >= DISPLAY_SLOTS) return featured;

      // Otherwise add premium to fill remaining
      const premium = all.filter(p => p.tier === 'premium');
      const paid = [...featured, ...premium];
      if (paid.length >= DISPLAY_SLOTS) return paid;

      // Still not enough — pad with free listings
      const free = all.filter(p => !p.tier || p.tier === 'free');
      return [...paid, ...free.slice(0, DISPLAY_SLOTS - paid.length)];
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

  return {
    data: listingsQuery.data ?? [],
    isLoading: listingsQuery.isLoading,
    totalCount: countQuery.data ?? 0,
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

      const { data, error } = await supabase
        .from('centers')
        .select('*')
        .eq('island', island)
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('tier', { ascending: false })
        .order('name')
        .limit(FETCH_CAP);

      if (error) throw error;

      const all = (data ?? []).map(centerRowToCenter);

      const featured = all.filter(c => c.tier === 'featured');
      if (featured.length >= DISPLAY_SLOTS) return featured;

      const premium = all.filter(c => c.tier === 'premium');
      const paid = [...featured, ...premium];
      if (paid.length >= DISPLAY_SLOTS) return paid;

      const free = all.filter(c => !c.tier || c.tier === 'free');
      return [...paid, ...free.slice(0, DISPLAY_SLOTS - paid.length)];
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

  return {
    data: listingsQuery.data ?? [],
    isLoading: listingsQuery.isLoading,
    totalCount: countQuery.data ?? 0,
  };
}
