-- Enforce Package Limits (Listings and Staff) via RLS
-- This migration updates existing RLS policies to strictly enforce package limits at the DB level.

-- ============================================================================
-- 1. LISTING LIMITS (sell_listings)
-- ============================================================================

-- Function to get listing limit by package (mapping from StoreEntitlements.ts)
CREATE OR REPLACE FUNCTION get_listing_limit_by_package(p_package_slug text)
RETURNS INTEGER AS $$
BEGIN
  CASE p_package_slug
    WHEN 'diamond' THEN RETURN 100000;
    WHEN 'gold' THEN RETURN 2000;
    WHEN 'silver' THEN RETURN 200;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update sell_listings INSERT policy to check limits
DROP POLICY IF EXISTS "Authenticated users can create listings" ON public.sell_listings;
CREATE POLICY "Authenticated users can create listings"
  ON public.sell_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Either create as user listing (individual sellers)
    (user_id = auth.uid() AND store_id IS NULL)
    OR
    -- Or create as store listing (must own/manage store and be within limits)
    (
      store_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.stores
        WHERE stores.id = sell_listings.store_id
        AND (
          stores.owner_id = auth.uid() 
          OR EXISTS (
            SELECT 1 FROM public.store_admins 
            WHERE store_id = stores.id AND user_id = auth.uid() AND status = 'active'
          )
        )
        AND store_can_enable_marketplace(stores.package_slug)
        AND stores.subscription_status = 'active'
        -- ENFORCE LIMIT: Count existing active listings
        AND (
          SELECT COUNT(*) FROM public.sell_listings 
          WHERE store_id = stores.id AND status = 'active'
        ) < get_listing_limit_by_package(stores.package_slug)
      )
    )
  );

-- ============================================================================
-- 2. STAFF LIMITS (store_admins)
-- ============================================================================

-- Function to get manager limit by package
CREATE OR REPLACE FUNCTION get_manager_limit_by_package(p_package_slug text)
RETURNS INTEGER AS $$
BEGIN
  CASE p_package_slug
    WHEN 'diamond' THEN RETURN 20;
    WHEN 'gold' THEN RETURN 5;
    WHEN 'silver' THEN RETURN 2;
    ELSE RETURN 1; -- Owner only
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get staff limit by package
CREATE OR REPLACE FUNCTION get_staff_limit_by_package(p_package_slug text)
RETURNS INTEGER AS $$
BEGIN
  CASE p_package_slug
    WHEN 'diamond' THEN RETURN 50;
    WHEN 'gold' THEN RETURN 3;
    WHEN 'silver' THEN RETURN 0;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update store_admins INSERT policy to check limits
DROP POLICY IF EXISTS "Store owners manage own store staff" ON public.store_admins;
CREATE POLICY "Store owners manage own store staff" ON public.store_admins
    FOR ALL USING (
      public.is_super_admin() 
      OR public.is_store_owner(store_id)
    )
    WITH CHECK (
      public.is_super_admin() 
      OR (
        public.is_store_owner(store_id)
        -- ENFORCE LIMITS based on role being inserted
        AND (
          CASE 
            WHEN role = 'manager' THEN 
              (SELECT COUNT(*) FROM public.store_admins WHERE store_id = store_admins.store_id AND role = 'manager') 
              < get_manager_limit_by_package((SELECT package_slug FROM public.stores WHERE id = store_id))
            WHEN role = 'staff' THEN 
              (SELECT COUNT(*) FROM public.store_admins WHERE store_id = store_admins.store_id AND role = 'staff') 
              < get_staff_limit_by_package((SELECT package_slug FROM public.stores WHERE id = store_id))
            ELSE TRUE -- 'owner' role or others
          END
        )
      )
    );

-- Also ensure 'owner' can't be added if one exists (redundant due to UNIQUE but good for policy)
-- The UNIQUE constraint on (store_id, user_id) handles per-user, 
-- but we might want only ONE owner. Let's check if that's a requirement.
-- For now, we'll stick to manager/staff limits.

-- Update sell_listings SELECT policy to hide listings from stores with inactive subscriptions
DROP POLICY IF EXISTS "Public can view active marketplace listings" ON public.sell_listings;
CREATE POLICY "Public can view active marketplace listings"
  ON public.sell_listings FOR SELECT
  USING (
    status = 'active'
    AND (
      -- Individual listings (no store)
      (store_id IS NULL)
      OR
      -- Store listings must have active store
      EXISTS (
        SELECT 1 FROM public.stores
        WHERE stores.id = sell_listings.store_id
        AND stores.subscription_status = 'active'
        -- AND stores.subscription_end_date > now() -- Optional: add if date check is needed here
      )
    )
  );

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION get_listing_limit_by_package(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_manager_limit_by_package(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_limit_by_package(text) TO authenticated;
