/**
 * auth-phone-otp/index.ts
 * Supabase Edge Function — phone-based sign-in via Twilio SMS.
 *
 * Since Supabase's native phone auth is not enabled on this project, this
 * function provides a custom OTP flow:
 *   1. User enters phone → "send" action sends a 6-digit code via Twilio
 *   2. User enters code  → "verify" action checks the hash, looks up the
 *      user by phone in practitioners/centers, then generates a one-time
 *      magic link token via admin API that the client exchanges for a session
 *
 * POST /functions/v1/auth-phone-otp
 * Body: { action: "send", phone: "+18085550100" }
 *    or { action: "verify", phone: "+18085550100", code: "123456" }
 *
 * No Authorization header needed (user is unauthenticated at this point).
 *
 * Deploy:
 *   supabase functions deploy auth-phone-otp --no-verify-jwt
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-set)
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64Encode } from 'https://deno.land/std@0.208.0/encoding/base64.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const TWILIO_SID   = Deno.env.get('TWILIO_ACCOUNT_SID')  ?? '';
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')    ?? '';
const TWILIO_FROM  = Deno.env.get('TWILIO_FROM_NUMBER')   ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function generateCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, '0');
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (raw.trim().startsWith('+') && digits.length >= 10) return `+${digits}`;
  return null;
}

function maskPhone(e164: string): string {
  return e164.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1 *** ***$4');
}

async function sendSms(to: string, body: string): Promise<void> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    throw new Error('SMS is not configured. Please sign in with email instead.');
  }
  const auth = base64Encode(`${TWILIO_SID}:${TWILIO_TOKEN}`);
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[auth-phone-otp] Twilio error:', err);
    throw new Error('Failed to send text message. Please try again or use email sign-in.');
  }
}

/**
 * Look up the auth user linked to this phone number.
 * Searches practitioners and centers tables for a matching phone + owner_id,
 * then fetches the auth user's email.
 */
async function findUserByPhone(phone: string): Promise<{ id: string; email: string } | null> {
  const digits = phone.replace(/\D/g, '');

  // Try practitioners first
  for (const table of ['practitioners', 'centers'] as const) {
    // Supabase default limit is 1000 rows; set explicit higher limit to avoid
    // silently missing records as the directory grows.
    const { data: listings } = await supabase
      .from(table)
      .select('owner_id, phone')
      .not('owner_id', 'is', null)
      .not('phone', 'is', null)
      .limit(5000);

    if (!listings) continue;

    const match = listings.find((l: any) => {
      if (!l.phone) return false;
      const lDigits = l.phone.replace(/\D/g, '');
      // Match last 10 digits (ignore country code differences)
      return lDigits.slice(-10) === digits.slice(-10);
    });

    if (match?.owner_id) {
      const { data: { user } } = await supabase.auth.admin.getUserById(match.owner_id);
      if (user?.email) {
        return { id: user.id, email: user.email };
      }
    }
  }

  return null;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
    const body = await req.json();
    const { action, phone: rawPhone, code } = body;

    if (!rawPhone) return json({ error: 'Phone number is required.' }, 400);

    const phone = normalizePhone(rawPhone);
    if (!phone) return json({ error: 'Please enter a valid US phone number.' }, 400);

    // ── SEND ─────────────────────────────────────────────────────────────────
    if (action === 'send') {
      // Check that an account exists with this phone number
      const user = await findUserByPhone(phone);
      if (!user) {
        return json({
          error: 'No account found with this phone number. Please sign in with your email address, or check that your phone number is on your listing.',
        }, 404);
      }

      // Rate limit: max 5 sends per phone per hour
      const { count } = await supabase
        .from('auth_phone_otps')
        .select('id', { count: 'exact', head: true })
        .eq('phone', phone)
        .gte('created_at', new Date(Date.now() - 3600_000).toISOString());

      if ((count ?? 0) >= 5) {
        return json({ error: 'Too many attempts. Please wait an hour or sign in with email.' }, 429);
      }

      // Invalidate any unexpired codes for this phone (prevents using an old code)
      // Note: we DON'T delete historical rows — they're needed for the rate limit
      // count above. The cleanup trigger removes rows older than 1 hour on each insert.
      await supabase
        .from('auth_phone_otps')
        .update({ expires_at: new Date().toISOString() })
        .eq('phone', phone)
        .gt('expires_at', new Date().toISOString());

      // Generate + store new code
      const rawCode  = generateCode();
      const codeHash = await sha256(rawCode);

      const { error: insertErr } = await supabase.from('auth_phone_otps').insert({
        phone,
        code_hash: codeHash,
      });
      if (insertErr) {
        console.error('[auth-phone-otp] Insert error:', insertErr);
        return json({ error: 'Could not create verification code. Please try again.' }, 500);
      }

      // Send SMS
      await sendSms(phone, `Your Hawai'i Wellness sign-in code is: ${rawCode}. It expires in 10 minutes.`);

      return json({
        success: true,
        maskedPhone: maskPhone(phone),
        expiresInSeconds: 600,
      });
    }

    // ── VERIFY ───────────────────────────────────────────────────────────────
    if (action === 'verify') {
      if (!code || !/^\d{6}$/.test(code)) {
        return json({ error: 'Please enter a valid 6-digit code.' }, 400);
      }

      const codeHash = await sha256(code);

      // Find valid, unexpired code for this phone
      const { data: otpRow, error: otpErr } = await supabase
        .from('auth_phone_otps')
        .select('id, attempts, expires_at')
        .eq('phone', phone)
        .eq('code_hash', codeHash)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpErr || !otpRow) {
        // Increment attempts on the most recent OTP for this phone
        const { data: latestOtp } = await supabase
          .from('auth_phone_otps')
          .select('id, attempts')
          .eq('phone', phone)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestOtp) {
          await supabase
            .from('auth_phone_otps')
            .update({ attempts: (latestOtp.attempts ?? 0) + 1 })
            .eq('id', latestOtp.id);
        }

        return json({ error: 'Invalid or expired code. Please check the code or request a new one.' }, 400);
      }

      // Guard against brute-force
      if ((otpRow.attempts ?? 0) >= 5) {
        await supabase.from('auth_phone_otps').delete().eq('id', otpRow.id);
        return json({ error: 'Too many incorrect attempts. Please request a new code.' }, 400);
      }

      // Delete OTP — prevents reuse
      await supabase.from('auth_phone_otps').delete().eq('id', otpRow.id);

      // Find the user account linked to this phone
      const user = await findUserByPhone(phone);
      if (!user) {
        return json({ error: 'Account not found. Please sign in with email.' }, 404);
      }

      // Generate a one-time magic link token via admin API
      // The client will exchange this for a session using supabase.auth.verifyOtp()
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email,
      });

      if (linkErr || !linkData) {
        console.error('[auth-phone-otp] generateLink error:', linkErr);
        return json({ error: 'Sign-in failed. Please try again or use email sign-in.' }, 500);
      }

      // Extract the token hash from the generated link
      // linkData.properties contains hashed_token and verification_type
      const tokenHash = linkData.properties?.hashed_token;
      if (!tokenHash) {
        console.error('[auth-phone-otp] No hashed_token in generateLink response');
        return json({ error: 'Sign-in failed. Please try email sign-in instead.' }, 500);
      }

      return json({
        success: true,
        tokenHash,
        type: 'magiclink',
      });
    }

    return json({ error: 'Invalid action. Use "send" or "verify".' }, 400);

  } catch (err) {
    console.error('[auth-phone-otp]', err);
    const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    return json({ error: msg }, 500);
  }
});
