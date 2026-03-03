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
export function usePractitioners(island = 'big_island') {
  return useQuery<Provider[]>({
    queryKey: ['practitioners', island],
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
