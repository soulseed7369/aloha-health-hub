/**
 * send-monthly-report/index.ts
 * Supabase Edge Function — sends monthly analytics report to Featured listing owners.
 *
 * Triggered by pg_cron or manual invocation on the 1st of each month.
 *
 * Deploy:
 *   supabase functions deploy send-monthly-report --no-verify-jwt
 *   supabase secrets set RESEND_API_KEY=re_xxxxx
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ListingReport {
  listing_id: string;
  listing_name: string;
  listing_type: string;
  owner_email: string;
  views_this_month: number;
  views_last_month: number;
  clicks_this_month: number;
  clicks_by_type: Record<string, number>;
  impressions_this_month: number;
  impressions_by_type: Record<string, number>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return json({ error: 'RESEND_API_KEY not configured' }, 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Date ranges
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();

    const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
      .format(new Date(now.getFullYear(), now.getMonth() - 1));

    // Get all featured practitioners with owner emails
    const { data: featuredPractitioners } = await supabase
      .from('practitioners')
      .select('id, name, owner_id')
      .eq('tier', 'featured')
      .eq('status', 'published')
      .not('owner_id', 'is', null);

    // Get all featured centers with owner emails
    const { data: featuredCenters } = await supabase
      .from('centers')
      .select('id, name, owner_id')
      .eq('tier', 'featured')
      .eq('status', 'published')
      .not('owner_id', 'is', null);

    const allListings = [
      ...(featuredPractitioners || []).map(p => ({ ...p, listing_type: 'practitioner' })),
      ...(featuredCenters || []).map(c => ({ ...c, listing_type: 'center' })),
    ];

    if (allListings.length === 0) {
      return json({ sent: 0, message: 'No featured listings found' });
    }

    // Get owner emails
    const ownerIds = [...new Set(allListings.map(l => l.owner_id))];
    const { data: users } = await supabase.auth.admin.listUsers();
    const emailMap: Record<string, string> = {};
    (users?.users || []).forEach(u => { if (u.email) emailMap[u.id] = u.email; });

    let sent = 0;
    const errors: string[] = [];

    for (const listing of allListings) {
      const ownerEmail = emailMap[listing.owner_id];
      if (!ownerEmail) continue;

      // Fetch analytics for this listing
      const { data: viewsThisMonth } = await supabase
        .from('listing_views')
        .select('id', { count: 'exact' })
        .eq('listing_id', listing.id)
        .gte('viewed_at', thisMonthStart)
        .lt('viewed_at', thisMonthEnd);

      const { data: viewsLastMonth } = await supabase
        .from('listing_views')
        .select('id', { count: 'exact' })
        .eq('listing_id', listing.id)
        .gte('viewed_at', lastMonthStart)
        .lt('viewed_at', thisMonthStart);

      const { data: clicks } = await supabase
        .from('contact_clicks')
        .select('click_type')
        .eq('listing_id', listing.id)
        .gte('clicked_at', thisMonthStart)
        .lt('clicked_at', thisMonthEnd);

      const { data: impressions } = await supabase
        .from('listing_impressions')
        .select('impression_type')
        .eq('listing_id', listing.id)
        .gte('impressed_at', thisMonthStart)
        .lt('impressed_at', thisMonthEnd);

      const viewsCount = viewsThisMonth?.length ?? 0;
      const lastMonthCount = viewsLastMonth?.length ?? 0;
      const clicksCount = clicks?.length ?? 0;
      const impressionsCount = impressions?.length ?? 0;

      // Click breakdown
      const clickBreakdown: Record<string, number> = {};
      (clicks || []).forEach(c => {
        clickBreakdown[c.click_type] = (clickBreakdown[c.click_type] || 0) + 1;
      });

      // Impression breakdown
      const impBreakdown: Record<string, number> = {};
      (impressions || []).forEach(imp => {
        impBreakdown[imp.impression_type] = (impBreakdown[imp.impression_type] || 0) + 1;
      });

      const viewsChange = lastMonthCount > 0
        ? Math.round(((viewsCount - lastMonthCount) / lastMonthCount) * 100)
        : viewsCount > 0 ? 100 : 0;
      const changeLabel = viewsChange > 0 ? `+${viewsChange}%` : viewsChange < 0 ? `${viewsChange}%` : 'No change';

      // Build email HTML
      const clickRows = Object.entries(clickBreakdown)
        .map(([type, count]) => `<tr><td style="padding: 6px 12px; border-bottom: 1px solid #e5e7eb; text-transform: capitalize;">${type.replace('_', ' ')}</td><td style="padding: 6px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${count}</td></tr>`)
        .join('');

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">

    <div style="background: linear-gradient(135deg, #0d9488, #0891b2); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">Monthly Analytics Report</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">${listing.name} · ${monthLabel}</p>
    </div>

    <div style="padding: 32px;">
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; background: #f0fdfa; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #0d9488;">${viewsCount}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Profile Views</div>
          <div style="font-size: 11px; color: ${viewsChange >= 0 ? '#059669' : '#dc2626'}; margin-top: 2px;">${changeLabel} vs last month</div>
        </div>
        <div style="flex: 1; background: #eff6ff; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #2563eb;">${clicksCount}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Contact Clicks</div>
        </div>
        <div style="flex: 1; background: #fefce8; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #ca8a04;">${impressionsCount}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Impressions</div>
        </div>
      </div>

      ${clickRows ? `
      <h3 style="font-size: 14px; font-weight: 600; margin: 24px 0 12px; color: #1f2937;">Contact Click Breakdown</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        ${clickRows}
      </table>
      ` : ''}

      ${impBreakdown.homepage ? `
      <div style="margin-top: 24px; padding: 16px; background: #fffbeb; border-radius: 8px; border: 1px solid #fde68a;">
        <p style="margin: 0; font-size: 13px; color: #92400e;">
          <strong>Homepage Spotlight:</strong> Your listing appeared <strong>${impBreakdown.homepage}</strong> times on the homepage this month.
        </p>
      </div>
      ` : ''}

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
        <a href="https://www.hawaiiwellness.net/dashboard/analytics" style="display: inline-block; background: #0d9488; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          View Full Analytics Dashboard
        </a>
        <p style="margin-top: 16px; font-size: 11px; color: #9ca3af;">
          This report is sent monthly to Featured listing owners on Hawaiʻi Wellness.<br>
          To stop receiving these reports, downgrade your plan in your dashboard.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

      // Send via Resend
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Hawaiʻi Wellness <analytics@hawaiiwellness.net>',
            to: [ownerEmail],
            subject: `Your ${monthLabel} Analytics Report — ${listing.name}`,
            html,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const errBody = await res.text();
          errors.push(`${listing.name}: ${errBody}`);
        }
      } catch (emailErr) {
        errors.push(`${listing.name}: ${emailErr}`);
      }
    }

    return json({ sent, total: allListings.length, errors: errors.length > 0 ? errors : undefined });

  } catch (err) {
    console.error('send-monthly-report error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
