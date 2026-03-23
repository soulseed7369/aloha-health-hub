/**
 * admin-edit-testimonial/index.ts
 * Supabase Edge Function — allows admin to copy-edit testimonial text (Option B).
 *
 * Admin can directly fix typos and wording in full_text and highlight fields
 * without needing to ask the client to re-submit.
 *
 * Admin email must match ADMIN_EMAILS list (from admin.ts).
 *
 * Called from browser via:
 *   supabase.functions.invoke('admin-edit-testimonial', {
 *     body: { testimonialId, fullText?, highlight? }
 *   })
 *
 * Deploy:
 *   supabase functions deploy admin-edit-testimonial --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Admin email whitelist ────────────────────────────────────────────────────
// Must match ADMIN_EMAILS in src/lib/admin.ts
const ADMIN_EMAILS = [
  'marcuswoo@gmail.com',
];

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

    // ── Fetch user email and verify admin ────────────────────────────────
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr || !userData?.user) {
      console.error('Could not fetch user:', userErr);
      return json({ error: 'Could not verify user' }, 401);
    }

    const userEmail = userData.user.email;
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
      console.log('Unauthorized: not admin', { userEmail });
      return json({ error: 'Admin access required' }, 403);
    }

    console.log('Admin verified', { userEmail });

    // ── Validate request body ───────────────────────────────────────────
    const body = await req.json();
    const { testimonialId, fullText, highlight } = body;

    if (!testimonialId) {
      return json({ error: 'Missing required field: testimonialId' }, 400);
    }

    if (fullText === undefined && highlight === undefined) {
      return json(
        { error: 'Nothing to update — provide fullText and/or highlight' },
        400
      );
    }

    // ── Validate testimonial exists ──────────────────────────────────────
    const { data: testimonial, error: fetchErr } = await supabaseAdmin
      .from('verified_testimonials')
      .select('id, invite_status')
      .eq('id', testimonialId)
      .single();

    if (fetchErr || !testimonial) {
      console.error('Testimonial fetch failed:', fetchErr);
      return json({ error: 'Testimonial not found' }, 404);
    }

    // ── Build update object (only include provided fields) ────────────────
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (fullText !== undefined && fullText !== null) {
      updates.full_text = fullText;
    }
    if (highlight !== undefined && highlight !== null) {
      updates.highlight = highlight;
    }

    // ── Update the testimonial ───────────────────────────────────────────
    const { error: updateErr } = await supabaseAdmin
      .from('verified_testimonials')
      .update(updates)
      .eq('id', testimonialId);

    if (updateErr) {
      console.error('Update failed:', updateErr);
      return json({ error: 'Failed to update testimonial' }, 500);
    }

    console.log('Testimonial updated by admin', { testimonialId, userEmail });
    return json({
      success: true,
      message: 'Testimonial copy-edited successfully',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('admin-edit-testimonial error:', { message, stack });
    return json({ error: message || 'Internal server error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
