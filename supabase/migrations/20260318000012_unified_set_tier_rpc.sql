-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260318000012_unified_set_tier_rpc
-- Purpose:   Unified tier management RPC to eliminate conflicts between
--            admin panel and Stripe webhook tier updates.
-- Apply via: Supabase Dashboard → SQL Editor → paste and run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helper RPC: Set tier for a user (practitioner + center + featured_slots) ──
-- This is the single source of truth for tier management.
-- Both admin panel and Stripe webhook call this RPC.
-- SECURITY DEFINER so it can manage featured_slots (RLS-protected table)
-- Only callable by admins or via service role (Stripe webhook)
CREATE OR REPLACE FUNCTION public.set_user_tier(
  p_user_id uuid,
  p_new_tier text,
  p_old_tier text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
BEGIN
  -- Validate tier
  IF p_new_tier NOT IN ('free', 'premium', 'featured') THEN
    RAISE EXCEPTION 'Invalid tier: %', p_new_tier;
  END IF;

  -- Update user_profiles tier
  INSERT INTO user_profiles (id, tier, updated_at)
  VALUES (p_user_id, p_new_tier, now())
  ON CONFLICT (id) DO UPDATE SET
    tier = p_new_tier,
    updated_at = now();

  -- Update all practitioner listings owned by this user
  UPDATE practitioners
  SET tier = p_new_tier, updated_at = now()
  WHERE owner_id = p_user_id;

  -- Update all center listings owned by this user
  UPDATE centers
  SET tier = p_new_tier, updated_at = now()
  WHERE owner_id = p_user_id;

  -- Manage featured slots
  IF p_new_tier = 'featured' THEN
    -- Create featured slots for all owned practitioner listings
    FOR v_listing IN
      SELECT id, island FROM practitioners WHERE owner_id = p_user_id
    LOOP
      INSERT INTO featured_slots (listing_id, listing_type, island, owner_id, created_at)
      VALUES (v_listing.id, 'practitioner', v_listing.island, p_user_id, now())
      ON CONFLICT (listing_id) DO UPDATE SET
        grace_until = NULL;  -- Clear any grace period on re-upgrade
    END LOOP;

    -- Create featured slots for all owned center listings
    FOR v_listing IN
      SELECT id, island FROM centers WHERE owner_id = p_user_id
    LOOP
      INSERT INTO featured_slots (listing_id, listing_type, island, owner_id, created_at)
      VALUES (v_listing.id, 'center', v_listing.island, p_user_id, now())
      ON CONFLICT (listing_id) DO UPDATE SET
        grace_until = NULL;  -- Clear any grace period on re-upgrade
    END LOOP;
  ELSIF p_old_tier = 'featured' AND p_new_tier != 'featured' THEN
    -- Set 90-day grace period on featured slots (don't delete immediately)
    UPDATE featured_slots
    SET grace_until = now() + interval '90 days'
    WHERE owner_id = p_user_id
      AND grace_until IS NULL;
  END IF;
END;
$$;

-- Grant service role access (for Stripe webhook)
REVOKE ALL ON FUNCTION public.set_user_tier(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_tier(uuid, text, text) TO service_role;

-- ─── MIGRATION NOTE ──────────────────────────────────────────────────────────
-- The Stripe webhook's syncTierToListings function (in the stripe-webhook edge
-- function) should be updated in a future deployment to call set_user_tier() RPC
-- instead of doing manual updates. This will ensure all tier changes funnel
-- through a single RPC, preventing conflicts.
--
-- Example Stripe webhook update:
--   const { error } = await supabaseAdmin.rpc('set_user_tier', {
--     p_user_id: userId,
--     p_new_tier: tier,
--     p_old_tier: currentTier,
--   });
-- ─────────────────────────────────────────────────────────────────────────────
