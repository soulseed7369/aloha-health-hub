/**
 * sync-resend-status/index.ts
 * Supabase Edge Function — syncs email delivery/open/click events from Resend API.
 *
 * Polls Resend API for recently sent campaign emails, updates campaign_emails table
 * with latest status (delivered, opened, clicked, bounced), and cascades status
 * transitions to campaign_outreach table.
 *
 * Deploy:
 *   supabase functions deploy sync-resend-status --no-verify-jwt
 *
 * Set secrets (one-time):
 *   supabase secrets set RESEND_API_KEY=re_xxx...
 *   supabase secrets set CAMPAIGN_SECRET=your_secret_key
 *   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Invoke (example):
 *   curl -X POST https://<project-ref>.supabase.co/functions/v1/sync-resend-status \
 *     -H "Content-Type: application/json" \
 *     -H "X-Campaign-Secret: your_secret_key" \
 *     -d '{"sinceHours":48}'
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
const campaignSecret = Deno.env.get('CAMPAIGN_SECRET')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, content-type, apikey, x-client-info, x-campaign-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Resend API response type
interface ResendEmailData {
  id: string;
  from: string;
  to: string;
  created_at: string;
  last_event?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
  last_event_timestamp?: string;
  status?: string;
}

// Campaign email record from DB
interface CampaignEmail {
  id: string;
  outreach_id: string;
  resend_id: string;
  status: string;
}

// Response breakdown counter
interface Breakdown {
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unchanged: number;
  errors: number;
}

/**
 * Fetch all campaign emails sent in the last N hours that have a resend_id
 */
async function fetchEmailsToCheck(sinceHours: number): Promise<CampaignEmail[]> {
  const { data, error } = await supabase
    .from('campaign_emails')
    .select('id, outreach_id, resend_id, status')
    .not('resend_id', 'is', null)
    .neq('resend_id', '')
    .in('status', ['sent', 'delivered', 'opened'])
    .gt('sent_at', new Date(Date.now() - sinceHours * 3600000).toISOString());

  if (error) {
    console.error('Failed to fetch emails from DB:', error);
    throw new Error(`DB fetch error: ${error.message}`);
  }

  return data || [];
}

/**
 * Call Resend API to get current status of an email
 */
async function fetchResendStatus(resendId: string): Promise<ResendEmailData | null> {
  try {
    const res = await fetch(`https://api.resend.com/emails/${resendId}`, {
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
      },
    });

    if (!res.ok) {
      // Log but don't throw — continue with next email
      console.warn(
        `Resend API returned ${res.status} for email ${resendId}:`,
        await res.text(),
      );
      return null;
    }

    const emailData = await res.json() as ResendEmailData;
    return emailData;
  } catch (err) {
    console.error(`Error fetching Resend status for ${resendId}:`, err);
    return null;
  }
}

/**
 * Update campaign_emails status based on lastEvent from Resend
 */
async function updateCampaignEmail(
  emailId: string,
  outreachId: string,
  currentStatus: string,
  lastEvent: string | undefined,
): Promise<{ updated: boolean; newStatus?: string; error?: string }> {
  if (!lastEvent) {
    return { updated: false };
  }

  // Map Resend lastEvent to campaign_emails status
  const statusMap: Record<string, string> = {
    bounced: 'bounced',
    clicked: 'clicked',
    opened: 'opened',
    delivered: 'delivered',
  };

  const newStatus = statusMap[lastEvent];
  if (!newStatus) {
    return { updated: false };
  }

  // Skip if already in this status
  if (currentStatus === newStatus) {
    return { updated: false };
  }

  // Determine which timestamp field to update
  const timestampMap: Record<string, string> = {
    delivered: 'delivered_at',
    opened: 'opened_at',
    clicked: 'clicked_at',
    bounced: 'bounced_at',
  };

  const timestampField = timestampMap[newStatus];
  const now = new Date().toISOString();

  // Update campaign_emails
  const { error: emailError } = await supabase
    .from('campaign_emails')
    .update({
      status: newStatus,
      [timestampField]: now,
      // If clicked, also set opened_at if not already set
      ...(newStatus === 'clicked' && { opened_at: now }),
    })
    .eq('id', emailId);

  if (emailError) {
    return { updated: false, error: emailError.message };
  }

  // Now update campaign_outreach based on the new status and lastEvent
  await updateCampaignOutreach(outreachId, currentStatus, newStatus, now);

  return { updated: true, newStatus };
}

