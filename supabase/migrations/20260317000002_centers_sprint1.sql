-- ─── Centers Sprint 1: Amenities, Events, Testimonials, Staff Roster ─────────
-- Sprint: Center-specific features to differentiate from practitioner profiles.
-- Apply in Supabase Dashboard → SQL Editor.

-- ─── 1. Amenities column on centers ──────────────────────────────────────────

ALTER TABLE centers
  ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}';

-- ─── 2. center_events table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS center_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id         uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  title             text NOT NULL,
  description       text,
  event_date        date,
  start_time        time,
  end_time          time,
  duration_minutes  integer,
  price_mode        text NOT NULL DEFAULT 'fixed'
                    CHECK (price_mode IN ('fixed','range','sliding','contact','free')),
  price_fixed       numeric(10,2),
  price_min         numeric(10,2),
  price_max         numeric(10,2),
  image_url         text,
  location          text,
  registration_url  text,
  max_attendees     integer,
  attendees_booked  integer NOT NULL DEFAULT 0,
  is_recurring      boolean NOT NULL DEFAULT false,
  recurrence_rule   text,   -- simple text: 'weekly', 'monthly', 'every tue/thu' etc.
  sort_order        integer NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'published'
                    CHECK (status IN ('draft','published')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_center_events_center
  ON center_events (center_id, status, event_date);

-- ─── 3. center_testimonials table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS center_testimonials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id         uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  author            text NOT NULL,
  author_avatar_url text,
  text              text NOT NULL,
  author_location   text,
  testimonial_date  date,
  linked_type       text CHECK (linked_type IN ('event','class')),
  linked_id         uuid,
  sort_order        integer NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'published'
                    CHECK (status IN ('draft','published')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_center_testimonials
  ON center_testimonials (center_id, status);

-- ─── 4. center_practitioners join table (staff roster) ───────────────────────

CREATE TABLE IF NOT EXISTS center_practitioners (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id        uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  practitioner_id  uuid NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  role             text,           -- e.g. 'Lead Therapist', 'Instructor', 'Founder'
  sort_order       integer NOT NULL DEFAULT 0,
  approved         boolean NOT NULL DEFAULT false,  -- practitioner must approve
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (center_id, practitioner_id)
);

CREATE INDEX IF NOT EXISTS idx_center_practitioners_center
  ON center_practitioners (center_id, approved);
CREATE INDEX IF NOT EXISTS idx_center_practitioners_prac
  ON center_practitioners (practitioner_id);

-- ─── 5. updated_at triggers ──────────────────────────────────────────────────

CREATE TRIGGER center_events_updated_at
  BEFORE UPDATE ON center_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER center_testimonials_updated_at
  BEFORE UPDATE ON center_testimonials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 6. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE center_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_practitioners ENABLE ROW LEVEL SECURITY;

-- Public read of published records
CREATE POLICY "center_events_public_read"
  ON center_events FOR SELECT USING (status = 'published');

CREATE POLICY "center_testimonials_public_read"
  ON center_testimonials FOR SELECT USING (status = 'published');

-- Approved roster members are public
CREATE POLICY "center_practitioners_public_read"
  ON center_practitioners FOR SELECT USING (approved = true);

-- Owners can do full CRUD
CREATE POLICY "center_events_owner_all"
  ON center_events FOR ALL
  USING (center_id IN (SELECT id FROM centers WHERE owner_id = auth.uid()))
  WITH CHECK (center_id IN (SELECT id FROM centers WHERE owner_id = auth.uid()));

CREATE POLICY "center_testimonials_owner_all"
  ON center_testimonials FOR ALL
  USING (center_id IN (SELECT id FROM centers WHERE owner_id = auth.uid()))
  WITH CHECK (center_id IN (SELECT id FROM centers WHERE owner_id = auth.uid()));

CREATE POLICY "center_practitioners_owner_all"
  ON center_practitioners FOR ALL
  USING (center_id IN (SELECT id FROM centers WHERE owner_id = auth.uid()))
  WITH CHECK (center_id IN (SELECT id FROM centers WHERE owner_id = auth.uid()));

-- Practitioners can see their own pending invites and approve/deny them
CREATE POLICY "center_practitioners_self_manage"
  ON center_practitioners FOR UPDATE
  USING (practitioner_id IN (SELECT id FROM practitioners WHERE owner_id = auth.uid()));
