-- Multi-Vendor Marketplace RLS Policies
-- Enforce access control based on user role, store ownership, and package entitlements

-- ============================================================================
-- SELL_LISTINGS RLS POLICIES
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Sell Listings: Viewable by everyone" ON public.sell_listings;
DROP POLICY IF EXISTS "Sell Listings: Users manage own" ON public.sell_listings;
DROP POLICY IF EXISTS "Sell Listings: Admins manage all" ON public.sell_listings;
DROP POLICY IF EXISTS "Public listings are viewable by everyone." ON public.sell_listings;
DROP POLICY IF EXISTS "Users can insert their own listings." ON public.sell_listings;
DROP POLICY IF EXISTS "Users can update their own listings." ON public.sell_listings;
DROP POLICY IF EXISTS "Users can delete their own listings." ON public.sell_listings;
DROP POLICY IF EXISTS "Admins can update any listing." ON public.sell_listings;
DROP POLICY IF EXISTS "Admins can delete any listing." ON public.sell_listings;

-- 1. Public: View only active listings
CREATE POLICY "Public can view active marketplace listings"
  ON public.sell_listings FOR SELECT
  USING (status = 'active');

-- 2. Super admin: View all listings
CREATE POLICY "Super admin can view all listings"
  ON public.sell_listings FOR SELECT
  USING (public.is_super_admin());

-- 3. Staff admin: View all listings
CREATE POLICY "Staff admin can view all listings"
  ON public.sell_listings FOR SELECT
  USING (public.is_staff_admin());

-- 4. Store admin: View own store's listings
CREATE POLICY "Store admin can view own store listings"
  ON public.sell_listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = sell_listings.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- 5. User: View own user listings
CREATE POLICY "User can view own user listings"
  ON public.sell_listings FOR SELECT
  USING (user_id = auth.uid());

-- 6. Authenticated users can create listings (subject to RLS)
CREATE POLICY "Authenticated users can create listings"
  ON public.sell_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Either create as user listing
    (user_id = auth.uid() AND store_id IS NULL)
    OR
    -- Or create as store listing (must own store)
    (
      store_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.stores
        WHERE stores.id = sell_listings.store_id
        AND stores.owner_id = auth.uid()
        -- Check store can list products based on package
        AND store_can_enable_marketplace(stores.package_slug)
        AND stores.subscription_status = 'active'
      )
    )
  );

-- 7. Store admin can update own store listings
CREATE POLICY "Store admin can update own store listings"
  ON public.sell_listings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = sell_listings.store_id
      AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = sell_listings.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- 8. User can update own user listings
CREATE POLICY "User can update own user listings"
  ON public.sell_listings FOR UPDATE
  USING (user_id = auth.uid() AND store_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND store_id IS NULL);

-- 9. Store admin can delete own store listings
CREATE POLICY "Store admin can delete own store listings"
  ON public.sell_listings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = sell_listings.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- 10. User can delete own user listings
CREATE POLICY "User can delete own user listings"
  ON public.sell_listings FOR DELETE
  USING (user_id = auth.uid() AND store_id IS NULL);

-- 11. Admins can manage all listings (approve, reject, feature)
CREATE POLICY "Admins can manage all listings"
  ON public.sell_listings FOR ALL
  USING (public.is_super_admin() OR public.is_staff_admin())
  WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

-- ============================================================================
-- LISTING_INQUIRIES RLS POLICIES
-- ============================================================================

-- 1. Public: Anonymous can create inquiries
CREATE POLICY "Anyone can create listing inquiries"
  ON public.listing_inquiries FOR INSERT
  WITH CHECK (true);

-- 2. Users: Can view own inquiries
CREATE POLICY "Users can view own inquiries"
  ON public.listing_inquiries FOR SELECT
  USING (user_id = auth.uid());

-- 3. Listing owner (store or user): Can view inquiries for their listings
CREATE POLICY "Listing seller can view inquiries"
  ON public.listing_inquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sell_listings
      WHERE sell_listings.id = listing_inquiries.listing_id
      AND (
        -- Store owner can see inquiries
        (
          sell_listings.store_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = sell_listings.store_id
            AND stores.owner_id = auth.uid()
          )
        )
        OR
        -- User seller can see inquiries
        (sell_listings.user_id = auth.uid())
      )
    )
  );

-- 4. Admins can view all inquiries
CREATE POLICY "Admins can view all inquiries"
  ON public.listing_inquiries FOR SELECT
  USING (public.is_super_admin() OR public.is_staff_admin());

-- 5. Listing owner can update inquiry status
CREATE POLICY "Listing seller can update inquiry status"
  ON public.listing_inquiries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sell_listings
      WHERE sell_listings.id = listing_inquiries.listing_id
      AND (
        (
          sell_listings.store_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = sell_listings.store_id
            AND stores.owner_id = auth.uid()
          )
        )
        OR
        (sell_listings.user_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sell_listings
      WHERE sell_listings.id = listing_inquiries.listing_id
      AND (
        (
          sell_listings.store_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = sell_listings.store_id
            AND stores.owner_id = auth.uid()
          )
        )
        OR
        (sell_listings.user_id = auth.uid())
      )
    )
  );

-- 6. Admins can manage all inquiries
CREATE POLICY "Admins can manage all inquiries"
  ON public.listing_inquiries FOR ALL
  USING (public.is_super_admin() OR public.is_staff_admin())
  WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

-- ============================================================================
-- HELPER FUNCTIONS FOR MARKETPLACE
-- ============================================================================

-- Check if a store can list products (based on package)
CREATE OR REPLACE FUNCTION can_store_list_products(p_store_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id
    AND store_can_enable_marketplace(package_slug)
    AND subscription_status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Count active listings for a store
CREATE OR REPLACE FUNCTION count_store_active_listings(p_store_id uuid)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER FROM public.sell_listings
    WHERE store_id = p_store_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if listing count exceeds package limit
CREATE OR REPLACE FUNCTION exceeds_listing_limit(p_store_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  v_limit := (
    SELECT get_product_limit_by_package(stores.package_slug)
    FROM public.stores
    WHERE id = p_store_id
  );

  v_count := count_store_active_listings(p_store_id);

  RETURN v_count >= v_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get marketplace sorting priority for featured listings
CREATE OR REPLACE FUNCTION get_listing_sort_priority(
  p_is_featured boolean,
  p_store_id uuid
)
RETURNS INTEGER AS $$
DECLARE
  v_package text;
BEGIN
  -- Non-featured listings are priority 100+
  IF NOT p_is_featured THEN
    RETURN 100;
  END IF;

  -- Featured: Get store package
  SELECT package_slug INTO v_package
  FROM public.stores
  WHERE id = p_store_id;

  -- Featured Diamond stores: priority 1
  IF v_package = 'diamond' THEN
    RETURN 1;
  END IF;

  -- Featured Gold stores: priority 2
  IF v_package = 'gold' THEN
    RETURN 2;
  END IF;

  -- Other featured: priority 50
  RETURN 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION can_store_list_products(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION count_store_active_listings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION exceeds_listing_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listing_sort_priority(boolean, uuid) TO authenticated;
