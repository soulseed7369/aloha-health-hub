-- Add photos array + profile_photo_index to practitioners (matching centers' pattern).
-- Also add specific_date to classes so they can represent one-off sessions.

-- ─── Practitioner photos ─────────────────────────────────────────────────────
ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_photo_index smallint DEFAULT 0;

COMMENT ON COLUMN practitioners.photos IS 'Up to 3 photo URLs (Premium/Featured). Index 0..2.';
COMMENT ON COLUMN practitioners.profile_photo_index IS 'Which photos[] index to use as avatar_url.';

-- Backfill: copy existing avatar_url into photos[0] where photos is empty
UPDATE practitioners
SET photos = ARRAY[avatar_url]
WHERE avatar_url IS NOT NULL
  AND (photos IS NULL OR array_length(photos, 1) IS NULL);

-- ─── Class specific dates ────────────────────────────────────────────────────
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS specific_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

COMMENT ON COLUMN classes.specific_date IS 'For one-off classes — takes precedence over day_of_week.';
COMMENT ON COLUMN classes.end_date IS 'Optional end date for multi-day class events.';