/**
 * Cascade status updates to campaign_outreach table
 */
async function updateCampaignOutreach(
  outreachId: string,
  oldStatus: string,
  newEmailStatus: string,
  now: string,
): Promise<void> {
  // Fetch current outreach record
  const { data: outreach, error: fetchError } = await supabase
    .from('campaign_outreach')
    .select('status')
    .eq('id', outreachId)
    .single();

  if (fetchError || !outreach) {
    console.warn(`Could not fetch outreach ${outreachId}:`, fetchError?.message);
    return;
  }

  const currentOutreachStatus = outreach.status;
  let updatePayload: Record<string, any> = {};

  // Handle bounced emails
  if (newEmailStatus === 'bounced') {
    if (currentOutreachStatus !== 'bad_contact') {
      updatePayload.status = 'bad_contact';
      updatePayload.notes = 'Email bounced';
    }
  }
  // Handle clicked emails
  else if (newEmailStatus === 'clicked') {
    updatePayload.email_1_clicked_at = now;
  }
  // Handle opened emails
  else if (newEmailStatus === 'opened') {
    if (currentOutreachStatus === 'email_1_sent') {
      updatePayload.status = 'email_1_opened';
      updatePayload.email_1_opened_at = now;
    } else if (currentOutreachStatus === 'delivered') {
      updatePayload.email_1_opened_at = now;
    }
  }
  // Handle delivered emails
  else if (newEmailStatus === 'delivered') {
    if (currentOutreachStatus === 'sent') {
      updatePayload.status = 'delivered';
      updatePayload.delivered_at = now;
    }
  }

  // Only update if there are changes
  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await supabase
      .from('campaign_outreach')
      .update(updatePayload)
      .eq('id', outreachId);

    if (updateError) {
      console.warn(
        `Failed to update outreach ${outreachId}:`,
        updateError.message,
      );
    }
  }
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ── Auth check ──────────────────────────────────────────────────────────
    const secretHeader = req.headers.get('X-Campaign-Secret');
    if (!secretHeader || secretHeader !== campaignSecret) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // ── Parse request body ──────────────────────────────────────────────────
    let sinceHours = 48; // default
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.sinceHours && typeof body.sinceHours === 'number') {
          sinceHours = body.sinceHours;
        }
      } catch (e) {
        // Ignore parse errors, use default
      }
    }

    console.log(
      `[sync-resend-status] Starting sync for emails sent in the last ${sinceHours} hours`,
    );

    // ── Fetch emails to check ───────────────────────────────────────────────
    const emails = await fetchEmailsToCheck(sinceHours);
    console.log(`[sync-resend-status] Found ${emails.length} emails to check`);

    if (emails.length === 0) {
      return json({
        checked: 0,
        updated: 0,
        breakdown: {
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unchanged: 0,
          errors: 0,
        },
      });
    }

    // ── Check each email with Resend API ────────────────────────────────────
    const breakdown: Breakdown = {
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unchanged: 0,
      errors: 0,
    };

    let updated = 0;

    for (const email of emails) {
      // 200ms delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));

      const resendData = await fetchResendStatus(email.resend_id);

      if (!resendData) {
        breakdown.errors++;
        continue;
      }

      const result = await updateCampaignEmail(
        email.id,
        email.outreach_id,
        email.status,
        resendData.last_event,
      );

      if (result.error) {
        breakdown.errors++;
      } else if (result.updated && result.newStatus) {
        updated++;
        const eventKey = result.newStatus as keyof Breakdown;
        if (eventKey in breakdown) {
          breakdown[eventKey]++;
        }
      } else {
        breakdown.unchanged++;
      }
    }

    console.log(
      `[sync-resend-status] Sync complete: ${updated} emails updated, ${breakdown.errors} errors`,
    );

    return json({
      checked: emails.length,
      updated,
      breakdown,
    });
  } catch (err) {
    console.error('[sync-resend-status] Fatal error:', err);
    return json(
      {
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      500,
    );
  }
});
