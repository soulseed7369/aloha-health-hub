/**
 * send-verification-code/index.ts
 * Supabase Edge Function — sends a 6-digit OTP via email or SMS.
 *
 * - SMS: Twilio REST API
 * - Email: Supabase Auth's signInWithOtp (reuses project's configured SMTP — zero extra cost)
 *
 * The Supabase OTP is used purely as a delivery mechanism. We store our OWN
 * code hash in verification_codes and validate against that — never against
 * Supabase Auth's OTP. This means the email recipient doesn't need a
 * Supabase account, and we control expiry / rate limits independently.
 *
 * POST /functions/v1/send-verification-code
 * Authorization: Bearer <user JWT>
 * Body: { listingId, listingType: "practitioner"|"center", channel: "email"|"phone" }
 *
 * Deploy: supabase functions deploy send-verification-code --no-verify-jwt
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-set by Supabase)
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER  (for SMS)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64Encode } from 'https://deno.land/std@0.208.0/encoding/base64.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ── Twilio config (SMS) ─────────────────────────────────────────────────────
const TWILIO_SID    = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_FROM   = Deno.env.get('TWILIO_FROM_NUMBER') ?? '';

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

/** Generate a cryptographically random 6-digit code */
function generateCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

/** SHA-256 hex digest — sufficient for short-lived OTPs */
async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Normalize US phone to E.164 (+1XXXXXXXXXX) */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

// ── SMS via Twilio ──────────────────────────────────────────────────────────

async function sendSms(to: string, body: string): Promise<void> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    throw new Error('Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const auth = base64Encode(`${TWILIO_SID}:${TWILIO_TOKEN}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Twilio error: ${err.message ?? res.statusText}`);
  }
}

// ── Email via Supabase Auth ─────────────────────────────────────────────────
// Strategy: call GoTrue admin endpoint to send an OTP email to the listing's
// email address. Supabase sends this through its already-configured SMTP.
//
// We use the admin API with service_role key, which bypasses rate limits
// and works even if the email isn't a registered user (shouldCreateUser: true
// creates a "phantom" user that can be cleaned up, or false skips if no user).
//
// Since we want the email to arrive regardless of whether the recipient has
// a Supabase account, we'll use a two-step approach:
//   1. Ensure a placeholder auth user exists for this email (idempotent)
//   2. Send OTP to that email via signInWithOtp
//
// The Supabase OTP that arrives in the email is NOT what we validate —
// our verification_codes table holds the real code. The Supabase email is
// just the delivery vehicle.
//
// ALTERNATIVE: If you later configure custom SMTP on the Supabase project,
// the emails will come from your domain (e.g. noreply@hawaiiwellness.net).

async function sendEmailViaSupabase(to: string, code: string, listingName: string): Promise<void> {
  // Use GoTrue admin API to send a magic link / OTP email.
  // We'll actually use the admin.generateLink approach which gives us control
  // without necessarily sending an email — then we send our own via the GoTrue
  // SMTP by triggering a password recovery (which sends a branded email).
  //
  // Simplest approach: just use the regular signInWithOtp via the admin client.
  // The email will contain Supabase's standard OTP code (which we ignore).
  // But the subject line will say something like "Your sign in code".
  //
  // Better approach for a branded experience: use the GoTrue /invite endpoint
  // which allows custom data, or configure an email template in Supabase
  // Dashboard → Auth → Email Templates.
  //
  // For now, pragmatic solution: use signInWithOtp. Update the Supabase
  // email template for "Magic Link" to include our branding.

  // First, ensure the email has a user account (needed for OTP delivery)
  // Use admin API to create user if not exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const userExists = existingUsers?.users?.some(
    (u: any) => u.email?.toLowerCase() === to.toLowerCase()
  );

  if (!userExists) {
    // Create a minimal user so OTP can be sent to this email
    const { error: createErr } = await supabase.auth.admin.createUser({
      email: to,
      email_confirm: true,  // auto-confirm so OTP can be sent immediately
      user_metadata: { source: 'listing_verification', listing_name: listingName },
    });
    // Ignore "already exists" errors
    if (createErr && !createErr.message.includes('already been registered')) {
      console.error('Failed to create placeholder user:', createErr.message);
      // Don't throw — try sending anyway
    }
  }

  // Send the OTP email via Supabase Auth
  const { error: otpErr } = await supabase.auth.signInWithOtp({
    email: to,
    options: {
      shouldCreateUser: false,
      data: {
        verification_code: code,
        listing_name: listingName,
      },
    },
  });

  if (otpErr) {
    throw new Error(`Email sending failed: ${otpErr.message}`);
  }

  // NOTE: The email that arrives will contain Supabase's OTP (which the user
  // can ignore). To customize, go to Supabase Dashboard → Auth → Email Templates
  // → "Magic Link" and add something like:
  //
  //   <h2>Verify your listing: {{ .Data.listing_name }}</h2>
  //   <p>Your verification code is: <strong>{{ .Data.verification_code }}</strong></p>
  //   <p>This code expires in 10 minutes.</p>
  //
  // This way the email shows YOUR code (from .Data.verification_code) prominently,
  // not the Supabase magic link token.
}

