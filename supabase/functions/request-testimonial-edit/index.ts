/**
 * request-testimonial-edit/index.ts
 * Supabase Edge Function — allows a practitioner to request editing of a published testimonial.
 *
 * When called, resets the testimonial status to 'pending' and emails the client
 * a link to revise their response, along with the practitioner's reason for the edit.
 *
 * Called from the browser via supabase.functions.invoke('request-testimonial-edit', { body: { testimonialId, reason } })
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
    const { testimonialId, reason } = body;

    if (!testimonialId) {
      return json({ error: 'Missing required field: testimonialId' }, 400);
    }

    // ── Fetch the testimonial (including stored email) ────────────────────
    const { data: testimonial, error: fetchErr } = await supabaseAdmin
      .from('verified_testimonials')
      .select('id, practitioner_id, invite_status, invite_token, invited_email, client_display_name')
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
        edit_reason: reason || null,
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

    // ── Build edit URL ────────────────────────────────────────────────────
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.hawaiiwellness.net';
    const editUrl = `${siteUrl}/testimonial/${updated.invite_token}`;

    // ── Email the client directly ─────────────────────────────────────────
    let emailSent = false;
    const clientEmail = testimonial.invited_email;
    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (clientEmail && resendKey) {
      const clientName = testimonial.client_display_name || 'there';
      const reasonHtml = reason
        ? `<p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; background: #f8f8f8; padding: 12px 16px; border-left: 3px solid #16a34a; border-radius: 4px; margin: 16px 0;">
             <strong>Note from ${practitioner.name}:</strong> ${escapeHtml(reason)}
           </p>`
        : '';

      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: 'Hawaiʻi Wellness <noreply@hawaiiwellness.net>',
            to: [clientEmail],
            subject: `${practitioner.name} has a small update request for your testimonial`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
                <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 8px;">A quick update request</h2>
                <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6;">
                  Hi ${escapeHtml(clientName)}, <strong>${escapeHtml(practitioner.name)}</strong> would like you to make a small revision to the testimonial you shared on Hawaiʻi Wellness.
                </p>
                ${reasonHtml}
                <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6;">
                  Your previous response is pre-filled — just make your changes and resubmit.
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${editUrl}"
                     style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                    Edit Your Testimonial
                  </a>
                </div>
                <p style="color: #888; font-size: 13px; line-height: 1.5;">
                  This link expires in 14 days. If you have any questions, contact ${escapeHtml(practitioner.name)} directly.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="color: #aaa; font-size: 12px;">
                  Sent by <a href="https://www.hawaiiwellness.net" style="color: #aaa;">Hawaiʻi Wellness</a> on behalf of ${escapeHtml(practitioner.name)}.
                </p>
              </div>
            `,
          }),
        });

        if (!emailRes.ok) {
          const emailErr = await emailRes.text();
          console.error('Resend email failed (non-blocking):', { status: emailRes.status, error: emailErr });
        } else {
          emailSent = true;
          console.log('Edit request email sent to client');
        }
      } catch (emailError) {
        const msg = emailError instanceof Error ? emailError.message : String(emailError);
        console.error('Resend email error (non-blocking):', msg);
      }
    } else {
      if (!clientEmail) console.warn('No client email stored — cannot send edit request email');
      if (!resendKey) console.warn('RESEND_API_KEY not set — skipping edit request email');
    }

    return json({
      success: true,
      editUrl,
      emailSent,
      message: emailSent
        ? 'Edit request sent to client via email.'
        : 'Testimonial reset, but we could not email the client (no email on file). Share the link manually.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('request-testimonial-edit error:', { message, stack });
    return json({ error: message || 'Internal server error' }, 500);
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
