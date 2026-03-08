-- Add 'yoga_studio' to the center_type CHECK constraint on the centers table.
-- The existing constraint must be dropped and recreated since Postgres does not
-- support ALTER CHECK CONSTRAINT directly.

ALTER TABLE centers
  DROP CONSTRAINT IF EXISTS centers_center_type_check;

ALTER TABLE centers
  ADD CONSTRAINT centers_center_type_check
    CHECK (center_type IN ('spa', 'wellness_center', 'clinic', 'retreat_center', 'yoga_studio'));
