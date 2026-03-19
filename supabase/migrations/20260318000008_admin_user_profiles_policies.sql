-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260318000008_admin_user_profiles_policies
-- Purpose:   Allow admin users to read/update/insert user_profiles rows
--            so the admin tier override can sync to user_profiles.tier
-- Depends:   is_admin() function from 20260307000000_admin_read_policies.sql
-- Apply via: Supabase Dashboard → SQL Editor → paste and run
-- ─────────────────────────────────────────────────────────────────────────────

-- Admin can read all user profiles (for accounts tab)
CREATE POLICY "admin_read_all_user_profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admin can update any user profile (tier override)
CREATE POLICY "admin_update_all_user_profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin can insert user profiles (upsert for users who don't have one yet)
CREATE POLICY "admin_insert_user_profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Users can insert their own profile (fallback if signup trigger missed it)
CREATE POLICY "users_insert_own_profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