// ── Main handler ────────────────────────────────────────────────────────────

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
    const { listingId, listingType, channel } = await req.json();

    if (!listingId || !listingType || !channel) {
      return json({ error: 'Missing required fields: listingId, listingType, channel' }, 400);
    }
    if (!['practitioner', 'center'].includes(listingType)) {
      return json({ error: 'listingType must be "practitioner" or "center"' }, 400);
    }
    if (!['email', 'phone'].includes(channel)) {
      return json({ error: 'channel must be "email" or "phone"' }, 400);
    }

    // ── Fetch listing and verify ownership ──────────────────────────────────
    const table = listingType === 'practitioner' ? 'practitioners' : 'centers';
    const { data: listing, error: listErr } = await supabase
      .from(table)
      .select('id, name, owner_id, email, phone')
      .eq('id', listingId)
      .single();

    if (listErr || !listing) {
      return json({ error: 'Listing not found' }, 404);
    }
    if (listing.owner_id !== user.id) {
      return json({ error: 'You do not own this listing' }, 403);
    }

    // ── Get destination (email or phone from listing) ───────────────────────
    let destination: string;

    if (channel === 'email') {
      if (!listing.email) {
        return json({ error: 'No email address on this listing. Add one first.' }, 400);
      }
      destination = listing.email;
    } else {
      if (!listing.phone) {
        return json({ error: 'No phone number on this listing. Add one first.' }, 400);
      }
      const normalized = normalizePhone(listing.phone);
      if (!normalized) {
        return json({ error: 'Invalid phone number format. Use a 10-digit US number.' }, 400);
      }
      destination = normalized;
    }

    // ── Generate code and store hash ────────────────────────────────────────
    const code = generateCode();
    const codeHash = await hashCode(code);

    const { data: codeId, error: storeErr } = await supabase.rpc('store_verification_code', {
      p_listing_id: listingId,
      p_listing_type: listingType,
      p_channel: channel,
      p_code_hash: codeHash,
      p_destination: destination,
    });

    if (storeErr) {
      if (storeErr.message.includes('rate_limit')) {
        return json({ error: 'Too many verification attempts. Please try again in an hour.' }, 429);
      }
      return json({ error: `Failed to store code: ${storeErr.message}` }, 500);
    }

    // ── Send the code ───────────────────────────────────────────────────────
    const listingName = listing.name || 'your listing';

    if (channel === 'phone') {
      await sendSms(
        destination,
        `Your Aloha Health Hub verification code is: ${code}. It expires in 10 minutes.`,
      );
    } else {
      await sendEmailViaSupabase(destination, code, listingName);
    }

    // ── Respond with masked destination ─────────────────────────────────────
    const masked = channel === 'email'
      ? destination.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c)
      : destination.replace(/(\+\d)(\d{6})(\d{4})/, '$1******$3');

    return json({
      success: true,
      codeId,
      channel,
      destination: masked,
      expiresInSeconds: 600,
    });

  } catch (err) {
    console.error('[send-verification-code] Error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
