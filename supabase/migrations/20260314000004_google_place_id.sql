-- Add google_place_id column to practitioners and centers
-- This allows script 12 (dedup) to use Google Place ID as a perfect-match signal
-- instead of relying solely on phone/domain/fuzzy-name matching

ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS google_place_id text;

-- Unique indexes to enforce one-to-one mapping with Google Places
-- NULL values are allowed (existing listings may not have a place ID)
CREATE UNIQUE INDEX IF NOT EXISTS idx_practitioners_google_place_id
  ON practitioners (google_place_id)
  WHERE google_place_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_centers_google_place_id
  ON centers (google_place_id)
  WHERE google_place_id IS NOT NULL;
