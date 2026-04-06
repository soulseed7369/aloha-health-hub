/**
 * ga4-metrics/index.ts
 * Supabase Edge Function — fetches GA4 traffic data for the admin overview.
 *
 * Called from the browser via supabase.functions.invoke('ga4-metrics')
 * Admin-only: rejects non-admin callers.
 *
 * Required Supabase secrets (set via Supabase dashboard → Settings → Secrets):
 *   GA4_CLIENT_ID      — OAuth client ID
 *   GA4_CLIENT_SECRET  — OAuth client secret
 *   GA4_REFRESH_TOKEN  — long-lived refresh token (from pipeline/ga4_credentials.json)
 *   GA4_PROPERTY_ID    — numeric GA4 property ID (531122308)
 *
 * Deploy:
 *   supabase functions deploy ga4-metrics --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const ADMIN_EMAILS = ['marcuswoo@gmail.com', 'aloha@hawaiiwellness.net', 'mythicbitcoin@gmail.com'];

// ── GA4 helpers ──────────────────────────────────────────────────────────────

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await resp.json();
  if (!data.access_token) {
    throw new Error(`GA4 token exchange failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function runReport(
  propertyId: string,
  token: string,
  startDate: string,
  endDate: string,
) {
  const resp = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
        ],
      }),
    },
  );
  return await resp.json();
}

function extractRow(report: { rows?: { metricValues: { value: string }[] }[] }) {
  const row = report.rows?.[0];
  if (!row) return { sessions: 0, users: 0, pageviews: 0 };
  return {
    sessions:  parseInt(row.metricValues[0].value, 10),
    users:     parseInt(row.metricValues[1].value, 10),
    pageviews: parseInt(row.metricValues[2].value, 10),
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  try {
    // ── Auth check ───────────────────────────────────────────────────────────
    // Pass the raw JWT explicitly — getUser() without an arg uses the client's
    // internal session cache which is always empty in a fresh edge function instance.
    const authHeader = req.headers.get('authorization') ?? '';
    const jwtToken = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwtToken);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    if (!ADMIN_EMAILS.includes(user.email ?? '')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ── Fetch GA4 data ───────────────────────────────────────────────────────
    const clientId     = Deno.env.get('GA4_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GA4_CLIENT_SECRET')!;
    const refreshToken = Deno.env.get('GA4_REFRESH_TOKEN')!;
    const propertyId   = Deno.env.get('GA4_PROPERTY_ID')!;

    const token = await getAccessToken(clientId, clientSecret, refreshToken);

    const [report7d, report30d] = await Promise.all([
      runReport(propertyId, token, '7daysAgo', 'today'),
      runReport(propertyId, token, '30daysAgo', 'today'),
    ]);

    return new Response(
      JSON.stringify({ last7d: extractRow(report7d), last30d: extractRow(report30d) }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('ga4-metrics error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
