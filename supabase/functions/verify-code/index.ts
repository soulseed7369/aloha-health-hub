/**
 * verify-code/index.ts
 * Supabase Edge Function — verifies a 6-digit OTP against the stored hash.
 *
 * POST /functions/v1/verify-code
 * Authorization: Bearer <user JWT>
 * Body: { listingId, listingType: "practitioner"|"center", channel: "email"|"phone", code: "123456" }
 *
 * Deploy: supabase functions deploy verify-code
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://hawaiiwellness.net',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/** SHA-256 hex digest — must match send-verification-code's hash function */
async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ── Auth check ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    // ── Parse body ──────────────────────────────────────────────────────────
    const { listingId, listingType, channel, code } = await req.json();

    if (!listingId || !listingType || !channel || !code) {
      return json({ error: 'Missing required fields: listingId, listingType, channel, code' }, 400);
    }
    if (!['practitioner', 'center'].includes(listingType)) {
      return json({ error: 'listingType must be "practitioner" or "center"' }, 400);
    }
    if (!['email', 'phone'].includes(channel)) {
      return json({ error: 'channel must be "email" or "phone"' }, 400);
    }
    if (!/^\d{6}$/.test(code)) {
      return json({ error: 'Code must be exactly 6 digits' }, 400);
    }

    // ── Verify ownership ────────────────────────────────────────────────────
    const table = listingType === 'practitioner' ? 'practitioners' : 'centers';
    const { data: listing, error: listErr } = await supabase
      .from(table)
      .select('id, owner_id')
      .eq('id', listingId)
      .single();

    if (listErr || !listing) {
      return json({ error: 'Listing not found' }, 404);
    }
    if (listing.owner_id !== user.id) {
      return json({ error: 'You do not own this listing' }, 403);
    }

    // ── Check the code via RPC ──────────────────────────────────────────────
    const codeHash = await hashCode(code);

    const { data: isValid, error: verifyErr } = await supabase.rpc('check_verification_code', {
      p_listing_id: listingId,
      p_listing_type: listingType,
      p_channel: channel,
      p_code_hash: codeHash,
    });

    if (verifyErr) {
      return json({ error: `Verification failed: ${verifyErr.message}` }, 500);
    }

    if (!isValid) {
      return json({
        success: false,
        error: 'Invalid or expired code. Check the code and try again, or request a new one.',
      }, 400);
    }

    // ── Return success with updated verification status ─────────────────────
    const verifiedField = channel === 'email' ? 'email_verified_at' : 'phone_verified_at';
    const { data: updated } = await supabase
      .from(table)
      .select(`email_verified_at, phone_verified_at`)
      .eq('id', listingId)
      .single();

    return json({
      success: true,
      channel,
      verifiedAt: updated?.[verifiedField],
      emailVerified: !!updated?.email_verified_at,
      phoneVerified: !!updated?.phone_verified_at,
    });

  } catch (err) {
    console.error('[verify-code] Error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
