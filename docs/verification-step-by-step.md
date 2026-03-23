# Verification System — Step-by-Step Deployment

Everything you need, in order, with copy-paste blocks.

---

## STEP 1: Run the Database Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Paste this entire block and click **Run**:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Contact Verification System
-- Adds email/phone OTP verification for practitioners and centers.
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

CREATE TABLE IF NOT EXISTS public.verification_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL,
  listing_type    text NOT NULL CHECK (listing_type IN ('practitioner', 'center')),
  channel         text NOT NULL CHECK (channel IN ('email', 'phone')),
  code_hash       text NOT NULL,
  destination     text NOT NULL,
  attempts        int  NOT NULL DEFAULT 0,
  max_attempts    int  NOT NULL DEFAULT 3,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_listing
  ON public.verification_codes (listing_id, channel, expires_at DESC);

-- ── 4. RLS on verification_codes ────────────────────────────────────────────

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

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

-- ── 5. Add 'pending_review' to status CHECK constraints ─────────────────────

ALTER TABLE public.practitioners DROP CONSTRAINT IF EXISTS practitioners_status_check;
ALTER TABLE public.practitioners
  ADD CONSTRAINT practitioners_status_check
  CHECK (status IN ('draft', 'pending_review', 'published', 'archived'));

ALTER TABLE public.centers DROP CONSTRAINT IF EXISTS centers_status_check;
ALTER TABLE public.centers
  ADD CONSTRAINT centers_status_check
  CHECK (status IN ('draft', 'pending_review', 'published', 'archived'));

-- ── 6. store_verification_code() RPC ─────────────────────────────────────────

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
  SELECT count(*) INTO v_recent_count
    FROM verification_codes
   WHERE listing_id = p_listing_id
     AND channel = p_channel
     AND created_at > now() - interval '1 hour';

  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'rate_limit: too many verification attempts. Try again in an hour.';
  END IF;

  DELETE FROM verification_codes
   WHERE listing_id = p_listing_id
     AND channel = p_channel
     AND verified_at IS NULL;

  INSERT INTO verification_codes (listing_id, listing_type, channel, code_hash, destination)
  VALUES (p_listing_id, p_listing_type, p_channel, p_code_hash, p_destination)
  RETURNING id INTO v_code_id;

  RETURN v_code_id;
END;
$$;

REVOKE ALL ON FUNCTION public.store_verification_code(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_verification_code(uuid, text, text, text, text) TO service_role;

-- ── 7. check_verification_code() RPC ────────────────────────────────────────

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
  SELECT * INTO v_code
    FROM verification_codes
   WHERE listing_id = p_listing_id
     AND channel = p_channel
     AND verified_at IS NULL
     AND expires_at > now()
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_code.attempts >= v_code.max_attempts THEN
    RETURN false;
  END IF;

  UPDATE verification_codes SET attempts = attempts + 1 WHERE id = v_code.id;

  IF v_code.code_hash != p_code_hash THEN
    RETURN false;
  END IF;

  UPDATE verification_codes SET verified_at = now() WHERE id = v_code.id;

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

-- ── 8. request_listing_review() RPC ─────────────────────────────────────────

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

-- ── 9. Cleanup expired codes ────────────────────────────────────────────────

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

CREATE OR REPLACE FUNCTION public.clear_verification_on_contact_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    NEW.email_verified_at := NULL;
  END IF;
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

-- ── 11. Updated claim_listing() — sets email_verified_at on claim ───────────

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
    email_verified_at = now()
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
```

**Expected result:** "Success. No rows returned" — that's correct.

---

## STEP 2: Customize the Email Template

1. Open **Supabase Dashboard** → **Auth** → **Email Templates**
2. Click the **Magic Link** tab
3. Replace the **Subject** with:

```
{{ .Data.verification_code }} — Verify your listing on Aloha Health Hub
```

4. Replace the **Body** with this HTML:

```html
<h2 style="color: #2d5016; font-family: sans-serif;">🌺 Aloha Health Hub</h2>

<p>Your verification code for <strong>{{ .Data.listing_name }}</strong> is:</p>

<div style="background: #f5f3ff; border: 2px solid #e0daf5; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
  <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333; font-family: 'Courier New', monospace;">
    {{ .Data.verification_code }}
  </span>
</div>

<p style="color: #666; font-size: 13px;">
  This code expires in <strong>10 minutes</strong>.
  If you didn't request this, you can safely ignore this email.
</p>

<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
<p style="color: #999; font-size: 11px; text-align: center;">
  Aloha Health Hub · hawaiiwellness.net
</p>
```

5. Click **Save**

---

## STEP 3: Set Twilio Secrets

1. Open **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Add these 3 secrets one at a time:

| Name | Value |
|------|-------|
| `TWILIO_ACCOUNT_SID` | *(your Twilio account SID — starts with AC)* |
| `TWILIO_AUTH_TOKEN` | *(paste your Twilio auth token here)* |
| `TWILIO_FROM_NUMBER` | `+18085566506` |

---

## STEP 4: Deploy Edge Functions

Open Terminal on your Mac. Run these commands:

```bash
cd ~/path/to/hawaii-wellness
```

Then deploy both functions:

```bash
supabase functions deploy send-verification-code --no-verify-jwt
```

```bash
supabase functions deploy verify-code --no-verify-jwt
```

**If you don't have Supabase CLI installed yet:**

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Your project ref is in the Supabase Dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

---

## STEP 5: Push Frontend to Vercel

```bash
cd ~/path/to/hawaii-wellness
git add -A
git commit -m "Add email + phone verification system"
git push origin main
```

Vercel auto-deploys from main. Wait ~60 seconds for the build.

---

## STEP 6: Test It

### Test phone verification:
1. Log in at hawaiiwellness.net/auth
2. Go to Dashboard → Profile
3. Make sure your listing has a real phone number → Save
4. Click **"Verify phone"** next to the phone field
5. You should get an SMS from **(808) 556-6506** with a 6-digit code
6. Enter the code → green checkmark appears

### Test email verification:
1. Make sure your listing has a real email → Save
2. Click **"Verify email"** next to the email field
3. Check inbox for email with 6-digit code (from Supabase's default sender)
4. Enter the code → green checkmark appears

### Test the review flow:
1. After verifying at least one (email or phone), a **"Request Review"** card appears
2. Click it → listing status changes to `pending_review`
3. Go to Admin Panel → the listing shows as pending review
4. Publish it from admin → listing goes live

---

## Troubleshooting

**"Function not found" error:** Make sure you deployed with `--no-verify-jwt` flag.

**Email not arriving:** Check Supabase Auth → Email Templates. Make sure you saved the Magic Link template. Also check spam folder — Supabase's default sender may land in spam. To fix this long-term, configure custom SMTP in Project Settings → Auth → SMTP Settings.

**SMS not arriving:** Check that all 3 Twilio secrets are set correctly in Edge Functions → Secrets. The auth token is case-sensitive.

**"Too many verification attempts":** Rate limit is 5 per hour per listing per channel. Wait an hour or delete rows from `verification_codes` table in SQL Editor:
```sql
DELETE FROM verification_codes WHERE listing_id = 'the-listing-uuid';
```

**CORS error in browser console:** The Edge Functions only allow requests from `https://hawaiiwellness.net`. If testing on localhost, temporarily change `CORS_HEADERS` in both Edge Functions to allow `*` or your local origin.
