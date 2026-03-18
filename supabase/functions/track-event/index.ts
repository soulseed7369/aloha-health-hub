import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    const body = await req.json();
    const { event_type } = body;

    if (event_type === 'view') {
      const { listing_id, listing_type, referrer, session_hash } = body;
      if (!listing_id || !listing_type) {
        return json({ error: 'Missing listing_id or listing_type' }, 400);
      }

      // Debounce: skip if same session_hash + listing_id within last 30 minutes
      if (session_hash) {
        const { data: recent } = await supabase
          .from('listing_views')
          .select('id')
          .eq('listing_id', listing_id)
          .eq('session_hash', session_hash)
          .gte('viewed_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
          .limit(1);
        if (recent && recent.length > 0) {
          return json({ ok: true, deduplicated: true });
        }
      }

      await supabase.from('listing_views').insert({
        listing_id, listing_type, referrer: referrer || null, session_hash: session_hash || null,
      });
      return json({ ok: true });
    }

    if (event_type === 'click') {
      const { listing_id, listing_type, click_type } = body;
      if (!listing_id || !listing_type || !click_type) {
        return json({ error: 'Missing required fields' }, 400);
      }
      await supabase.from('contact_clicks').insert({ listing_id, listing_type, click_type });
      return json({ ok: true });
    }

    if (event_type === 'impressions') {
      const { items } = body; // array of { listing_id, listing_type, impression_type }
      if (!Array.isArray(items) || items.length === 0) {
        return json({ error: 'Missing items array' }, 400);
      }
      const rows = items.map((item: any) => ({
        listing_id: item.listing_id,
        listing_type: item.listing_type,
        impression_type: item.impression_type,
      }));
      await supabase.from('listing_impressions').insert(rows);
      return json({ ok: true });
    }

    return json({ error: 'Unknown event_type' }, 400);
  } catch (err) {
    console.error('track-event error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
