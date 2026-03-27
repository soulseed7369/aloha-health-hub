-- Add center_id to offerings table (nullable, centers can also have offerings)
ALTER TABLE offerings ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES centers(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_offerings_center_id ON offerings(center_id);

-- Add center_id to classes table (nullable, centers can also have classes)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES centers(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_classes_center_id ON classes(center_id);

-- RLS: centers can manage their own offerings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Centers can manage own offerings' AND tablename = 'offerings') THEN
    CREATE POLICY "Centers can manage own offerings"
      ON offerings FOR ALL
      USING (center_id IN (SELECT id FROM centers WHERE owner_id = auth.uid()))
      WITH CHECK (center_id IN (SELECT id FROM centers WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- RLS: centers can manage their own classes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Centers can manage own classes' AND tablename = 'classes') THEN
    CREATE POLICY "Centers can manage own classes"
      ON classes FOR ALL
      USING (center_id IN (SELECT id FROM centers WHERE owner_id = auth.uid()))
      WITH CHECK (center_id IN (SELECT id FROM centers WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- Public can read published center offerings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read published center offerings' AND tablename = 'offerings') THEN
    CREATE POLICY "Public can read published center offerings"
      ON offerings FOR SELECT
      USING (status = 'published' AND center_id IS NOT NULL);
  END IF;
END $$;

-- Public can read published center classes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read published center classes' AND tablename = 'classes') THEN
    CREATE POLICY "Public can read published center classes"
      ON classes FOR SELECT
      USING (status = 'published' AND center_id IS NOT NULL);
  END IF;
END $$;
