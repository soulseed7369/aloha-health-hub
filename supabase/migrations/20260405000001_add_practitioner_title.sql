-- Add optional custom job title to practitioners table.
-- When NULL, the app infers a title from the primary modality (inferTitleFromModality).
-- When set, this value overrides the inferred title on cards and profile pages.

ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS title text;

COMMENT ON COLUMN practitioners.title IS
  'Optional custom job title (e.g. "Somatic Therapist"). When NULL the app infers from the primary modality.';
