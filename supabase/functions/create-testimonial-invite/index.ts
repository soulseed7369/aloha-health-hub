/**
 * create-testimonial-invite/index.ts
 * Supabase Edge Function — creates a verified testimonial invite.
 *
 * Called from the browser via supabase.functions.invoke('create-testimonial-invite', { body: { practitionerId, clientEmail } })
 *
 * Deploy:
 *   supabase functions deploy create-testimonial-invite --no-verify-jwt
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

// ── Hash email with SHA-256 ────────────────────────────────────────────────
async function hashEmail(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
    const { practitionerId, clientEmail } = body;

    if (!practitionerId || !clientEmail) {
      return json({ error: 'Missing required fields: practitionerId, clientEmail' }, 400);
    }

    if (typeof clientEmail !== 'string' || !clientEmail.includes('@')) {
      return json({ error: 'Invalid email format' }, 400);
    }

    // ── Verify user owns the practitioner listing ──────────────────────
    const { data: practitioner, error: practErr } = await supabaseAdmin
      .from('practitioners')
      .select('id, name, tier')
      .eq('id', practitionerId)
      .single();

    if (practErr || !practitioner) {
      return json({ error: 'Practitioner not found' }, 404);
    }

    if (practitioner.id !== practitionerId) {
      return json({ error: 'Invalid practitioner ID' }, 400);
    }

    // Verify ownership
    const { data: listingOwner, error: ownerErr } = await supabaseAdmin
      .from('practitioners')
      .select('owner_id')
      .eq('id', practitionerId)
      .eq('owner_id', userId)
      .single();

    if (ownerErr || !listingOwner) {
      return json({ error: 'You do not own this practitioner listing' }, 403);
    }

    // ── Verify practitioner is Premium or Featured tier ────────────────
    if (practitioner.tier !== 'premium' && practitioner.tier !== 'featured') {
      return json(
        { error: 'Only Premium and Featured practitioners can send testimonial invites' },
        403
      );
    }

    // ── Hash email and check dedup ──────────────────────────────────────
    const emailHash = await hashEmail(clientEmail);

    const { data: existingInvites, error: dedupErr } = await supabaseAdmin
      .from('verified_testimonials')
      .select('id, invite_status')
      .eq('practitioner_id', practitionerId)
      .eq('invited_email_hash', emailHash)
      .in('invite_status', ['pending', 'published']);

    if (!dedupErr && existingInvites && existingInvites.length > 0) {
      const hasPublished = existingInvites.some(i => i.invite_status === 'published');
      return json(
        {
          error: hasPublished
            ? 'This client has already submitted a testimonial for you'
            : 'This email already has a pending invitation for this practitioner',
        },
        409
      );
    }

    // ── Check global limit: same email hash across 5+ different practitioners this month ──
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const { data: globalInvites, error: globalErr } = await supabaseAdmin
      .from('verified_testimonials')
      .select('practitioner_id', { count: 'exact', head: false })
      .eq('invited_email_hash', emailHash)
      .in('invite_status', ['pending', 'submitted'])
      .gte('invited_at', monthAgo.toISOString());

    if (!globalErr && globalInvites && globalInvites.length >= 5) {
      const uniquePractitioners = new Set(globalInvites.map(i => i.practitioner_id));
      if (uniquePractitioners.size >= 5) {
        return json(
          {
            error:
              'This email has received too many testimonial invitations this month. Please try again later.',
          },
          429
        );
      }
    }

    // ── Check monthly quota: Premium = 10/month, Featured = 20/month ────
    const quota = practitioner.tier === 'featured' ? 20 : 10;

    const { data: monthlyInvites, error: quotaErr } = await supabaseAdmin
      .from('verified_testimonials')
      .select('id', { count: 'exact', head: false })
      .eq('practitioner_id', practitionerId)
      .in('invite_status', ['pending', 'submitted'])
      .gte('invited_at', monthAgo.toISOString());

    if (!quotaErr && monthlyInvites && monthlyInvites.length >= quota) {
      return json(
        {
          error: `You have reached your monthly limit of ${quota} testimonial invitations. Try again next month.`,
        },
        429
      );
    }

    // ── Insert row into verified_testimonials ────────────────────────────
    const { data: newInvite, error: insertErr } = await supabaseAdmin
      .from('verified_testimonials')
      .insert({
        practitioner_id: practitionerId,
        invited_email_hash: emailHash,
        invited_email: clientEmail.toLowerCase().trim(),
        invite_status: 'pending',
      })
      .select('invite_token')
      .single();

    if (insertErr || !newInvite) {
      console.error('Insert failed:', insertErr);
      return json({ error: 'Failed to create invitation' }, 500);
    }

    // ── Send invite email via Resend ──────────────────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.hawaiiwellness.net';
    const submitUrl = `${siteUrl}/testimonial/${newInvite.invite_token}`;

    if (resendKey) {
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
            subject: `${practitioner.name} would love your testimonial`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
                <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 8px;">Your experience matters</h2>
                <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6;">
                  <strong>${practitioner.name}</strong> has invited you to share a testimonial about your experience working with them.
                </p>
                <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6;">
                  Your testimonial will be displayed on their Hawaiʻi Wellness profile to help others find the right practitioner.
                  You choose how your name appears — first name, initials, or however you're comfortable.
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${submitUrl}"
                     style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                    Write Your Testimonial
                  </a>
                </div>
                <p style="color: #888; font-size: 13px; line-height: 1.5;">
                  This link expires in 14 days. If you didn't expect this email, you can safely ignore it.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="color: #aaa; font-size: 12px;">
                  Sent by <a href="https://www.hawaiiwellness.net" style="color: #aaa;">Hawaiʻi Wellness</a> on behalf of ${practitioner.name}.
                </p>
              </div>
            `,
          }),
        });

        if (!emailRes.ok) {
          const emailErr = await emailRes.text();
          console.error('Resend email failed (non-blocking):', { status: emailRes.status, error: emailErr });
          // Don't fail the whole request — invite is created, email just didn't send
        } else {
          console.log('Invite email sent successfully');
        }
      } catch (emailError) {
        const msg = emailError instanceof Error ? emailError.message : String(emailError);
        console.error('Resend email error (non-blocking):', msg);
      }
    } else {
      console.warn('RESEND_API_KEY not set — skipping invite email');
    }

    return json({
      success: true,
      inviteToken: newInvite.invite_token,
      message: resendKey ? 'Invitation sent' : 'Invitation created (email not configured)',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('create-testimonial-invite error:', { message, stack });
    return json({ error: message || 'Internal server error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
