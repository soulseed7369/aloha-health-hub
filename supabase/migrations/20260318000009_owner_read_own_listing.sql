-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260318000009_owner_read_own_listing
-- Purpose:   Allow practitioners and center owners to read their OWN listing
--            regardless of status. Without this, owners of draft/pending
--            listings see an empty dashboard profile (query returns 0 rows).
-- Apply via: Supabase Dashboard → SQL Editor → paste and run
-- ─────────────────────────────────────────────────────────────────────────────

-- Practitioners: owner can read their own row regardless of status
CREATE POLICY "owner_read_own_practitioner"
  ON practitioners FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Centers: owner can read their own row regardless of status
CREATE POLICY "owner_read_own_center"
  ON centers FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());
