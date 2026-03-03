-- =============================================================
-- Migration: 20260304000001_practitioner_business_name
-- Adds a free-text business_name column to practitioners.
--
-- business_name  = plain text, e.g. "Hilo Healing Arts" — for
--                  practitioners who have a business name that is
--                  NOT a center record in the centers table.
-- business_id    = FK to centers.id — for practitioners who are
--                  directly linked to a center record.
--
-- Both can coexist; business_name takes display priority over the
-- joined center name when both are present.
-- =============================================================

ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS business_name text;
