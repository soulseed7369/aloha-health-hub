/**
 * process-claim-drip/index.ts
 * Supabase Edge Function — processes the claim_drip_queue table.
 *
 * Called every 15 minutes by pg_cron. Picks up due rows, skips upgraded
 * providers on steps 2+, sends via Resend, marks sent/skipped.
 *
 * Auth: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *
 * Deploy:
 *   supabase functions deploy process-claim-drip --no-verify-jwt
 *
 * Env vars (already set on project):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE_URL = 'https://www.hawaiiwellness.net';
const FROM     = 'Marcus from Hawaiʻi Wellness <aloha@hawaiiwellness.net>';
const REPLY_TO = 'aloha@hawaiiwellness.net';

const ISLAND_DISPLAY: Record<string, string> = {
  big_island: 'Big Island',
  maui:       'Maui',
  oahu:       'Oʻahu',
  kauai:      'Kauaʻi',
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DripRow {
  id:           string;
  listing_id:   string;
  listing_type: 'practitioner' | 'center';
  email:        string;
  name:         string | null;
  island:       string | null;
  modalities:   string[] | null;
  step:         1 | 2 | 3;
}

interface EmailTemplate {
  subject:  string;
  html:     string;
  text:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email templates
// ─────────────────────────────────────────────────────────────────────────────

const headerHtml = `
  <div style="background:#f0f9ff;padding:20px 32px;text-align:center;border-bottom:1px solid #e0f2fe;">
    <a href="${SITE_URL}" style="text-decoration:none;">
      <img src="${SITE_URL}/hawaii-wellness-logo.png" alt="Hawaiʻi Wellness"
           width="120" style="width:120px;height:auto;display:block;margin:0 auto;" />
    </a>
  </div>`;

const footerHtml = `
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;
              text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;">
    <p style="margin:0 0 4px;">
      <a href="${SITE_URL}" style="color:#94a3b8;">Hawaiʻi Wellness</a>
      · PO Box 44368, Kamuela, HI 96743
    </p>
    <p style="margin:0;">
      You're receiving this because you claimed a listing in our directory.<br />
      Questions? Reply anytime — I read every email.
    </p>
  </div>`;

function wrapHtml(body: string): string {
  return `<!DOCTYPE html><html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:16px;background:#f1f5f9;">
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
              max-width:560px;margin:0 auto;background:#fff;border-radius:12px;
              overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    ${headerHtml}
    <div style="padding:32px;color:#1e293b;line-height:1.7;">
      ${body}
    </div>
    ${footerHtml}
  </div>
</body>
</html>`;
}

function btn(label: string, url: string): string {
  return `<p style="margin:28px 0;text-align:center;">
    <a href="${url}"
       style="background:#0369a1;color:#fff;padding:14px 32px;border-radius:8px;
              text-decoration:none;font-weight:600;display:inline-block;">
      ${label}
    </a>
  </p>`;
}

// Step 1 — immediate welcome
function step1(row: DripRow): EmailTemplate {
  const name     = row.name || 'there';
  const island   = ISLAND_DISPLAY[row.island ?? ''] || 'Hawaiʻi';
  const modality = row.modalities?.[0] || 'wellness';
  const kind     = row.listing_type === 'center' ? 'center' : 'profile';
  const dashUrl  = `${SITE_URL}/dashboard`;
  const listingUrl = `${SITE_URL}/${kind}/${row.listing_id}`;

  return {
    subject: `Your listing is claimed — 3 quick things to do next`,
    html: wrapHtml(`
      <p style="margin-top:0;">Aloha ${name},</p>
      <p>Your ${modality} listing on ${island} is claimed and live. Mahalo for joining the Hawaiʻi Wellness directory.</p>
      <p>Three quick things that make a real difference:</p>
      <ol style="padding-left:20px;margin:16px 0;">
        <li style="margin-bottom:8px;"><strong>Add a photo</strong> — listings with photos get significantly more clicks.</li>
        <li style="margin-bottom:8px;"><strong>Complete your bio</strong> — tell people what makes your practice unique.</li>
        <li style="margin-bottom:8px;"><strong>Add your booking link</strong> — let clients reach you directly.</li>
      </ol>
      ${btn('Go to your dashboard', dashUrl)}
      <p>Your public listing is already live here:<br />
        <a href="${listingUrl}" style="color:#0369a1;">${listingUrl}</a>
      </p>
      <p style="margin-bottom:0;">Aloha,<br /><strong>Marcus</strong><br />
        <a href="${SITE_URL}" style="color:#0369a1;">Hawaiʻi Wellness</a>
      </p>`),
    text: `Aloha ${name},

Your ${modality} listing on ${island} is claimed and live. Mahalo for joining the Hawaiʻi Wellness directory.

Three quick things that make a real difference:
1. Add a photo — listings with photos get significantly more clicks.
2. Complete your bio — tell people what makes your practice unique.
3. Add your booking link — let clients reach you directly.

Go to your dashboard: ${dashUrl}

Your public listing is live here: ${listingUrl}

Aloha,
Marcus
Hawaiʻi Wellness — ${SITE_URL}

---
PO Box 44368, Kamuela, HI 96743
Questions? Just reply — I read every email.`,
  };
}

// Step 2 — day 3, profile completeness + soft Premium upsell
function step2(row: DripRow): EmailTemplate {
  const name     = row.name || 'there';
  const island   = ISLAND_DISPLAY[row.island ?? ''] || 'Hawaiʻi';
  const modality = row.modalities?.[0] || 'wellness';
  const dashUrl  = `${SITE_URL}/dashboard`;
  const upgradeUrl = `${SITE_URL}/list-your-practice`;

  return {
    subject: `People are searching for ${modality} on ${island} — is your profile ready?`,
    html: wrapHtml(`
      <p style="margin-top:0;">Aloha ${name},</p>
      <p>Your listing has been live for a few days. People searching for ${modality} on ${island} are already finding you.</p>
      <p>If you haven't added a photo and bio yet, that's the highest-leverage thing you can do right now. Profiles with photos get far more clicks than text-only listings.</p>
      ${btn('Complete your profile', dashUrl)}
      <p>When you're ready to grow further — <a href="${upgradeUrl}" style="color:#0369a1;">Premium</a> gives you priority placement in search results, booking links visible directly on your listing, and a space to post retreat offerings. No long-term contracts.</p>
      <p style="margin-bottom:0;">Aloha,<br /><strong>Marcus</strong><br />
        <a href="${SITE_URL}" style="color:#0369a1;">Hawaiʻi Wellness</a>
      </p>`),
    text: `Aloha ${name},

Your listing has been live for a few days. People searching for ${modality} on ${island} are already finding you.

If you haven't added a photo and bio yet, that's the highest-leverage thing you can do right now. Profiles with photos get far more clicks than text-only listings.

Complete your profile: ${dashUrl}

When you're ready to grow further — Premium gives you priority placement in search results, booking links visible directly on your listing, and a space to post retreat offerings. No long-term contracts.

${upgradeUrl}

Aloha,
Marcus
Hawaiʻi Wellness — ${SITE_URL}

---
PO Box 44368, Kamuela, HI 96743
Questions? Just reply — I read every email.`,
  };
}

// Step 3 — day 14, website packages offer
function step3(row: DripRow): EmailTemplate {
  const name       = row.name || 'there';
  const modality   = row.modalities?.[0] || 'wellness';
  const packagesUrl = `${SITE_URL}/website-packages`;

  return {
    subject: `Member offer: professional website for your ${modality} practice`,
    html: wrapHtml(`
      <p style="margin-top:0;">Aloha ${name},</p>
      <p>You've had your listing on Hawaiʻi Wellness for two weeks now. I wanted to reach out personally about something we offer directory members.</p>
      <p>A lot of practitioners in Hawaiʻi still don't have a dedicated website — or have one that doesn't reflect the quality of their work. We build professional websites specifically for holistic health practitioners here, and directory members get exclusive pricing.</p>
      <p>It's not a template. It's a real site built for your practice — designed to convert visitors into clients.</p>
      ${btn('View website packages', packagesUrl)}
      <p>If you're curious or have questions, just reply to this email. I'm happy to walk you through what's included and what fits your situation.</p>
      <p style="margin-bottom:0;">Aloha,<br /><strong>Marcus</strong><br />
        <a href="${SITE_URL}" style="color:#0369a1;">Hawaiʻi Wellness</a>
      </p>`),
    text: `Aloha ${name},

You've had your listing on Hawaiʻi Wellness for two weeks now. I wanted to reach out personally about something we offer directory members.

A lot of practitioners in Hawaiʻi still don't have a dedicated website — or have one that doesn't reflect the quality of their work. We build professional websites specifically for holistic health practitioners here, and directory members get exclusive pricing.

It's not a template. It's a real site built for your practice — designed to convert visitors into clients.

View website packages: ${packagesUrl}

If you're curious or have questions, just reply to this email. I'm happy to walk you through what's included and what fits your situation.

Aloha,
Marcus
Hawaiʻi Wellness — ${SITE_URL}

---
PO Box 44368, Kamuela, HI 96743
Questions? Just reply — I read every email.`,
  };
}

function renderStep(row: DripRow): EmailTemplate {
  switch (row.step) {
    case 1:  return step1(row);
    case 2:  return step2(row);
    case 3:  return step3(row);
    default: return step1(row);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  // Auth — must be service role key (matches pattern used by pg_cron caller)
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const auth = req.headers.get('Authorization') ?? '';
  if (!serviceRoleKey || auth !== `Bearer ${serviceRoleKey}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
  const resendKey      = Deno.env.get('RESEND_API_KEY');
  const dryRun         = new URL(req.url).searchParams.get('dry_run') === 'true';
  const db             = createClient(supabaseUrl, serviceRoleKey);

  if (!resendKey) return json({ error: 'RESEND_API_KEY not set' }, 500);

  // Fetch due rows (up to 30 per run to stay within Edge Function limits)
  const { data: rows, error: fetchErr } = await db
    .from('claim_drip_queue')
    .select('*')
    .lte('send_at', new Date().toISOString())
    .is('sent_at', null)
    .is('skipped_at', null)
    .order('send_at')
    .limit(30);

  if (fetchErr) return json({ error: fetchErr.message }, 500);
  if (!rows?.length) return json({ processed: 0, message: 'No due rows' });

  const results: Record<string, string>[] = [];

  for (const row of rows as DripRow[]) {
    const now = new Date().toISOString();

    // For steps 2 and 3, check if provider has upgraded — if so, skip
    if (row.step >= 2) {
      const table = row.listing_type === 'center' ? 'centers' : 'practitioners';
      const { data: listing } = await db
        .from(table)
        .select('tier, owner_id')
        .eq('id', row.listing_id)
        .single();

      if (!listing || !listing.owner_id) {
        await db.from('claim_drip_queue').update({
          skipped_at: now,
          skip_reason: listing ? 'listing_unclaimed' : 'listing_not_found',
        }).eq('id', row.id);
        results.push({ id: row.id, status: 'skipped', reason: 'listing_unclaimed_or_missing' });
        continue;
      }

      if (listing.tier === 'premium' || listing.tier === 'featured') {
        await db.from('claim_drip_queue').update({
          skipped_at: now,
          skip_reason: `upgraded_to_${listing.tier}`,
        }).eq('id', row.id);
        results.push({ id: row.id, status: 'skipped', reason: `upgraded_to_${listing.tier}` });
        continue;
      }
    }

    const template = renderStep(row);

    if (dryRun) {
      results.push({ id: row.id, status: 'dry_run', subject: template.subject, email: row.email });
      continue;
    }

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:     FROM,
        to:       row.name ? [`${row.name} <${row.email}>`] : [row.email],
        reply_to: REPLY_TO,
        subject:  template.subject,
        html:     template.html,
        text:     template.text,
        tags: [
          { name: 'campaign', value: 'claim_drip' },
          { name: 'step',     value: String(row.step) },
          { name: 'island',   value: row.island ?? 'unknown' },
        ],
      }),
    });

    const resendData = await resendRes.json() as { id?: string; message?: string };

    if (resendRes.ok && resendData.id) {
      await db.from('claim_drip_queue').update({
        sent_at:  now,
        resend_id: resendData.id,
      }).eq('id', row.id);
      results.push({ id: row.id, status: 'sent', email: row.email, step: String(row.step) });
    } else {
      console.error(`Failed to send drip step ${row.step} to ${row.email}:`, resendData);
      results.push({ id: row.id, status: 'failed', email: row.email, error: resendData.message ?? 'unknown' });
    }

    // Brief pause between sends
    await new Promise(r => setTimeout(r, 150));
  }

  return json({ processed: rows.length, results });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
