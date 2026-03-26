/**
 * sync-contact-info/index.ts
 * Supabase Edge Function — syncs email, phone, and name from source tables to campaign_outreach.
 *
 * When the admin edits practitioner/center contact details, this function re-fetches
 * the latest values and updates campaign_outreach records. Additionally, if a record
 * was marked 'bad_contact' due to missing/invalid email, and now has a valid email,
 * resets status to 'not_contacted' and clears notes.
 *
 * Deploy:
 *   supabase functions deploy sync-contact-info --no-verify-jwt
 *
 * Set secrets (one-time):
 *   supabase secrets set CAMPAIGN_SECRET=your_secret_key
 *   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Invoke (example):
 *   curl -X POST https://<project-ref>.supabase.co/functions/v1/sync-contact-info \
 *     -H "Content-Type: application/json" \
 *     -H "X-Campaign-Secret: your_secret_key" \
 *     -d '{}'
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

/**
 * Check if email is valid: contains '@' and length > 5
 */
function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return email.includes('@') && email.length > 5;
}

/**
 * Campaign outreach record
 */
interface CampaignOutreachRow {
  id: string;
  listing_id: string;
  listing_type: 'practitioner' | 'center';
  email: string | null;
  phone: string | null;
  name: string | null;
  status: string;
  notes: string | null;
}

/**
 * Source listing record (practitioners or centers)
 */
interface SourceListing {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

/**
 * Fetch all campaign_outreach rows for big_island with a listing_id
 */
async function fetchCampaignOutreachRows(): Promise<CampaignOutreachRow[]> {
  const { data, error } = await supabase
    .from('campaign_outreach')
    .select('id, listing_id, listing_type, email, phone, name, status, notes')
    .eq('island', 'big_island')
    .not('listing_id', 'is', null);

  if (error) {
    console.error('Failed to fetch campaign_outreach rows:', error);
    throw new Error(`DB fetch error: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch source listing by ID and type
 */
async function fetchSourceListing(
  listingId: string,
  listingType: 'practitioner' | 'center',
): Promise<SourceListing | null> {
  try {
    if (listingType !== 'practitioner' && listingType !== 'center') {
    console.warn(`[sync-contact-info] Invalid listing_type "${listingType}" for listing ${listingId} — skipping`);
    return null;
  }
  const table = listingType === 'practitioner' ? 'practitioners' : 'centers';
    const { data, error } = await supabase
      .from(table)
      .select('id, name, email, phone')
      .eq('id', listingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found — listing may have been deleted
        console.warn(
          `[sync-contact-info] Listing ${listingId} (${listingType}) not found`,
        );
        return null;
      }
      console.error(
        `[sync-contact-info] Error fetching ${listingType} ${listingId}:`,
        error,
      );
      return null;
    }

    return data as SourceListing;
  } catch (err) {
    console.error(
      `[sync-contact-info] Exception fetching ${listingType} ${listingId}:`,
      err,
    );
    return null;
  }
}

/**
 * Update campaign_outreach with fresh contact info from source
 */
async function updateCampaignOutreach(
  outreachRow: CampaignOutreachRow,
  sourceListing: SourceListing,
): Promise<{ updated: boolean; emailFixed: boolean; statusReset: boolean }> {
  const updatePayload: Record<string, any> = {};
  let emailFixed = false;
  let statusReset = false;

  // Check if any field differs
  if (sourceListing.name && sourceListing.name !== outreachRow.name) {
    updatePayload.name = sourceListing.name;
  }
  if (sourceListing.email && sourceListing.email !== outreachRow.email) {
    updatePayload.email = sourceListing.email;
  }
  if (sourceListing.phone && sourceListing.phone !== outreachRow.phone) {
    updatePayload.phone = sourceListing.phone;
  }

  // Check if email was fixed and status should be reset
  if (
    outreachRow.status === 'bad_contact' &&
    !isValidEmail(outreachRow.email) &&
    isValidEmail(sourceListing.email)
  ) {
    updatePayload.status = 'not_contacted';
    updatePayload.notes = null;
    emailFixed = true;
    statusReset = true;
  }

  // Only update if there are changes
  if (Object.keys(updatePayload).length === 0) {
    return { updated: false, emailFixed, statusReset };
  }

  try {
    const { error } = await supabase
      .from('campaign_outreach')
      .update(updatePayload)
      .eq('id', outreachRow.id);

    if (error) {
      console.warn(
        `[sync-contact-info] Failed to update ${outreachRow.id}:`,
        error.message,
      );
      return { updated: false, emailFixed, statusReset };
    }

    console.log(`[sync-contact-info] Updated ${outreachRow.id}`);
    return { updated: true, emailFixed, statusReset };
  } catch (err) {
    console.error(`[sync-contact-info] Exception updating ${outreachRow.id}:`, err);
    return { updated: false, emailFixed, statusReset };
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

    console.log('[sync-contact-info] Starting contact info sync for big_island');

    // ── Fetch all campaign_outreach rows ─────────────────────────────────────
    const outreachRows = await fetchCampaignOutreachRows();
    console.log(
      `[sync-contact-info] Found ${outreachRows.length} outreach records to check`,
    );

    if (outreachRows.length === 0) {
      return json({
        checked: 0,
        updated: 0,
        emailsFixed: 0,
        statusesReset: 0,
      });
    }

    // ── Process each outreach record ─────────────────────────────────────────
    let updated = 0;
    let emailsFixed = 0;
    let statusesReset = 0;
    let removed = 0;

    for (const outreachRow of outreachRows) {
      // Fetch the source listing
      const sourceListing = await fetchSourceListing(
        outreachRow.listing_id,
        outreachRow.listing_type,
      );

      if (!sourceListing) {
        // Listing deleted from directory — remove from campaign_outreach too
        const { error: delError } = await supabase
          .from('campaign_outreach')
          .delete()
          .eq('id', outreachRow.id);

        if (delError) {
          console.warn(`[sync-contact-info] Failed to remove orphaned row ${outreachRow.id}:`, delError.message);
        } else {
          console.log(`[sync-contact-info] Removed orphaned row ${outreachRow.id} (listing ${outreachRow.listing_id} no longer exists)`);
          removed++;
        }
        continue;
      }

      // Attempt to update
      const result = await updateCampaignOutreach(outreachRow, sourceListing);

      if (result.updated) {
        updated++;
      }
      if (result.emailFixed) {
        emailsFixed++;
      }
      if (result.statusReset) {
        statusesReset++;
      }
    }

    console.log(
      `[sync-contact-info] Sync complete: ${updated} updated, ${emailsFixed} emails fixed, ${statusesReset} statuses reset, ${removed} removed`,
    );

    return json({
      checked: outreachRows.length,
      updated,
      emailsFixed,
      statusesReset,
      removed,
    });
  } catch (err) {
    console.error('[sync-contact-info] Fatal error:', err);
    return json(
      {
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      500,
    );
  }
});
