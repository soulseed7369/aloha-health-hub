-- ─────────────────────────────────────────────────────────────────────────────
-- Contact Verification System
-- Adds email/phone OTP verification for practitioners and centers.
-- Apply via: Supabase Dashboard → SQL Editor → paste and run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add verification columns to practitioners ────────────────────────────

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS email_verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS phone_verified_at   timestamptz;

-- ── 2. Add verification columns to centers ──────────────────────────────────

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS email_verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS phone_verified_at   timestamptz;

-- ── 3. Verification codes table (shared by both listing types) ──────────────
--    Stores hashed OTP codes with expiry. Cleaned up after use.

CREATE TABLE IF NOT EXISTS public.verification_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL,
  listing_type    text NOT NULL CHECK (listing_type IN ('practitioner', 'center')),
  channel         text NOT NULL CHECK (channel IN ('email', 'phone')),
  code_hash       text NOT NULL,          -- bcrypt hash of the 6-digit code
  destination     text NOT NULL,          -- email address or phone number it was sent to
  attempts        int  NOT NULL DEFAULT 0,
  max_attempts    int  NOT NULL DEFAULT 3,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified_at     timestamptz           -- set once successfully verified
);

-- Index for lookup by listing + channel (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_verification_codes_listing
  ON public.verification_codes (listing_id, channel, expires_at DESC);

-- ── 4. RLS on verification_codes ────────────────────────────────────────────

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own codes (via listing ownership check)
CREATE POLICY "verification_codes_select_own" ON public.verification_codes
  FOR SELECT TO authenticated
  USING (
    (listing_type = 'practitioner' AND listing_id IN (
      SELECT id FROM practitioners WHERE owner_id = auth.uid()
    ))
    OR
    (listing_type = 'center' AND listing_id IN (
      SELECT id FROM centers WHERE owner_id = auth.uid()
    ))
  );

-- Only service_role can insert/update (via Edge Functions)
-- No insert/update policies for authenticated — all writes go through Edge Functions

-- ── 5. Add 'pending_review' to status CHECK constraints ─────────────────────
--    Self-signup listings go draft → pending_review → published

-- Drop existing constraints and recreate with new value
ALTER TABLE public.practitioners DROP CONSTRAINT IF EXISTS practitioners_status_check;
ALTER TABLE public.practitioners
  ADD CONSTRAINT practitioners_status_check
  CHECK (status IN ('draft', 'pending_review', 'published', 'archived'));

ALTER TABLE public.centers DROP CONSTRAINT IF EXISTS centers_status_check;
ALTER TABLE public.centers
  ADD CONSTRAINT centers_status_check
  CHECK (status IN ('draft', 'pending_review', 'published', 'archived'));

-- ── 6. send_verification_code() RPC ─────────────────────────────────────────
--    Called by Edge Function to store hashed code. Returns code_id for tracking.

CREATE OR REPLACE FUNCTION public.store_verification_code(
  p_listing_id   uuid,
  p_listing_type text,
  p_channel      text,
  p_code_hash    text,
  p_destination  text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_id uuid;
  v_recent_count int;
BEGIN
  -- Rate limit: max 5 codes per listing per channel per hour
  SELECT count(*) INTO v_recent_count
    FROM verification_codes
   WHERE listing_id = p_listing_id
     AND channel = p_channel
     AND created_at > now() - interval '1 hour';

  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'rate_limit: too many verification attempts. Try again in an hour.';
  END IF;

  -- Invalidate any existing unexpired codes for this listing+channel
  DELETE FROM verification_codes
   WHERE listing_id = p_listing_id
     AND channel = p_channel
     AND verified_at IS NULL;

  -- Insert new code
  INSERT INTO verification_codes (listing_id, listing_type, channel, code_hash, destination)
  VALUES (p_listing_id, p_listing_type, p_channel, p_code_hash, p_destination)
  RETURNING id INTO v_code_id;

  RETURN v_code_id;
END;
$$;

REVOKE ALL ON FUNCTION public.store_verification_code(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_verification_code(uuid, text, text, text, text) TO service_role;

-- ── 7. verify_code() RPC ────────────────────────────────────────────────────
--    Validates OTP, marks listing as verified, returns success/failure.

CREATE OR REPLACE FUNCTION public.check_verification_code(
  p_listing_id   uuid,
  p_listing_type text,
  p_channel      text,
  p_code_hash    text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code   record;
BEGIN
  -- Find the latest unexpired, unverified code for this listing+channel
  SELECT * INTO v_code
    FROM verification_codes
   WHERE listing_id = p_listing_id
     AND channel = p_channel
     AND verified_at IS NULL
     AND expires_at > now()
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;  -- no valid code exists
  END IF;

  -- Check attempt limit
  IF v_code.attempts >= v_code.max_attempts THEN
    RETURN false;  -- too many attempts
  END IF;

  -- Increment attempt counter
  UPDATE verification_codes SET attempts = attempts + 1 WHERE id = v_code.id;

  -- Compare code hashes
  IF v_code.code_hash != p_code_hash THEN
    RETURN false;  -- wrong code
  END IF;

  -- Success! Mark code as verified
  UPDATE verification_codes SET verified_at = now() WHERE id = v_code.id;

  -- Set verification timestamp on the listing
  IF p_listing_type = 'practitioner' AND p_channel = 'email' THEN
    UPDATE practitioners SET email_verified_at = now() WHERE id = p_listing_id;
  ELSIF p_listing_type = 'practitioner' AND p_channel = 'phone' THEN
    UPDATE practitioners SET phone_verified_at = now() WHERE id = p_listing_id;
  ELSIF p_listing_type = 'center' AND p_channel = 'email' THEN
    UPDATE centers SET email_verified_at = now() WHERE id = p_listing_id;
  ELSIF p_listing_type = 'center' AND p_channel = 'phone' THEN
    UPDATE centers SET phone_verified_at = now() WHERE id = p_listing_id;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_verification_code(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_verification_code(uuid, text, text, text) TO service_role;

-- ── 8. request_review() RPC ─────────────────────────────────────────────────
--    Practitioner calls this after verifying. Moves listing to pending_review.

CREATE OR REPLACE FUNCTION public.request_listing_review(
  p_listing_id   uuid,
  p_listing_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_listing_type = 'practitioner' THEN
    UPDATE practitioners
       SET status = 'pending_review'
     WHERE id = p_listing_id
       AND owner_id = auth.uid()
       AND status = 'draft'
       AND (email_verified_at IS NOT NULL OR phone_verified_at IS NOT NULL);
  ELSIF p_listing_type = 'center' THEN
    UPDATE centers
       SET status = 'pending_review'
     WHERE id = p_listing_id
       AND owner_id = auth.uid()
       AND status = 'draft'
       AND (email_verified_at IS NOT NULL OR phone_verified_at IS NOT NULL);
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot request review: listing not found, not owned by you, not in draft status, or no verified contact info.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.request_listing_review(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_listing_review(uuid, text) TO authenticated;

-- ── 9. Cleanup job: delete expired codes older than 24h ─────────────────────
--    Run via pg_cron or manual: SELECT cleanup_expired_verification_codes();

CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM verification_codes
   WHERE expires_at < now() - interval '24 hours'
  RETURNING 1 INTO v_deleted;

  RETURN COALESCE(v_deleted, 0);
END;
$$;

-- ── 10. Clear verification when contact info changes ────────────────────────
--     If a practitioner changes their email, reset email_verified_at to NULL.

CREATE OR REPLACE FUNCTION public.clear_verification_on_contact_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If email changed, clear email verification
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    NEW.email_verified_at := NULL;
  END IF;
  -- If phone changed, clear phone verification
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    NEW.phone_verified_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_practitioners_clear_verification
  BEFORE UPDATE ON practitioners
  FOR EACH ROW
  EXECUTE FUNCTION clear_verification_on_contact_change();

CREATE TRIGGER trg_centers_clear_verification
  BEFORE UPDATE ON centers
  FOR EACH ROW
  EXECUTE FUNCTION clear_verification_on_contact_change();

-- ── 11. Update claim_listing() to also set email_verified_at ────────────────
--    When Tier 1 claim succeeds (email match + OTP), the email is proven valid.

CREATE OR REPLACE FUNCTION public.claim_listing(p_practitioner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE practitioners
  SET
    owner_id = auth.uid(),
    status   = CASE WHEN status = 'draft' THEN 'published' ELSE status END,
    email_verified_at = now()  -- Tier 1 claim proves email ownership
  WHERE
    id       = p_practitioner_id
    AND owner_id IS NULL
    AND lower(email) = lower(auth.email());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'claim_failed: no unclaimed listing found matching your email';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_listing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_listing(uuid) TO authenticated;
