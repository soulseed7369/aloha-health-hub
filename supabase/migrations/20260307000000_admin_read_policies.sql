-- Migration: Admin read policies
-- Allows users whose email is in the admin list to read ALL records
-- regardless of status or owner_id (needed for the admin panel to see drafts).

-- Helper: returns true if the currently authenticated user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'email' = ANY(ARRAY[
      'marcuswoo@gmail.com'
    ]),
    false
  );
$$;

-- Practitioners: admin can read all
CREATE POLICY "admin_read_all_practitioners" ON practitioners
  FOR SELECT TO authenticated
  USING (is_admin());

-- Practitioners: admin can update any record (needed for tier changes, edits)
CREATE POLICY "admin_update_all_practitioners" ON practitioners
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Practitioners: admin can delete any record
CREATE POLICY "admin_delete_all_practitioners" ON practitioners
  FOR DELETE TO authenticated
  USING (is_admin());

-- Practitioners: admin can insert (e.g. manual adds from admin panel)
CREATE POLICY "admin_insert_practitioners" ON practitioners
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Centers: admin can read all
CREATE POLICY "admin_read_all_centers" ON centers
  FOR SELECT TO authenticated
  USING (is_admin());

-- Centers: admin can update any record
CREATE POLICY "admin_update_all_centers" ON centers
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Centers: admin can delete any record
CREATE POLICY "admin_delete_all_centers" ON centers
  FOR DELETE TO authenticated
  USING (is_admin());

-- Centers: admin can insert
CREATE POLICY "admin_insert_centers" ON centers
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Retreats: admin full access
CREATE POLICY "admin_read_all_retreats" ON retreats
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "admin_update_all_retreats" ON retreats
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admin_delete_all_retreats" ON retreats
  FOR DELETE TO authenticated
  USING (is_admin());

CREATE POLICY "admin_insert_retreats" ON retreats
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Articles: admin full access
CREATE POLICY "admin_read_all_articles" ON articles
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "admin_update_all_articles" ON articles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admin_delete_all_articles" ON articles
  FOR DELETE TO authenticated
  USING (is_admin());

CREATE POLICY "admin_insert_articles" ON articles
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
