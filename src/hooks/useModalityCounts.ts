import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Returns a map of modality name → published listing count, aggregated across
 * practitioners and centers. Used by the wellness modalities guide to show
 * live counts on each modality CTA ("Find 23 Massage practitioners in Hawaiʻi").
 *
 * Single query, cached for 30 minutes — safe to call from any guide page.
 */
export function useModalityCounts() {
  return useQuery<Record<string, number>>({
    queryKey: ['modality-counts'],
    queryFn: async () => {
      if (!supabase) return {};

      const [practRes, centerRes] = await Promise.all([
        supabase
          .from('practitioners')
          .select('modalities')
          .eq('status', 'published'),
        supabase
          .from('centers')
          .select('modalities')
          .eq('status', 'published'),
      ]);

      if (practRes.error) throw practRes.error;
      if (centerRes.error) throw centerRes.error;

      const counts: Record<string, number> = {};
      const tally = (rows: { modalities: string[] | null }[] | null) => {
        for (const row of rows ?? []) {
          for (const m of row.modalities ?? []) {
            if (!m) continue;
            counts[m] = (counts[m] ?? 0) + 1;
          }
        }
      };
      tally(practRes.data);
      tally(centerRes.data);

      return counts;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
