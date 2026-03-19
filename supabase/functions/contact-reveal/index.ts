import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': 'https://hawaiiwellness.net',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Simple IP hash (no raw IPs stored)
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + (Deno.env.get('RATE_LIMIT_SALT') ?? 'hw-salt'));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const type = url.searchParams.get('type');
  const listingType = url.searchParams.get('listing_type') ?? 'practitioner';

  // Validate
  if (!id || !type || !['phone', 'email'].includes(type)
      || !['practitioner', 'center'].includes(listingType)) {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Rate limit: 10 reveals per IP per hour
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipHash = await hashIp(ip);
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  const { count } = await supabase
    .from('contact_reveals')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', oneHourAgo);

  if ((count ?? 0) >= 10) {
    return new Response(JSON.stringify({ error: 'Rate limit — try again later' }), {
      status: 429, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  // Fetch the contact field (only from published listings)
  const table = listingType === 'center' ? 'centers' : 'practitioners';
  const field = type === 'phone' ? 'phone' : 'email';

  const { data, error } = await supabase
    .from(table)
    .select(field)
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  // Log the reveal
  await supabase.from('contact_reveals').insert({
    listing_id: id, listing_type: listingType, reveal_type: type,
    ip_hash: ipHash,
  });

  return new Response(JSON.stringify({ value: (data as any)[field] }), {
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
});
