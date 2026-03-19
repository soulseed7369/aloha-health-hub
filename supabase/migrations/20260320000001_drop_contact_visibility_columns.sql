-- Remove show_phone and show_email columns from practitioners and centers.
-- These columns are no longer needed as of the click-to-reveal architecture:
-- contact info is now always hidden behind a user-initiated reveal action,
-- making per-provider visibility toggles redundant.

ALTER TABLE practitioners
  DROP COLUMN IF EXISTS show_phone,
  DROP COLUMN IF EXISTS show_email;

ALTER TABLE centers
  DROP COLUMN IF EXISTS show_phone,
  DROP COLUMN IF EXISTS show_email;
