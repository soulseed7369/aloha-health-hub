import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { practitionerRowToProvider } from '@/lib/adapters';
import { mockPractitioners, type Provider } from '@/data/mockData';

/**
 * Returns published practitioners on the Big Island, mapped to the Provider
 * shape expected by ProviderCard and DirectoryMap.
 *
 * Falls back to mockPractitioners when Supabase is not configured.
 */
export function usePractitioners(island = 'big_island', enabled = true) {
  return useQuery<Provider[]>({
    queryKey: ['practitioners', island],
    enabled,
    queryFn: async () => {
      if (!supabase) return mockPractitioners;

      const { data, error } = await supabase
        .from('practitioners')
        .select('*, business:centers!practitioners_business_id_fkey(id,name)')
        .eq('island', island)
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('tier', { ascending: false })
        .order('name');

      if (error) throw error;
      return (data ?? []).map(practitionerRowToProvider);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Returns up to 3 practitioners on the same island with overlapping modalities,
 * excluding the current profile. Sorted by modality overlap count (most similar first),
 * with featured listings prioritized as tiebreakers.
 *
 * Featured tier practitioners sort first among results with the same modality overlap,
 * followed by premium, then free tier.
 */
export function useSimilarPractitioners(
  island: string | null | undefined,
  modalities: string[],
  excludeId: string | undefined
) {
  return useQuery<Provider[]>({
    queryKey: ['similar-practitioners', island, excludeId],
    enabled: !!island && !!excludeId,
    queryFn: async () => {
      if (!supabase || !island || !excludeId) {
        return mockPractitioners.filter(p => p.id !== excludeId).slice(0, 3);
      }

      const { data, error } = await supabase
        .from('practitioners')
        .select('*, business:centers!practitioners_business_id_fkey(id,name)')
        .eq('island', island)
        .eq('status', 'published')
        .neq('id', excludeId)
        .limit(20);

      if (error) throw error;

      const all = (data ?? []).map(practitionerRowToProvider);
      const modalitySet = new Set(modalities);

      // Only include practitioners with at least 1 shared modality.
      // Primary sort: tier rank descending (featured > premium > free).
      // Secondary sort: overlap count descending (most similar first).
      // This ensures featured listings get the most visibility as cross-promotion.
      const TIER_RANK: Record<string, number> = { featured: 3, premium: 2, free: 1 };
      const scored = all
        .map(p => ({
          provider: p,
          overlap: (p.modalities ?? []).filter(m => modalitySet.has(m)).length,
          tierRank: TIER_RANK[p.tier ?? 'free'] ?? 1,
        }))
        .filter(s => s.overlap > 0)
        .sort((a, b) => b.tierRank - a.tierRank || b.overlap - a.overlap);

      return scored.slice(0, 4).map(s => s.provider);
    },
    staleTime: 1000 * 60 * 5,
  });
}
