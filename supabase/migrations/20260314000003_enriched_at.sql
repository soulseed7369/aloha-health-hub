-- Add enriched_at timestamp to practitioners and centers
-- Tracks when a listing was last enriched via website crawl

ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

-- Index for finding stale enrichments (WHERE enriched_at IS NULL OR enriched_at < now() - rescore_days)
CREATE INDEX IF NOT EXISTS idx_practitioners_enriched_at ON practitioners (enriched_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_centers_enriched_at ON centers (enriched_at NULLS FIRST);
