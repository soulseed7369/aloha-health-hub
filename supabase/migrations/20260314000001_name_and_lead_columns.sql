-- Migration: Add first_name, last_name, and marketing lead columns
-- to practitioners and centers tables.
--
-- first_name / last_name: populated by script 22 (website About-page extraction)
--   and script 26 (name parser). Used by adapter to prefer personal over business name.
-- website_platform: CMS/builder detected (squarespace, wix, wordpress, etc.)
-- website_score: 0–100 staleness score (100 = very outdated/no website = best lead)
-- no_website_lead: true if listing has no website at all (hot lead for web sales)
-- lead_score: composite 0–100 for marketing targeting

-- ── practitioners ─────────────────────────────────────────────────────────────

ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS first_name       text,
  ADD COLUMN IF NOT EXISTS last_name        text,
  ADD COLUMN IF NOT EXISTS website_platform text,
  ADD COLUMN IF NOT EXISTS website_score    int2 CHECK (website_score IS NULL OR (website_score >= 0 AND website_score <= 100)),
  ADD COLUMN IF NOT EXISTS no_website_lead  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_score       int2 CHECK (lead_score IS NULL OR (lead_score >= 0 AND lead_score <= 100));

-- ── centers ───────────────────────────────────────────────────────────────────

ALTER TABLE centers
  ADD COLUMN IF NOT EXISTS first_name       text,
  ADD COLUMN IF NOT EXISTS last_name        text,
  ADD COLUMN IF NOT EXISTS website_platform text,
  ADD COLUMN IF NOT EXISTS website_score    int2 CHECK (website_score IS NULL OR (website_score >= 0 AND website_score <= 100)),
  ADD COLUMN IF NOT EXISTS no_website_lead  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_score       int2 CHECK (lead_score IS NULL OR (lead_score >= 0 AND lead_score <= 100));

-- ── Indexes for lead query performance ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_practitioners_lead_score
  ON practitioners (lead_score DESC NULLS LAST)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_centers_lead_score
  ON centers (lead_score DESC NULLS LAST)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_practitioners_no_website
  ON practitioners (no_website_lead)
  WHERE no_website_lead = true;

CREATE INDEX IF NOT EXISTS idx_centers_no_website
  ON centers (no_website_lead)
  WHERE no_website_lead = true;

-- ── Backfill no_website_lead for existing rows ─────────────────────────────────

UPDATE practitioners
  SET no_website_lead = true
  WHERE (website_url IS NULL OR website_url = '')
    AND no_website_lead = false;

UPDATE centers
  SET no_website_lead = true
  WHERE (website_url IS NULL OR website_url = '')
    AND no_website_lead = false;
