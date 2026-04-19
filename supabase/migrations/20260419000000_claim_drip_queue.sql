-- ─────────────────────────────────────────────────────────────────────────────
-- Claim drip email queue
-- Three-step post-claim email sequence:
--   Step 1 (immediate) — welcome + next steps
--   Step 2 (day 3)     — profile completeness + soft Premium upsell
--   Step 3 (day 14)    — website packages offer
--
-- Apply via Supabase SQL editor:
-- https://supabase.com/dashboard/project/sccksxvjckllxlvyuotv/sql/new
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Queue table ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS claim_drip_queue (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid        NOT NULL,
  listing_type   text        NOT NULL CHECK (listing_type IN ('practitioner', 'center')),
  email          text        NOT NULL,
  name           text,
  island         text,
  modalities     text[],
  step           int         NOT NULL CHECK (step IN (1, 2, 3)),
  send_at        timestamptz NOT NULL,
  sent_at        timestamptz,
  skipped_at     timestamptz,
  skip_reason    text,
  resend_id      text,
  created_at     timestamptz DEFAULT now()
);

-- Index for the processor query (pending rows due to send)
CREATE INDEX IF NOT EXISTS idx_claim_drip_pending
  ON claim_drip_queue (send_at)
  WHERE sent_at IS NULL AND skipped_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_claim_drip_listing
  ON claim_drip_queue (listing_id);

-- ── Trigger function ──────────────────────────────────────────────────────────
-- Fires when owner_id transitions NULL → non-null on practitioners or centers.
-- Inserts the three drip rows. Idempotent — skips if already queued.

CREATE OR REPLACE FUNCTION fn_queue_claim_drip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_type text;
BEGIN
  -- Only fire on null → non-null transition
  IF OLD.owner_id IS NOT NULL OR NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if no email to send to
  IF NEW.email IS NULL OR trim(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  -- Idempotent: skip if already queued for this listing
  IF EXISTS (SELECT 1 FROM claim_drip_queue WHERE listing_id = NEW.id LIMIT 1) THEN
    RETURN NEW;
  END IF;

  v_type := CASE TG_TABLE_NAME WHEN 'practitioners' THEN 'practitioner' ELSE 'center' END;

  INSERT INTO claim_drip_queue
    (listing_id, listing_type, email, name, island, modalities, step, send_at)
  VALUES
    (NEW.id, v_type, NEW.email, NEW.name, NEW.island, NEW.modalities, 1, now()),
    (NEW.id, v_type, NEW.email, NEW.name, NEW.island, NEW.modalities, 2, now() + interval '3 days'),
    (NEW.id, v_type, NEW.email, NEW.name, NEW.island, NEW.modalities, 3, now() + interval '14 days');

  RETURN NEW;
END;
$$;

-- ── Triggers ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_claim_drip_practitioners ON practitioners;
CREATE TRIGGER trg_claim_drip_practitioners
  AFTER UPDATE OF owner_id ON practitioners
  FOR EACH ROW EXECUTE FUNCTION fn_queue_claim_drip();

DROP TRIGGER IF EXISTS trg_claim_drip_centers ON centers;
CREATE TRIGGER trg_claim_drip_centers
  AFTER UPDATE OF owner_id ON centers
  FOR EACH ROW EXECUTE FUNCTION fn_queue_claim_drip();

-- ── pg_cron schedule ─────────────────────────────────────────────────────────
-- Runs every 15 minutes.
--
-- Before running this block:
--   1. Generate a random secret, e.g.: openssl rand -hex 20
--   2. Set it as a Supabase secret:
--        supabase secrets set DRIP_SECRET=<your_secret>
--   3. Replace YOUR_DRIP_SECRET below with that same value.

SELECT cron.schedule(
  'process-claim-drip',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://sccksxvjckllxlvyuotv.supabase.co/functions/v1/process-claim-drip',
    headers := '{"Content-Type": "application/json", "x-drip-secret": "YOUR_DRIP_SECRET"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
