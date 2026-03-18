import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AnalyticsSummary {
  totalViews30d: number;
  totalClicks30d: number;
  clicksByType: Record<string, number>;
  viewsByDay: Array<{ date: string; count: number }>;
  impressions30d: number;
  impressionsByType: Record<string, number>;
}

export function useListingAnalytics(listingId: string | null) {
  return useQuery<AnalyticsSummary | null>({
    queryKey: ['listing-analytics', listingId],
    enabled: !!listingId && !!supabase,
    queryFn: async () => {
      if (!supabase || !listingId) return null;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Views last 30 days
      const { data: views } = await supabase
        .from('listing_views')
        .select('viewed_at')
        .eq('listing_id', listingId)
        .gte('viewed_at', thirtyDaysAgo);

      // Clicks last 30 days
      const { data: clicks } = await supabase
        .from('contact_clicks')
        .select('click_type, clicked_at')
        .eq('listing_id', listingId)
        .gte('clicked_at', thirtyDaysAgo);

      // Impressions last 30 days
      const { data: impressions } = await supabase
        .from('listing_impressions')
        .select('impression_type, impressed_at')
        .eq('listing_id', listingId)
        .gte('impressed_at', thirtyDaysAgo);

      // Group views by day
      const viewsByDay: Record<string, number> = {};
      (views || []).forEach(v => {
        const day = v.viewed_at.split('T')[0];
        viewsByDay[day] = (viewsByDay[day] || 0) + 1;
      });

      // Fill in missing days
      const days: Array<{ date: string; count: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split('T')[0];
        days.push({ date: key, count: viewsByDay[key] || 0 });
      }

      // Group clicks by type
      const clicksByType: Record<string, number> = {};
      (clicks || []).forEach(c => {
        clicksByType[c.click_type] = (clicksByType[c.click_type] || 0) + 1;
      });

      // Group impressions by type
      const impressionsByType: Record<string, number> = {};
      (impressions || []).forEach(imp => {
        impressionsByType[imp.impression_type] = (impressionsByType[imp.impression_type] || 0) + 1;
      });

      return {
        totalViews30d: views?.length ?? 0,
        totalClicks30d: clicks?.length ?? 0,
        clicksByType,
        viewsByDay: days,
        impressions30d: impressions?.length ?? 0,
        impressionsByType,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
