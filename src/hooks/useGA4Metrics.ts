import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface GA4PeriodMetrics {
  sessions: number;
  users: number;
  pageviews: number;
}

export interface GA4Metrics {
  last7d: GA4PeriodMetrics;
  last30d: GA4PeriodMetrics;
}

async function fetchGA4Metrics(): Promise<GA4Metrics> {
  const { data, error } = await supabase.functions.invoke('ga4-metrics');
  if (error) throw new Error(error.message);
  return data as GA4Metrics;
}

export function useGA4Metrics() {
  return useQuery({
    queryKey: ['ga4-metrics'],
    queryFn: fetchGA4Metrics,
    staleTime: 5 * 60 * 1000,  // cache 5 min — GA4 data doesn't update that fast
    gcTime:   10 * 60 * 1000,
    retry: false,               // don't retry on auth/config errors
  });
}
