/**
 * request-testimonial-edit/index.ts
 * Supabase Edge Function — allows a practitioner to request editing of a published testimonial.
 *
 * When called, resets the testimonial status to 'pending' so the client can re-submit with fixes.
 * The practitioner receives an edit link to share with their client manually.
 *
 * Called from the browser via supabase.functions.invoke('request-testimonial-edit', { body: { testimonialId } })
 *
 * Deploy:
 *   supabase functions deploy request-testimonial-edit --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Decode JWT payload without verification ──────────────────────────────────
// Safe here because the Supabase gateway has already verified the token.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ── Guard env vars up front ───────────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRole) {
      console.error('Missing Supabase configuration');
      return json({ error: 'Supabase configuration error' }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

    // ── Auth: extract user from JWT ─────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const jwtPayload = decodeJwtPayload(token);

    if (!jwtPayload?.sub) {
      console.error('JWT decode failed');
      return json({ error: 'Invalid token — could not identify user' }, 401);
    }

    const userId = jwtPayload.sub as string;
    console.log('Auth OK', { userId });

    // ── Validate request body ───────────────────────────────────────────
    const body = await req.json();
    const { testimonialId } = body;

    if (!testimonialId) {
      return json({ error: 'Missing required field: testimonialId' }, 400);
    }

    // ── Fetch the testimonial ───────────────────────────────────────────
    const { data: testimonial, error: fetchErr } = await supabaseAdmin
      .from('verified_testimonials')
      .select('id, practitioner_id, invite_status, invite_token')
      .eq('id', testimonialId)
      .single();

    if (fetchErr || !testimonial) {
      console.error('Testimonial fetch failed:', fetchErr);
      return json({ error: 'Testimonial not found' }, 404);
    }

    // ── Verify user owns the practitioner listing ──────────────────────
    const { data: practitioner, error: practErr } = await supabaseAdmin
      .from('practitioners')
      .select('id, owner_id, name')
      .eq('id', testimonial.practitioner_id)
      .eq('owner_id', userId)
      .single();

    if (practErr || !practitioner) {
      return json({ error: 'You do not own this practitioner listing' }, 403);
    }

    // ── Only allow reset if status is 'published' ───────────────────────
    if (testimonial.invite_status !== 'published') {
      return json(
        {
          error: `Cannot request edit on testimonial with status '${testimonial.invite_status}'. Only published testimonials can be edited.`,
        },
        400
      );
    }

    // ── Reset the testimonial ───────────────────────────────────────────
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 14);

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('verified_testimonials')
      .update({
        invite_status: 'pending',
        submitted_at: null,
        published_at: null,
        flagged_at: null,
        flag_reason: null,
        practitioner_response: null,
        responded_at: null,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', testimonialId)
      .select('invite_token')
      .single();

    if (updateErr || !updated) {
      console.error('Update failed:', updateErr);
      return json({ error: 'Failed to reset testimonial' }, 500);
    }

    // ── Build edit URL for practitioner to share ────────────────────────
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.hawaiiwellness.net';
    const editUrl = `${siteUrl}/testimonial/${updated.invite_token}`;

    return json({
      success: true,
      editUrl,
      message: 'Testimonial reset. Share this link with your client to edit.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('request-testimonial-edit error:', { message, stack });
    return json({ error: message || 'Internal server error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
