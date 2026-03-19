import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ClassRow } from '@/types/database';

/**
 * Fetch all classes for a practitioner (public: published only).
 * For provider dashboard (including drafts), use useMyClasses instead.
 */
export function usePractitionerClasses(practitionerId: string | null) {
  return useQuery<ClassRow[]>({
    queryKey: ['practitioner-classes', practitionerId],
    enabled: !!practitionerId && !!supabase,
    queryFn: async () => {
      if (!supabase || !practitionerId) return [];

      const { data, error } = await supabase
        .from('classes')
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
