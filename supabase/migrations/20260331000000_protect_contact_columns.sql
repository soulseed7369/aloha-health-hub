-- =============================================================
-- Migration: 20260331000000_protect_contact_columns
-- Purpose:   Restrict email and phone from anon/public queries.
--            Contact info is revealed only via an authenticated
--            API route that uses the service role key server-side.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- Revoke SELECT on email and phone from the anon and public roles
-- on the raw practitioners and centers tables.
--
-- After this migration:
--   - anon key queries for email/phone return no data (empty)
--   - service_role key can still read all columns
--   - authenticated users can still read all columns
-- ─────────────────────────────────────────────────────────────

-- Revoke from anon only (the Supabase public API user role).
-- Do NOT revoke from `public` — that's the Postgres default role and
-- revoking from it can break other schema objects unexpectedly.
REVOKE SELECT (email, phone) ON practitioners FROM anon;
REVOKE SELECT (email, phone) ON centers FROM anon;

-- ─────────────────────────────────────────────────────────────
-- Re-grant access for authenticated users so logged-in
-- practitioners can still view their own contact info in the
-- dashboard (DashboardProfile reads their own row).
-- ─────────────────────────────────────────────────────────────

GRANT SELECT (email, phone) ON practitioners TO authenticated;
GRANT SELECT (email, phone) ON centers TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- Rollback:
--   GRANT SELECT (email, phone) ON practitioners TO anon;
--   GRANT SELECT (email, phone) ON centers TO anon;
-- ─────────────────────────────────────────────────────────────
