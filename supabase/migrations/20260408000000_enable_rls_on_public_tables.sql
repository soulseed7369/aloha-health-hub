-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260408000000_enable_rls_on_public_tables
-- Purpose:   Resolve Supabase linter ERROR `rls_disabled_in_public` on four
--            tables that were publicly readable/writable:
--              - claim_sms_otps       (service-role only)
--              - campaign_emails      (service-role writes + admin read)
--              - pipeline_corrections (admin write + admin read)
--              - campaign_outreach    (admin full + service-role + narrow
--                                      owner UPDATE via RPC)
-- Apply via: Supabase Dashboard → SQL Editor → paste and run (entire file).
-- Depends on: `is_admin()` helper from 20260307000000_admin_read_policies.sql
-- Rollback:  ALTER TABLE <t> DISABLE ROW LEVEL SECURITY;
--            DROP POLICY ... ON <t>;
--            DROP FUNCTION public.mark_campaign_claimed(uuid);
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. claim_sms_otps ───────────────────────────────────────────────────────
-- Only callers: edge function `claim-listing-otp` via service role.
-- Service role bypasses RLS, so zero policies = fully locked down.
ALTER TABLE public.claim_sms_otps ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.claim_sms_otps IS
  'Service-role only. Accessed via claim-listing-otp edge function. RLS enabled with no policies.';


-- ── 2. campaign_emails ──────────────────────────────────────────────────────
-- Callers: edge functions send-campaign-emails, sync-resend-status (service role).
-- Browser never touches this table.
ALTER TABLE public.campaign_emails ENABLE ROW LEVEL SECURITY;

-- Admin read so the admin panel / future reporting can surface email history.
DROP POLICY IF EXISTS "admin_read_campaign_emails" ON public.campaign_emails;
CREATE POLICY "admin_read_campaign_emails" ON public.campaign_emails
  FOR SELECT TO authenticated
  USING (is_admin());

COMMENT ON TABLE public.campaign_emails IS
  'Service-role writes via edge functions. Admin read for reporting.';


-- ── 3. pipeline_corrections ─────────────────────────────────────────────────
-- Callers: AdminPanel via useAdmin.useRecordCorrection (browser, admin user)
--          + pipeline scripts (service role).
ALTER TABLE public.pipeline_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_insert_pipeline_corrections" ON public.pipeline_corrections;
CREATE POLICY "admin_insert_pipeline_corrections" ON public.pipeline_corrections
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_select_pipeline_corrections" ON public.pipeline_corrections;
CREATE POLICY "admin_select_pipeline_corrections" ON public.pipeline_corrections
  FOR SELECT TO authenticated
  USING (is_admin());

COMMENT ON TABLE public.pipeline_corrections IS
  'Admin-only writes from AdminPanel. Service role writes from pipeline scripts.';


-- ── 4. campaign_outreach ────────────────────────────────────────────────────
-- Heavy service-role use from edge functions and pipeline scripts.
-- Previously the browser did a fire-and-forget UPDATE from ClaimListing.tsx;
-- that direct write is replaced by mark_campaign_claimed() below.
ALTER TABLE public.campaign_outreach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_campaign_outreach" ON public.campaign_outreach;
CREATE POLICY "admin_all_campaign_outreach" ON public.campaign_outreach
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON TABLE public.campaign_outreach IS
  'Service-role writes from edge functions + pipeline. Admin full access.
   Claimant updates flow through mark_campaign_claimed() RPC.';


-- ── RPC: mark_campaign_claimed ──────────────────────────────────────────────
-- Narrow SECURITY DEFINER wrapper called by ClaimListing.tsx after a successful
-- claim. Verifies the caller is now the owner of the listing, then flips the
-- matching campaign_outreach row to status='claimed'. If no row exists, it's
-- a no-op (the listing was never part of a campaign batch).
CREATE OR REPLACE FUNCTION public.mark_campaign_claimed(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owns   boolean := false;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Caller must now be the owner of the matching practitioner OR center.
  SELECT EXISTS (
    SELECT 1 FROM practitioners WHERE id = p_listing_id AND owner_id = v_caller
    UNION ALL
    SELECT 1 FROM centers       WHERE id = p_listing_id AND owner_id = v_caller
  ) INTO v_owns;

  IF NOT v_owns THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  UPDATE campaign_outreach
     SET status     = 'claimed',
         has_owner  = true,
         claimed_at = COALESCE(claimed_at, now())
   WHERE listing_id = p_listing_id
     AND status IN (
       'not_contacted','email_queued','email_1_sent','email_1_opened',
       'email_2_sent','replied','claimed'
     );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_campaign_claimed(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.mark_campaign_claimed(uuid) TO authenticated;

COMMENT ON FUNCTION public.mark_campaign_claimed(uuid) IS
  'Called by ClaimListing.tsx post-claim. Verifies auth.uid() owns the listing
   and marks the campaign_outreach row as claimed. No-op if no row exists.';
