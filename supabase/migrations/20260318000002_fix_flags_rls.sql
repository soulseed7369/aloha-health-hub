-- Fix overly permissive RLS on listing_flags
-- Previously allowed ANY authenticated user to read/update all flags

DROP POLICY IF EXISTS "Admins can view all flags" ON listing_flags;
DROP POLICY IF EXISTS "Admins can update flags" ON listing_flags;

-- Only admins (via is_admin() function) can read all flags
CREATE POLICY "Admins can view all flags" ON listing_flags
  FOR SELECT TO authenticated
  USING (is_admin());

-- Only admins can update flags
CREATE POLICY "Admins can update flags" ON listing_flags
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can still see their own submitted flags
CREATE POLICY "Users can view own flags" ON listing_flags
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);
