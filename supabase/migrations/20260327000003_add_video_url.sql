-- Add video_url column to practitioners and centers tables
-- Used for YouTube/Vimeo embed on featured listings
ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE centers
  ADD COLUMN IF NOT EXISTS video_url text;

-- Add missing columns to centers that exist on practitioners
-- (modalities, photos, accepts_new_clients were never added to centers)
ALTER TABLE centers
  ADD COLUMN IF NOT EXISTS modalities      text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS photos          text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accepts_new_clients boolean DEFAULT true;

COMMENT ON COLUMN practitioners.video_url IS 'YouTube or Vimeo URL for featured listing video embed';
COMMENT ON COLUMN centers.video_url IS 'YouTube or Vimeo URL for featured listing video embed';
