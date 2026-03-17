-- Track admin corrections to pipeline-drafted listings
-- Used to build few-shot examples for future classification improvements

CREATE TABLE IF NOT EXISTS pipeline_corrections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid NOT NULL,
  listing_type text NOT NULL,  -- 'practitioner' | 'center'
  field        text NOT NULL,  -- e.g. 'modalities'
  old_value    jsonb,          -- previous value
  new_value    jsonb,          -- new value
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookup by listing
CREATE INDEX IF NOT EXISTS idx_pipeline_corrections_listing
  ON pipeline_corrections (listing_id, listing_type);

-- Index for recent corrections
CREATE INDEX IF NOT EXISTS idx_pipeline_corrections_created_at
  ON pipeline_corrections (created_at DESC);
