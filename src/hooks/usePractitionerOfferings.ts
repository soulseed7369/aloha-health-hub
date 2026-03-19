import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { OfferingRow } from '@/types/database';

/**
 * Fetch all offerings for a practitioner (public: published only).
 * For provider dashboard (including drafts), use useMyOfferings instead.
 */
export function usePractitionerOfferings(practitionerId: string | null) {
  return useQuery<OfferingRow[]>({
    queryKey: ['practitioner-offerings', practitionerId],
    enabled: !!practitionerId && !!supabase,
    queryFn: async () => {
      if (!supabase || !practitionerId) return [];

      const { data, error } = await supabase
        .from('offerings')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .eq('status', 'published')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}
