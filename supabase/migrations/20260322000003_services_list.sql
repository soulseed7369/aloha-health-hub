-- Add services_list column to practitioners table
-- Each entry: { name: text, description?: text, price?: text }
ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS services_list jsonb DEFAULT '[]'::jsonb;

-- Migrate working_hours from single-slot to multi-slot format
-- Old format: { "mon": { "open": "09:00", "close": "17:00" } }
-- New format: { "mon": [{ "open": "09:00", "close": "17:00" }] }
-- This is safe to run multiple times
DO $$
DECLARE
  r RECORD;
  day TEXT;
  new_hours jsonb;
  slot jsonb;
BEGIN
  FOR r IN SELECT id, working_hours FROM practitioners WHERE working_hours IS NOT NULL AND working_hours != '{}'::jsonb LOOP
    new_hours := '{}'::jsonb;
    FOR day IN SELECT unnest(ARRAY['mon','tue','wed','thu','fri','sat','sun']) LOOP
      slot := r.working_hours->day;
      IF slot IS NULL OR slot = 'null'::jsonb THEN
        new_hours := new_hours || jsonb_build_object(day, NULL);
      ELSIF jsonb_typeof(slot) = 'array' THEN
        -- Already migrated
        new_hours := new_hours || jsonb_build_object(day, slot);
      ELSIF jsonb_typeof(slot) = 'object' AND slot ? 'open' AND slot ? 'close' THEN
        -- Old single-slot format — wrap in array
        new_hours := new_hours || jsonb_build_object(day, jsonb_build_array(slot));
      ELSE
        new_hours := new_hours || jsonb_build_object(day, NULL);
      END IF;
    END LOOP;
    UPDATE practitioners SET working_hours = new_hours WHERE id = r.id;
  END LOOP;

  -- Same for centers
  FOR r IN SELECT id, working_hours FROM centers WHERE working_hours IS NOT NULL AND working_hours != '{}'::jsonb LOOP
    new_hours := '{}'::jsonb;
    FOR day IN SELECT unnest(ARRAY['mon','tue','wed','thu','fri','sat','sun']) LOOP
      slot := r.working_hours->day;
      IF slot IS NULL OR slot = 'null'::jsonb THEN
        new_hours := new_hours || jsonb_build_object(day, NULL);
      ELSIF jsonb_typeof(slot) = 'array' THEN
        new_hours := new_hours || jsonb_build_object(day, slot);
      ELSIF jsonb_typeof(slot) = 'object' AND slot ? 'open' AND slot ? 'close' THEN
        new_hours := new_hours || jsonb_build_object(day, jsonb_build_array(slot));
      ELSE
        new_hours := new_hours || jsonb_build_object(day, NULL);
      END IF;
    END LOOP;
    UPDATE centers SET working_hours = new_hours WHERE id = r.id;
  END LOOP;
END $$;
