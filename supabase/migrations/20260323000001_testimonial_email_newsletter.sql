-- Add invited_email column to store raw client email (for re-sending edit links)
-- and newsletter_consent for opt-in during testimonial submission.

ALTER TABLE verified_testimonials
  ADD COLUMN IF NOT EXISTS invited_email text,
  ADD COLUMN IF NOT EXISTS newsletter_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edit_reason text;

-- Backfill: no way to reverse hashes, so existing rows stay null.
-- New invites will populate invited_email going forward.

COMMENT ON COLUMN verified_testimonials.invited_email IS 'Raw client email — stored so we can re-send edit links. Populated on invite creation.';
COMMENT ON COLUMN verified_testimonials.newsletter_consent IS 'Client opted in to monthly newsletter during testimonial submission.';
COMMENT ON COLUMN verified_testimonials.edit_reason IS 'Practitioner-provided reason when requesting an edit (shown to client in email).';
