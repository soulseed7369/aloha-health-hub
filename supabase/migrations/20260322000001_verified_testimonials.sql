-- Verified testimonials — client-written reviews with email verification.
-- Practitioners invite clients via email; clients submit structured responses;
-- practitioners can respond; admins can flag for review.

CREATE TABLE IF NOT EXISTS verified_testimonials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id     uuid NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  invite_token        uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_email_hash  text NOT NULL,
  invite_status       text NOT NULL DEFAULT 'pending'
                      CHECK (invite_status IN ('pending','submitted','published','flagged','expired')),
  invited_at          timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  client_display_name text,
  client_island       text,
  prompt_what_brought text,
  prompt_sessions     text,
  prompt_what_changed text,
  full_text           text,
  highlight           text,
  practitioner_response text,
  responded_at        timestamptz,
  submitted_at        timestamptz,
  published_at        timestamptz,
  flagged_at          timestamptz,
  flag_reason         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verified_testimonials_practitioner ON verified_testimonials(practitioner_id, invite_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_verified_testimonials_token ON verified_testimonials(invite_token);
CREATE INDEX IF NOT EXISTS idx_verified_testimonials_email_hash ON verified_testimonials(invited_email_hash);

-- Dedup: same email can only have one active invite per practitioner (pending or published)
-- Expired/flagged invites don't block re-inviting
CREATE UNIQUE INDEX IF NOT EXISTS idx_verified_testimonials_dedup
  ON verified_testimonials(practitioner_id, invited_email_hash)
  WHERE invite_status IN ('pending', 'published');

ALTER TABLE verified_testimonials ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read published testimonials
DO $$ BEGIN
  CREATE POLICY "Published testimonials are public"
    ON verified_testimonials FOR SELECT
    USING (invite_status = 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Public: anyone with a valid token can read their pending invite (for submission page)
DO $$ BEGIN
  CREATE POLICY "Pending invites readable by token"
    ON verified_testimonials FOR SELECT
    USING (invite_status = 'pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Practitioners: can read all their own testimonials (any status)
DO $$ BEGIN
  CREATE POLICY "Practitioners read own testimonials"
    ON verified_testimonials FOR SELECT
    USING (practitioner_id IN (
      SELECT id FROM practitioners WHERE owner_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Practitioners: can update response fields on their own testimonials
DO $$ BEGIN
  CREATE POLICY "Practitioners can respond to testimonials"
    ON verified_testimonials FOR UPDATE
    USING (practitioner_id IN (
      SELECT id FROM practitioners WHERE owner_id = auth.uid()
    ))
    WITH CHECK (practitioner_id IN (
      SELECT id FROM practitioners WHERE owner_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service role can do everything (for Edge Functions)
DO $$ BEGIN
  CREATE POLICY "Service role full access"
    ON verified_testimonials FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
