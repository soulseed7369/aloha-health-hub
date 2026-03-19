-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260318000010_fix_claim_rpcs
-- Purpose:   Fix PostgreSQL bug: IF NOT FOUND doesn't work after plain UPDATE.
--            Replace with GET DIAGNOSTICS v_rows = ROW_COUNT pattern.
--            Also add admin_link_listing RPC for manual listing ownership.
-- Apply via: Supabase Dashboard → SQL Editor → paste and run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Fix claim_listing() — Tier 1 (email match + OTP verified) ─────────────
CREATE OR REPLACE FUNCTION public.claim_listing(p_practitioner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE practitioners
  SET
    owner_id = auth.uid(),
    status   = CASE WHEN status = 'draft' THEN 'published' ELSE status END
  WHERE
    id       = p_practitioner_id
    AND owner_id IS NULL
    AND lower(email) = lower(auth.email());

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'claim_failed: no unclaimed listing found matching your email';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_listing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_listing(uuid) TO authenticated;

-- ── 2. Fix approve_claim() RPC — Tier 4 admin approval ──────────────────────
CREATE OR REPLACE FUNCTION public.approve_claim(p_claim_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_practitioner_id uuid;
  v_center_id       uuid;
  v_user_id         uuid;
  v_listing_type    text;
  v_rows            int;
BEGIN
  SELECT practitioner_id, center_id, user_id, listing_type
    INTO v_practitioner_id, v_center_id, v_user_id, v_listing_type
    FROM claim_requests
   WHERE id = p_claim_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found or already processed';
  END IF;

  -- Handle practitioner claim
  IF v_listing_type = 'practitioner' OR v_practitioner_id IS NOT NULL THEN
    UPDATE practitioners
       SET owner_id = v_user_id,
           status   = CASE WHEN status = 'draft' THEN 'published' ELSE status END
     WHERE id = v_practitioner_id AND owner_id IS NULL;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'Practitioner listing not found or already claimed';
    END IF;
  -- Handle center claim
  ELSIF v_listing_type = 'center' OR v_center_id IS NOT NULL THEN
    UPDATE centers
       SET owner_id = v_user_id,
           status   = CASE WHEN status = 'draft' THEN 'published' ELSE status END
     WHERE id = v_center_id AND owner_id IS NULL;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'Center listing not found or already claimed';
    END IF;
  END IF;

  UPDATE claim_requests
     SET status = 'approved', reviewed_at = now()
   WHERE id = p_claim_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_claim(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_claim(uuid) TO service_role;

-- ── 3. Fix deny_claim() RPC ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deny_claim(p_claim_id uuid, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE claim_requests
     SET status = 'denied', admin_notes = p_notes, reviewed_at = now()
   WHERE id = p_claim_id AND status = 'pending';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Claim not found or already processed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.deny_claim(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deny_claim(uuid, text) TO service_role;

-- ── 4. Fix claim_listing_center() RPC — Tier 1 for centers ────────────────
CREATE OR REPLACE FUNCTION public.claim_listing_center(p_center_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE centers
  SET
    owner_id = auth.uid(),
    status   = CASE WHEN status = 'draft' THEN 'published' ELSE status END,
    email_verified_at = now()  -- Tier 1 claim proves email ownership
  WHERE
    id       = p_center_id
    AND owner_id IS NULL
    AND lower(email) = lower(auth.email());

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'claim_failed: no unclaimed center found matching your email';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_listing_center(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_listing_center(uuid) TO authenticated;

-- ── 5. Fix approve_claim_center() RPC — Tier 4 admin approval for centers ─
CREATE OR REPLACE FUNCTION public.approve_claim_center(p_claim_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_center_id uuid;
  v_user_id   uuid;
  v_rows      int;
BEGIN
  SELECT center_id, user_id
    INTO v_center_id, v_user_id
    FROM claim_requests
   WHERE id = p_claim_id
     AND status = 'pending'
     AND listing_type = 'center';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Center claim not found or already processed';
  END IF;

  UPDATE centers
     SET owner_id = v_user_id,
         status   = CASE WHEN status = 'draft' THEN 'published' ELSE status END
   WHERE id = v_center_id AND owner_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Center listing not found or already claimed';
  END IF;

  UPDATE claim_requests
     SET status = 'approved', reviewed_at = now()
   WHERE id = p_claim_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_claim_center(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_claim_center(uuid) TO service_role;

-- ── 6. Fix deny_claim_center() RPC ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deny_claim_center(p_claim_id uuid, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE claim_requests
     SET status = 'denied', admin_notes = p_notes, reviewed_at = now()
   WHERE id = p_claim_id
     AND status = 'pending'
     AND listing_type = 'center';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Center claim not found or already processed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.deny_claim_center(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deny_claim_center(uuid, text) TO service_role;

-- ── 7. Fix claim_listing_sms() RPC — Claim practitioner via SMS OTP ─────────
CREATE OR REPLACE FUNCTION public.claim_listing_sms(
  p_listing_id uuid,
  p_user_id    uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE practitioners
     SET owner_id          = p_user_id,
         phone_verified_at = now(),
         status            = CASE WHEN status = 'draft' THEN 'published' ELSE status END
   WHERE id       = p_listing_id
     AND owner_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'claim_failed: listing not found or already claimed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_listing_sms(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.claim_listing_sms(uuid, uuid) TO service_role;

-- ── 8. Fix claim_listing_center_sms() RPC — Claim center via SMS OTP ──────
CREATE OR REPLACE FUNCTION public.claim_listing_center_sms(
  p_listing_id uuid,
  p_user_id    uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE centers
     SET owner_id          = p_user_id,
         phone_verified_at = now(),
         status            = CASE WHEN status = 'draft' THEN 'published' ELSE status END
   WHERE id       = p_listing_id
     AND owner_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'claim_failed: listing not found or already claimed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_listing_center_sms(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.claim_listing_center_sms(uuid, uuid) TO service_role;

-- ── 9. NEW: admin_link_listing() RPC — Manual admin linking ────────────────
-- Lets admins manually link an unclaimed listing to a user account
CREATE OR REPLACE FUNCTION public.admin_link_listing(
  p_listing_id uuid,
  p_listing_type text,  -- 'practitioner' or 'center'
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int;
  v_tier text;
BEGIN
  -- Only admins can call this
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only admins can link listings';
  END IF;

  IF p_listing_type = 'practitioner' THEN
    UPDATE practitioners SET owner_id = p_user_id WHERE id = p_listing_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'Practitioner not found: %', p_listing_id;
    END IF;

    -- Fetch the tier for sync
    SELECT tier INTO v_tier FROM practitioners WHERE id = p_listing_id;
  ELSIF p_listing_type = 'center' THEN
    UPDATE centers SET owner_id = p_user_id WHERE id = p_listing_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'Center not found: %', p_listing_id;
    END IF;

    -- Fetch the tier for sync
    SELECT tier INTO v_tier FROM centers WHERE id = p_listing_id;
  ELSE
    RAISE EXCEPTION 'Invalid listing_type: % (must be "practitioner" or "center")', p_listing_type;
  END IF;

  -- Sync user_profiles tier to match listing tier
  -- Use UPSERT in case user_profiles row doesn't exist yet
  INSERT INTO user_profiles (id, tier, updated_at)
  VALUES (p_user_id, v_tier, now())
  ON CONFLICT (id) DO UPDATE
    SET tier = EXCLUDED.tier, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_link_listing(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_link_listing(uuid, text, uuid) TO service_role;
