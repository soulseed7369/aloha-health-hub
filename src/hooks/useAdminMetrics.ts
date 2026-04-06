import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AdminMetrics {
  // Listings
  totalPractitioners: number;
  publishedPractitioners: number;
  draftPractitioners: number;
  totalCenters: number;
  publishedCenters: number;
  draftCenters: number;
  // Claims
  claimedListings: number;
  newClaimsLast24h: number;
  newClaimsLast7d: number;
  // Subscriptions
  activePremium: number;
  activeFeatured: number;
  totalActiveSubscriptions: number;
}

async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const last7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalPract },
    { count: pubPract },
    { count: draftPract },
    { count: totalCent },
    { count: pubCent },
    { count: draftCent },
    { count: claimedPract },
    { count: claimedCent },
    { count: claims24hPract },
    { count: claims24hCent },
    { count: claims7dPract },
    { count: claims7dCent },
    { count: activePremium },
    { count: activeFeatured },
  ] = await Promise.all([
    supabase.from('practitioners').select('*', { count: 'exact', head: true }),
    supabase.from('practitioners').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('practitioners').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('centers').select('*', { count: 'exact', head: true }),
    supabase.from('centers').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('centers').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('practitioners').select('*', { count: 'exact', head: true }).not('owner_id', 'is', null),
    supabase.from('centers').select('*', { count: 'exact', head: true }).not('owner_id', 'is', null),
    // "new claims" = listings with owner_id set AND updated recently (proxy for when claim happened)
    supabase.from('practitioners').select('*', { count: 'exact', head: true })
      .not('owner_id', 'is', null).gte('updated_at', last24h),
    supabase.from('centers').select('*', { count: 'exact', head: true })
      .not('owner_id', 'is', null).gte('updated_at', last24h),
    supabase.from('practitioners').select('*', { count: 'exact', head: true })
      .not('owner_id', 'is', null).gte('updated_at', last7d),
    supabase.from('centers').select('*', { count: 'exact', head: true })
      .not('owner_id', 'is', null).gte('updated_at', last7d),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active').eq('tier', 'premium'),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active').eq('tier', 'featured'),
  ]);

  const claimedListings = (claimedPract ?? 0) + (claimedCent ?? 0);
  const newClaimsLast24h = (claims24hPract ?? 0) + (claims24hCent ?? 0);
  const newClaimsLast7d  = (claims7dPract  ?? 0) + (claims7dCent  ?? 0);
  const totalActiveSubscriptions = (activePremium ?? 0) + (activeFeatured ?? 0);

  return {
    totalPractitioners:     totalPract  ?? 0,
    publishedPractitioners: pubPract    ?? 0,
    draftPractitioners:     draftPract  ?? 0,
    totalCenters:           totalCent   ?? 0,
    publishedCenters:       pubCent     ?? 0,
    draftCenters:           draftCent   ?? 0,
    claimedListings,
    newClaimsLast24h,
    newClaimsLast7d,
    activePremium:              activePremium  ?? 0,
    activeFeatured:             activeFeatured ?? 0,
    totalActiveSubscriptions,
  };
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin-metrics'],
    queryFn: fetchAdminMetrics,
    staleTime: 0,          // always re-fetch on mount (tab visit)
    gcTime: 5 * 60 * 1000, // keep in cache 5 min
  });
}
