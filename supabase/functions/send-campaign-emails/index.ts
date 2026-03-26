/**
 * send-campaign-emails/index.ts
 * Supabase Edge Function — sends outreach emails to Hawaii Wellness campaign contacts.
 *
 * Authentication: X-Campaign-Secret header must match CAMPAIGN_SECRET env var
 * Request body:
 *   - contactIds?: string[] — specific contact IDs to send to
 *   - filters?: { status?, island?, limit? } — query existing contacts
 *   - dryRun?: boolean — render but don't send
 *   - template?: string — override template
 *   - followUp?: boolean — send as email_2
 *
 * Deploy:
 *   supabase functions deploy send-campaign-emails --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, content-type, apikey, x-client-info, x-campaign-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SITE_URL = 'https://www.hawaiiwellness.net';

const ISLAND_DISPLAY: Record<string, string> = {
  big_island: 'Big Island',
  maui: 'Maui',
  oahu: 'Oahu',
  kauai: 'Kauai',
};

const SEGMENT_TO_TEMPLATE: Record<string, string> = {
  unclaimed: 'phase1_claim',
  claimed_has_website: 'phase2_track_a',
  claimed_no_website: 'phase2_track_b',
  bundle_prospect: 'phase2_track_c',
};

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────

interface CampaignContact {
  id: string;
  listing_id: string;
  listing_type: string;
  name: string;
  email: string;
  phone?: string;
  island: string;
  city?: string;
  modalities?: string[];
  website_url?: string;
  segment: string;
  status: string;
  email_1_sent_at?: string;
  email_1_opened_at?: string;
  email_2_sent_at?: string;
}

interface RequestFilters {
  status?: string;
  island?: string;
  limit?: number;
}

interface RequestBody {
  contactIds?: string[];
  filters?: RequestFilters;
  dryRun?: boolean;
  template?: string;
  followUp?: boolean;
}

interface EmailResult {
  id: string;
  name: string;
  email: string;
  status: 'sent' | 'failed' | 'skipped' | 'dry_run';
  template?: string;
  subject?: string;
  preview?: string;
  resendId?: string;
  error?: string;
}

interface EmailResponse {
  sent: number;
  failed: number;
  skipped: number;
  dryRun: boolean;
  results: EmailResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Email template rendering
// ─────────────────────────────────────────────────────────────────────────────

interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

function renderPhase1Claim(contact: CampaignContact): EmailTemplate {
  const name = contact.name || 'there';
  const city = contact.city || '';
  const island = ISLAND_DISPLAY[contact.island] || 'Hawaii';
  const modalities = contact.modalities || ['wellness'];
  const modality = modalities.length > 0 ? modalities[0] : 'wellness';
  const listingId = contact.listing_id;
  if (!listingId) throw new Error(`Contact ${contact.id} (${contact.name}) has no listing_id — cannot build claim URL`);
  const listingType = contact.listing_type || 'practitioner';

  const kind = listingType === 'center' ? 'center' : 'profile';
  const claimLink = `${SITE_URL}/${kind}/${listingId}`;
  const cityStr = city ? ` in ${city}` : ` on ${island}`;

  const subject = `Your ${modality} practice${cityStr} is on Hawaii Wellness`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background-color: #f5f5f5; padding: 20px; text-align: center; border-bottom: 1px solid #eee; }
    .logo { width: 120px; max-width: 120px; height: auto; display: block; margin: 0 auto; }
    .content { padding: 30px 20px; }
    .cta-button {
      display: inline-block;
      background-color: #4CAF50;
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; background-color: #f9f9f9; }
    .unsubscribe { font-size: 11px; color: #999; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.hawaiiwellness.net/hawaii-wellness-logo.png" alt="Hawaii Wellness" width="120" class="logo" style="width:120px;max-width:120px;height:auto;display:block;margin:0 auto;" />
    </div>
    <div class="content">
      <p>Aloha ${name},</p>
      <p>Good news! Your ${modality} practice${cityStr} has been listed on Hawaii Wellness—the premier directory connecting wellness seekers across the islands.</p>
      <p>You now have a dedicated profile where potential clients can find you, learn about your services, and book appointments.</p>
      <p style="text-align: center;">
        <a href="${claimLink}" class="cta-button">View Your Listing</a>
      </p>
      <p>Once you claim your listing, you can:</p>
      <ul>
        <li>Add a photo and bio</li>
        <li>Update your contact information</li>
        <li>Link to your booking page</li>
        <li>Showcase your specialties</li>
      </ul>
      <p>Questions? Just reply to this email—I'm here to help.</p>
      <p>Mahalo for being part of the Hawaii Wellness community!</p>
      <p>Aloha,<br />Marcus from Hawaii Wellness</p>
    </div>
    <div class="footer">
      <p>Hawaiʻi Wellness<br />PO Box 44368, Kamuela, HI 96743</p>
      <div class="unsubscribe">
        <p>Not interested? Just reply and I'll remove you from future emails.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const textBody = `Aloha ${name},

Good news! Your ${modality} practice${cityStr} has been listed on Hawaii Wellness—the premier directory connecting wellness seekers across the islands.

You now have a dedicated profile where potential clients can find you, learn about your services, and book appointments.

View your listing: ${claimLink}

Once you claim your listing, you can:
- Add a photo and bio
- Update your contact information
- Link to your booking page
- Showcase your specialties

Questions? Just reply to this email—I'm here to help.

Mahalo for being part of the Hawaii Wellness community!

Aloha,
Marcus from Hawaii Wellness

Hawaiʻi Wellness
PO Box 44368, Kamuela, HI 96743

Not interested? Just reply and I'll remove you from future emails.`;

  return { subject, htmlBody, textBody };
}

function renderPhase2TrackA(contact: CampaignContact): EmailTemplate {
  const name = contact.name || 'there';
  const city = contact.city || '';
  const island = ISLAND_DISPLAY[contact.island] || 'Hawaii';

  const subject = `Grow your practice on Hawaii Wellness`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background-color: #f5f5f5; padding: 20px; text-align: center; border-bottom: 1px solid #eee; }
    .logo { width: 120px; max-width: 120px; height: auto; display: block; margin: 0 auto; }
    .content { padding: 30px 20px; }
    .cta-button {
      display: inline-block;
      background-color: #4CAF50;
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; background-color: #f9f9f9; }
    .unsubscribe { font-size: 11px; color: #999; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.hawaiiwellness.net/hawaii-wellness-logo.png" alt="Hawaii Wellness" width="120" class="logo" style="width:120px;max-width:120px;height:auto;display:block;margin:0 auto;" />
    </div>
    <div class="content">
      <p>Aloha ${name},</p>
      <p>Your Hawaii Wellness profile has gained traction—and you have a website that's driving interest.</p>
      <p>Many practitioners like you are upgrading to Premium to get priority placement, open booking links, testimonials, and retreat posts. It's helping them fill their calendars.</p>
      <p style="text-align: center;">
        <a href="${SITE_URL}/list-your-practice" class="cta-button">Explore Premium</a>
      </p>
      <p>Questions? Reply to this email and I'll walk you through the options.</p>
      <p>Mahalo,<br />Marcus</p>
    </div>
    <div class="footer">
      <p>Hawaiʻi Wellness<br />PO Box 44368, Kamuela, HI 96743</p>
      <div class="unsubscribe">
        <p>Not interested? Just reply and I'll remove you from future emails.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const textBody = `Aloha ${name},

Your Hawaii Wellness profile has gained traction—and you have a website that's driving interest.

Many practitioners like you are upgrading to Premium to get priority placement, open booking links, testimonials, and retreat posts. It's helping them fill their calendars.

Explore Premium: ${SITE_URL}/list-your-practice

Questions? Reply to this email and I'll walk you through the options.

Mahalo,
Marcus

Hawaiʻi Wellness
PO Box 44368, Kamuela, HI 96743

Not interested? Just reply and I'll remove you from future emails.`;

  return { subject, htmlBody, textBody };
}

function renderPhase2TrackB(contact: CampaignContact): EmailTemplate {
  const name = contact.name || 'there';

  const subject = `Your practice profile on Hawaii Wellness + website option`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background-color: #f5f5f5; padding: 20px; text-align: center; border-bottom: 1px solid #eee; }
    .logo { width: 120px; max-width: 120px; height: auto; display: block; margin: 0 auto; }
    .content { padding: 30px 20px; }
    .cta-button {
      display: inline-block;
      background-color: #4CAF50;
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; background-color: #f9f9f9; }
    .unsubscribe { font-size: 11px; color: #999; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.hawaiiwellness.net/hawaii-wellness-logo.png" alt="Hawaii Wellness" width="120" class="logo" style="width:120px;max-width:120px;height:auto;display:block;margin:0 auto;" />
    </div>
    <div class="content">
      <p>Aloha ${name},</p>
      <p>Your practice is now on Hawaii Wellness! Clients are discovering you through our directory.</p>
      <p>You don't have a dedicated website yet—but you can add one directly through Hawaii Wellness. Many practitioners are using this to capture local leads and bookings.</p>
      <p style="text-align: center;">
        <a href="${SITE_URL}/list-your-practice" class="cta-button">Learn About Website + Premium</a>
      </p>
      <p>Let me know if you'd like to explore options. I'm here to help.</p>
      <p>Mahalo,<br />Marcus</p>
    </div>
    <div class="footer">
      <p>Hawaiʻi Wellness<br />PO Box 44368, Kamuela, HI 96743</p>
      <div class="unsubscribe">
        <p>Not interested? Just reply and I'll remove you from future emails.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const textBody = `Aloha ${name},

Your practice is now on Hawaii Wellness! Clients are discovering you through our directory.

You don't have a dedicated website yet—but you can add one directly through Hawaii Wellness. Many practitioners are using this to capture local leads and bookings.

Learn About Website + Premium: ${SITE_URL}/list-your-practice

Let me know if you'd like to explore options. I'm here to help.

Mahalo,
Marcus

Hawaiʻi Wellness
PO Box 44368, Kamuela, HI 96743

Not interested? Just reply and I'll remove you from future emails.`;

  return { subject, htmlBody, textBody };
}

function renderPhase2TrackC(contact: CampaignContact): EmailTemplate {
  const name = contact.name || 'there';

  const subject = `Bundle wellness offerings on Hawaii Wellness`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background-color: #f5f5f5; padding: 20px; text-align: center; border-bottom: 1px solid #eee; }
    .logo { width: 120px; max-width: 120px; height: auto; display: block; margin: 0 auto; }
    .content { padding: 30px 20px; }
    .cta-button {
      display: inline-block;
      background-color: #4CAF50;
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; background-color: #f9f9f9; }
    .unsubscribe { font-size: 11px; color: #999; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.hawaiiwellness.net/hawaii-wellness-logo.png" alt="Hawaii Wellness" width="120" class="logo" style="width:120px;max-width:120px;height:auto;display:block;margin:0 auto;" />
    </div>
    <div class="content">
      <p>Aloha ${name},</p>
      <p>Hawaii Wellness is expanding to include retreats, workshops, and wellness bundles.</p>
      <p>Featured partners are promoting their offerings to thousands of wellness seekers across the islands. It's a great fit for your practice.</p>
      <p style="text-align: center;">
        <a href="${SITE_URL}/list-your-practice" class="cta-button">See Featuring Options</a>
      </p>
      <p>I'd love to chat about how this could work for you. Reply anytime.</p>
      <p>Mahalo,<br />Marcus</p>
    </div>
    <div class="footer">
      <p>Hawaiʻi Wellness<br />PO Box 44368, Kamuela, HI 96743</p>
      <div class="unsubscribe">
        <p>Not interested? Just reply and I'll remove you from future emails.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const textBody = `Aloha ${name},

Hawaii Wellness is expanding to include retreats, workshops, and wellness bundles.

Featured partners are promoting their offerings to thousands of wellness seekers across the islands. It's a great fit for your practice.

See Featuring Options: ${SITE_URL}/list-your-practice

I'd love to chat about how this could work for you. Reply anytime.

Mahalo,
Marcus

Hawaiʻi Wellness
PO Box 44368, Kamuela, HI 96743

Not interested? Just reply and I'll remove you from future emails.`;

  return { subject, htmlBody, textBody };
}

function renderPhase1bClaim(contact: CampaignContact): EmailTemplate {
  const name = contact.name || 'there';
  const city = contact.city || '';
  const island = ISLAND_DISPLAY[contact.island] || 'Hawaii';
  const modalities = contact.modalities || ['wellness'];
  const modality = modalities.length > 0 ? modalities[0] : 'wellness';
  const listingId = contact.listing_id;
  if (!listingId) throw new Error(`Contact ${contact.id} (${contact.name}) has no listing_id`);
  const kind = contact.listing_type === 'center' ? 'center' : 'profile';
  const claimLink = `${SITE_URL}/${kind}/${listingId}`;
  const cityStr = city ? ` in ${city}` : ` on ${island}`;

  const subject = `Your ${modality} listing${cityStr} — a quick follow-up`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">People searching for ${modality} on ${island} are finding you — take 2 minutes to make sure what they see is accurate.&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>
</head>
<body style="margin:0;padding:0;background:#f8fafc;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
  <div style="background:#f0f9ff;padding:24px 32px;text-align:center;border-bottom:1px solid #e0f2fe;">
    <a href="${SITE_URL}" style="text-decoration:none;">
      <img src="${SITE_URL}/hawaii-wellness-logo.png" alt="Hawai'i Wellness" width="120" style="width:120px;max-width:120px;height:auto;display:block;margin:0 auto;" />
    </a>
  </div>
  <div style="padding:32px;color:#1e293b;line-height:1.7;">
    <p style="margin-top:0;">Hi ${name},</p>
    <p>Sent you a note last week — just one follow-up.</p>
    <p>People searching for ${modality} on ${island} are already finding your listing on <a href="${SITE_URL}" style="color:#0369a1;">Hawai'i Wellness</a>. Right now you have no way to update your info, add photos, or make sure what they're seeing is accurate — because the listing is still unclaimed.</p>
    <p>Takes about 2 minutes and it's free:</p>
    <p style="margin:28px 0;">
      <a href="${claimLink}" style="background:#0369a1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Claim Your Listing</a>
    </p>
    <p style="margin-bottom:0;">Aloha,<br><strong>Marcus</strong><br>
    <a href="${SITE_URL}" style="color:#0369a1;text-decoration:none;">Hawai'i Wellness</a></p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;">
    <p style="margin:0 0 4px 0;"><a href="${SITE_URL}" style="color:#94a3b8;">Hawai'i Wellness</a> · PO Box 44368, Kamuela, HI 96743</p>
    <p style="margin:0;">You're receiving this because your practice appears in our wellness directory.<br>Not interested? Just reply and I'll remove you.</p>
  </div>
</div>
</body>
</html>`;

  const textBody = `Hi ${name},

Sent you a note last week — just one follow-up.

People searching for ${modality} on ${island} are already finding your listing on Hawai'i Wellness. Right now you have no way to update your info, add photos, or make sure what they're seeing is accurate — because the listing is still unclaimed.

Takes about 2 minutes and it's free:
${claimLink}

Aloha,
Marcus
Hawai'i Wellness — hawaiiwellness.net

---
Hawai'i Wellness · PO Box 44368, Kamuela, HI 96743
Not interested? Just reply and I'll remove you.`;

  return { subject, htmlBody, textBody };
}

function renderFollowUp(contact: CampaignContact): EmailTemplate {
  const name = contact.name || 'there';
  const listingId = contact.listing_id;
  if (!listingId) throw new Error(`Contact ${contact.id} (${contact.name}) has no listing_id — cannot build follow-up URL`);
  const kind = contact.listing_type === 'center' ? 'center' : 'profile';
  const claimLink = `${SITE_URL}/${kind}/${listingId}`;

  const subject = `Quick follow-up: your listing on Hawaii Wellness`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background-color: #f5f5f5; padding: 20px; text-align: center; border-bottom: 1px solid #eee; }
    .logo { width: 120px; max-width: 120px; height: auto; display: block; margin: 0 auto; }
    .content { padding: 30px 20px; }
    .cta-button {
      display: inline-block;
      background-color: #4CAF50;
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; background-color: #f9f9f9; }
    .unsubscribe { font-size: 11px; color: #999; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.hawaiiwellness.net/hawaii-wellness-logo.png" alt="Hawaii Wellness" width="120" class="logo" style="width:120px;max-width:120px;height:auto;display:block;margin:0 auto;" />
    </div>
    <div class="content">
      <p>Aloha ${name},</p>
      <p>Just following up on my note last week about your listing on Hawaii Wellness. Many practitioners are already seeing new client leads through the directory.</p>
      <p style="text-align: center;">
        <a href="${claimLink}" class="cta-button">View Your Listing</a>
      </p>
      <p>Happy to answer any questions. You can reply to this email or reach out directly.</p>
      <p>Mahalo,<br />Marcus</p>
    </div>
    <div class="footer">
      <p>Hawaiʻi Wellness<br />PO Box 44368, Kamuela, HI 96743</p>
      <div class="unsubscribe">
        <p>Not interested? Just reply and I'll remove you from future emails.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const textBody = `Aloha ${name},

Just following up on my note last week about your listing on Hawaii Wellness. Many practitioners are already seeing new client leads through the directory.

View Your Listing: ${claimLink}

Happy to answer any questions. You can reply to this email or reach out directly.

Mahalo,
Marcus

Hawaiʻi Wellness
PO Box 44368, Kamuela, HI 96743

Not interested? Just reply and I'll remove you from future emails.`;

  return { subject, htmlBody, textBody };
}

function renderTemplate(
  contact: CampaignContact,
  templateName: string
): EmailTemplate {
  switch (templateName) {
    case 'phase1_claim':
      return renderPhase1Claim(contact);
    case 'phase1b_claim':
      return renderPhase1bClaim(contact);
    case 'phase2_track_a':
      return renderPhase2TrackA(contact);
    case 'phase2_track_b':
      return renderPhase2TrackB(contact);
    case 'phase2_track_c':
      return renderPhase2TrackC(contact);
    case 'follow_up':
      return renderFollowUp(contact);
    default:
      return renderPhase1Claim(contact);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return email && email.includes('@') && email.trim().length > 5;
}

function getTemplateForContact(
  contact: CampaignContact,
  overrideTemplate?: string,
  isFollowUp?: boolean
): string {
  if (isFollowUp) {
    return 'follow_up';
  }

  if (overrideTemplate) {
    return overrideTemplate;
  }

  return SEGMENT_TO_TEMPLATE[contact.segment] || 'phase1_claim';
}

async function sendViaResend(
  contact: CampaignContact,
  template: EmailTemplate,
  templateName: string,
  resendKey: string
): Promise<{ success: boolean; resendId?: string; error?: string }> {
  const fromName = 'Marcus from Hawaii Wellness';
  const fromEmail = 'aloha@hawaiiwellness.net';
  const replyTo = 'aloha@hawaiiwellness.net';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [`${contact.name} <${contact.email}>`],
      reply_to: replyTo,
      subject: template.subject,
      html: template.htmlBody,
      text: template.textBody,
      tags: [
        { name: 'campaign', value: 'aloha_launch' },
        { name: 'segment', value: contact.segment || 'unknown' },
        { name: 'island', value: contact.island || 'unknown' },
      ],
    }),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const errorMsg =
      (data.message as string) ||
      (data.error as string) ||
      `HTTP ${response.status}`;
    return { success: false, error: errorMsg };
  }

  return { success: true, resendId: data.id as string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ── Authentication ────────────────────────────────────────────────────────
    const campaignSecret = Deno.env.get('CAMPAIGN_SECRET');
    if (!campaignSecret) {
      console.error('CAMPAIGN_SECRET not configured');
      return json({ error: 'Campaign secret not configured' }, 500);
    }

    const providedSecret = req.headers.get('X-Campaign-Secret');
    if (!providedSecret || providedSecret !== campaignSecret) {
      console.warn('Invalid campaign secret provided');
      return json({ error: 'Unauthorized' }, 401);
    }

    // ── Environment variables ─────────────────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseServiceRole || !resendKey) {
      console.error('Missing required environment variables', {
        supabaseUrl: !!supabaseUrl,
        supabaseServiceRole: !!supabaseServiceRole,
        resendKey: !!resendKey,
      });
      return json({ error: 'Server misconfiguration' }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

    // ── Request body ──────────────────────────────────────────────────────────
    const body = (await req.json()) as RequestBody;
    const {
      contactIds,
      filters,
      dryRun = false,
      template: overrideTemplate,
      followUp = false,
    } = body;

    if (!contactIds && !filters) {
      return json(
        { error: 'Either contactIds or filters must be provided' },
        400
      );
    }

    // ── Fetch contacts ────────────────────────────────────────────────────────
    let contacts: CampaignContact[] = [];

    if (contactIds && contactIds.length > 0) {
      const { data, error: fetchError } = await supabaseAdmin
        .from('campaign_outreach')
        .select('*')
        .in('id', contactIds);

      if (fetchError) {
        console.error('Error fetching contacts by ID', fetchError);
        return json({ error: 'Failed to fetch contacts' }, 500);
      }

      contacts = (data || []) as CampaignContact[];
    } else if (filters) {
      const island = filters.island || 'big_island';
      const limit = Math.min(filters.limit || 50, 100);

      let query = supabaseAdmin
        .from('campaign_outreach')
        .select('*')
        .eq('island', island)
        .eq('status', filters.status || 'not_contacted')
        .not('email', 'is', null)
        .neq('email', '');

      const { data, error: fetchError } = await query.limit(limit);

      if (fetchError) {
        console.error('Error fetching contacts', fetchError);
        return json({ error: 'Failed to fetch contacts' }, 500);
      }

      contacts = (data || []) as CampaignContact[];
    }

    console.log(`Processing ${contacts.length} contacts, dryRun=${dryRun}`);

    // ── Send emails ───────────────────────────────────────────────────────────
    const results: EmailResult[] = [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const contact of contacts) {
      // Skip invalid emails
      if (!isValidEmail(contact.email)) {
        console.log(
          `Skipping ${contact.id}: invalid email "${contact.email}"`
        );
        results.push({
          id: contact.id,
          name: contact.name || 'Unknown',
          email: contact.email || '',
          status: 'skipped',
          error: 'Invalid email address',
        });
        skipped++;
        continue;
      }

      const templateName = getTemplateForContact(
        contact,
        overrideTemplate,
        followUp
      );
      const emailTemplate = renderTemplate(contact, templateName);

      const result: EmailResult = {
        id: contact.id,
        name: contact.name || 'Unknown',
        email: contact.email,
        template: templateName,
        subject: emailTemplate.subject,
        preview: emailTemplate.textBody.slice(0, 200),
      };

      if (dryRun) {
        console.log(
          `[DRY RUN] Would send ${templateName} to ${contact.email}`
        );
        result.status = 'dry_run';
        results.push(result);
        continue;
      }

      // Send email via Resend
      const sendResult = await sendViaResend(
        contact,
        emailTemplate,
        templateName,
        resendKey
      );

      if (sendResult.success) {
        console.log(
          `Sent ${templateName} to ${contact.email} (resendId=${sendResult.resendId})`
        );

        // Record in campaign_emails
        const { error: insertError } = await supabaseAdmin
          .from('campaign_emails')
          .insert({
            outreach_id: contact.id,
            resend_id: sendResult.resendId,
            to_email: contact.email,
            to_name: contact.name,
            subject: emailTemplate.subject,
            template: templateName,
            body_preview: emailTemplate.textBody.slice(0, 200),
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

        if (insertError) {
          console.warn(
            `Failed to log email to campaign_emails for ${contact.id}`,
            insertError
          );
        }

        // Update campaign_outreach status
        // phase1b_claim → email_1b_sent (distinct from email_2_sent)
        // follow_up or phase2_* after email_1 → email_2_sent
        // otherwise → email_1_sent
        const isPhase1b = templateName === 'phase1b_claim';
        const isEmail2 =
          !isPhase1b &&
          (followUp ||
            contact.status === 'email_1_sent' ||
            contact.status === 'email_1_opened' ||
            contact.status === 'email_1b_sent');
        const updatePayload = isPhase1b
          ? {
              status: 'email_1b_sent',
              email_2_sent_at: new Date().toISOString(),
              email_2_template: templateName,
            }
          : isEmail2
          ? {
              status: 'email_2_sent',
              email_2_sent_at: new Date().toISOString(),
              email_2_template: templateName,
            }
          : {
              status: 'email_1_sent',
              email_1_sent_at: new Date().toISOString(),
              email_1_template: templateName,
            };

        const { error: updateError } = await supabaseAdmin
          .from('campaign_outreach')
          .update(updatePayload)
          .eq('id', contact.id);

        if (updateError) {
          console.warn(
            `Failed to update campaign_outreach for ${contact.id}`,
            updateError
          );
        }

        result.status = 'sent';
        result.resendId = sendResult.resendId;
        sent++;
      } else {
        console.error(
          `Failed to send to ${contact.email}: ${sendResult.error}`
        );

        result.status = 'failed';
        result.error = sendResult.error;

        // Mark as bad_contact if bounce/invalid email error
        const isBadContact =
          sendResult.error &&
          (sendResult.error.toLowerCase().includes('bounce') ||
            sendResult.error.toLowerCase().includes('invalid'));

        if (isBadContact) {
          const { error: updateError } = await supabaseAdmin
            .from('campaign_outreach')
            .update({
              status: 'bad_contact',
              notes: `Send failed: ${sendResult.error}`,
            })
            .eq('id', contact.id);

          if (updateError) {
            console.warn(`Failed to mark ${contact.id} as bad_contact`);
          }
        }

        failed++;
      }

      results.push(result);

      // Rate limiting: 2 seconds between sends
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const response: EmailResponse = {
      sent,
      failed,
      skipped,
      dryRun,
      results,
    };

    console.log('Campaign email send complete', {
      sent,
      failed,
      skipped,
      total: contacts.length,
    });

    return json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('send-campaign-emails error:', { message, stack });
    return json({ error: message || 'Internal server error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
