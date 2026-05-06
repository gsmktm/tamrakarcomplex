-- Store Package Control RLS Policies & Functions
-- This ensures feature access is enforced at the database level

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Ensure store_permissions table exists as it's used in policies below
CREATE TABLE IF NOT EXISTS public.store_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    permission text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(store_id, user_id, permission)
);

ALTER TABLE public.store_permissions ENABLE ROW LEVEL SECURITY;

-- store_permissions policies
DROP POLICY IF EXISTS "Users view own store permissions" ON public.store_permissions;
CREATE POLICY "Users view own store permissions" ON public.store_permissions
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Superadmin manages all store permissions" ON public.store_permissions;
CREATE POLICY "Superadmin manages all store permissions" ON public.store_permissions
    FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Staffadmin manages store permissions" ON public.store_permissions;
CREATE POLICY "Staffadmin manages store permissions" ON public.store_permissions
    FOR ALL USING (public.is_staff_admin());

-- Function to check if a store can list products based on package
CREATE OR REPLACE FUNCTION store_can_list_products(p_package_slug text)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_package_slug IN ('silver', 'gold', 'diamond');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get product limit by package
CREATE OR REPLACE FUNCTION get_product_limit_by_package(p_package_slug text)
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

-- Function to check if store can list repair services
CREATE OR REPLACE FUNCTION store_can_list_services(p_package_slug text)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_package_slug IN ('silver', 'gold', 'diamond');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get service limit by package
CREATE OR REPLACE FUNCTION get_service_limit_by_package(p_package_slug text)
RETURNS INTEGER AS $$
BEGIN
  CASE p_package_slug
    WHEN 'diamond' THEN RETURN 1000;
    WHEN 'gold' THEN RETURN 20;
    WHEN 'silver' THEN RETURN 5;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if contact info should be visible
CREATE OR REPLACE FUNCTION can_show_contact_public(p_package_slug text)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_package_slug IN ('gold', 'diamond');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if store has active subscription
CREATE OR REPLACE FUNCTION store_has_active_subscription(
  p_subscription_status text,
  p_subscription_end_date timestamptz
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_subscription_status != 'active' THEN
    RETURN FALSE;
  END IF;
  
  IF p_subscription_end_date IS NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN p_subscription_end_date > NOW();
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check featured store priority
CREATE OR REPLACE FUNCTION get_featured_priority(p_package_slug text)
RETURNS INTEGER AS $$
BEGIN
  CASE p_package_slug
    WHEN 'diamond' THEN RETURN 1;
    WHEN 'gold' THEN RETURN 2;
    WHEN 'silver' THEN RETURN 3;
    ELSE RETURN 4;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if store can enable marketplace
CREATE OR REPLACE FUNCTION store_can_enable_marketplace(p_package_slug text)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_package_slug IN ('silver', 'gold', 'diamond');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if store can manage branches
CREATE OR REPLACE FUNCTION store_can_manage_branches(p_package_slug text)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_package_slug IN ('gold', 'diamond');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- UPDATED RLS POLICIES FOR STORES TABLE
-- ============================================================================

-- Drop existing generic policies
DROP POLICY IF EXISTS "Active stores are viewable by everyone" ON public.stores;
DROP POLICY IF EXISTS "Owners can view their own store" ON public.stores;
DROP POLICY IF EXISTS "Admins can manage stores." ON public.stores;

-- Public viewing policy: Only active subscriptions are publicly visible
CREATE POLICY "Public can view stores with active subscriptions"
  ON public.stores FOR SELECT
  USING (
    subscription_status = 'active' 
    AND store_has_active_subscription(subscription_status, subscription_end_date)
  );

-- Store owners can view their own store regardless of status
CREATE POLICY "Store owners can view their own store"
  ON public.stores FOR SELECT
  USING (owner_id = auth.uid());

-- Store owners can update their own store
CREATE POLICY "Store owners can update their own store"
  ON public.stores FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Admins can view all stores
CREATE POLICY "Admins can view all stores"
  ON public.stores FOR SELECT
  USING (public.is_staff_admin());

-- Super admins can manage all stores (including package overrides)
CREATE POLICY "Super admins can manage stores"
  ON public.stores FOR ALL
  USING (public.is_super_admin());

-- Staff admins can update store fields if they have permission
CREATE POLICY "Staff admins can update store details with permission"
  ON public.stores FOR UPDATE
  USING (
    public.is_staff_admin()
    AND (
      -- Check if user has permission to manage this store
      SELECT COUNT(*) > 0 FROM public.store_permissions 
      WHERE store_id = stores.id 
      AND user_id = auth.uid()
      AND permission IN ('manage', 'update')
    )
  )
  WITH CHECK (
    public.is_staff_admin()
    AND (
      SELECT COUNT(*) > 0 FROM public.store_permissions 
      WHERE store_id = stores.id 
      AND user_id = auth.uid()
      AND permission IN ('manage', 'update')
    )
  );

-- ============================================================================
-- PRODUCT TABLE RLS (enforce package limits)
-- ============================================================================

-- Prevent non-allowed packages from inserting products
CREATE POLICY "Only allowed packages can list products"
  ON public.products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_id
      AND store_can_list_products(stores.package_slug)
      AND stores.subscription_status = 'active'
    )
  );

-- Prevent exceeding product limit
CREATE POLICY "Cannot exceed product limit for package"
  ON public.products FOR INSERT
  WITH CHECK (
    (
      SELECT COUNT(*) FROM public.products 
      WHERE store_id = products.store_id
    ) < (
      SELECT get_product_limit_by_package(stores.package_slug)
      FROM public.stores
      WHERE stores.id = products.store_id
    )
  );

-- ============================================================================
-- REPAIR SERVICE TABLE RLS (enforce package limits)
-- ============================================================================

-- Prevent non-allowed packages from listing services.
-- repair_services is introduced by a later module migration, so guard this
-- policy block to keep auth/role stabilization migrations reachable.
DO $$
BEGIN
  IF to_regclass('public.repair_services') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Only allowed packages can list services" ON public.repair_services;
    CREATE POLICY "Only allowed packages can list services"
      ON public.repair_services FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.stores
          WHERE stores.id = store_id
          AND store_can_list_services(stores.package_slug)
          AND stores.subscription_status = 'active'
        )
      );

    DROP POLICY IF EXISTS "Cannot exceed service limit for package" ON public.repair_services;
    CREATE POLICY "Cannot exceed service limit for package"
      ON public.repair_services FOR INSERT
      WITH CHECK (
        (
          SELECT COUNT(*) FROM public.repair_services
          WHERE store_id = repair_services.store_id
        ) < (
          SELECT get_service_limit_by_package(stores.package_slug)
          FROM public.stores
          WHERE stores.id = repair_services.store_id
        )
      );
  END IF;
END $$;

-- ============================================================================
-- MARKETPLACE TABLE RLS (enforce marketplace enablement)
-- ============================================================================

-- Only allow marketplace listings for enabled stores.
-- sell_listings is used for marketplace
DO $$
BEGIN
  IF to_regclass('public.sell_listings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Only marketplace-enabled stores can list products" ON public.sell_listings;
    CREATE POLICY "Only marketplace-enabled stores can list products"
      ON public.sell_listings FOR INSERT
      WITH CHECK (
        (store_id IS NULL) OR 
        EXISTS (
          SELECT 1 FROM public.stores
          WHERE stores.id = store_id
          AND store_can_enable_marketplace(stores.package_slug)
          AND stores.is_marketplace_enabled = true
          AND stores.subscription_status = 'active'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- STORE STAFF TABLE RLS (enforce admin limits)
-- ============================================================================

-- Function to check admin user limit
CREATE OR REPLACE FUNCTION get_admin_limit_by_package(p_package_slug text)
RETURNS INTEGER AS $$
BEGIN
  CASE p_package_slug
    WHEN 'diamond' THEN RETURN 20;
    WHEN 'gold' THEN RETURN 5;
    WHEN 'silver' THEN RETURN 2;
    ELSE RETURN 1;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Prevent exceeding admin limit.
-- store_staff may not exist in deployments that use store_admins/store_permissions.
DO $$
BEGIN
  IF to_regclass('public.store_staff') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Cannot exceed admin user limit for package" ON public.store_staff;
    CREATE POLICY "Cannot exceed admin user limit for package"
      ON public.store_staff FOR INSERT
      WITH CHECK (
        (
          SELECT COUNT(*) FROM public.store_staff
          WHERE store_id = store_staff.store_id
          AND role IN ('admin', 'manager')
        ) < (
          SELECT get_admin_limit_by_package(stores.package_slug)
          FROM public.stores
          WHERE stores.id = store_staff.store_id
        )
      );
  END IF;
END $$;

-- ============================================================================
-- STORE BRANCHES TABLE RLS (enforce branch limits)
-- ============================================================================

-- Function to check branch limit
CREATE OR REPLACE FUNCTION get_branch_limit_by_package(p_package_slug text)
RETURNS INTEGER AS $$
BEGIN
  CASE p_package_slug
    WHEN 'diamond' THEN RETURN 10;
    WHEN 'gold' THEN RETURN 3;
    ELSE RETURN 1;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Prevent exceeding branch limit.
-- store_branches is not part of the base schema in all environments.
DO $$
BEGIN
  IF to_regclass('public.store_branches') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Cannot exceed branch limit for package" ON public.store_branches;
    CREATE POLICY "Cannot exceed branch limit for package"
      ON public.store_branches FOR INSERT
      WITH CHECK (
        (
          SELECT COUNT(*) FROM public.store_branches
          WHERE store_id = store_branches.store_id
        ) < (
          SELECT get_branch_limit_by_package(stores.package_slug)
          FROM public.stores
          WHERE stores.id = store_branches.store_id
        )
      );
  END IF;
END $$;

-- ============================================================================
-- AUDIT TABLE FOR POLICY VIOLATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.policy_violation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  violation_type text NOT NULL,
  store_id uuid,
  user_id uuid,
  table_name text,
  attempted_action text,
  package_slug text,
  violation_details jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.policy_violation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view policy violation logs"
  ON public.policy_violation_logs FOR SELECT
  USING (public.is_staff_admin());

-- ============================================================================
-- GRANT FUNCTION PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION store_can_list_products(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_limit_by_package(text) TO authenticated;
GRANT EXECUTE ON FUNCTION store_can_list_services(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_service_limit_by_package(text) TO authenticated;
GRANT EXECUTE ON FUNCTION can_show_contact_public(text) TO authenticated;
GRANT EXECUTE ON FUNCTION store_has_active_subscription(text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_featured_priority(text) TO authenticated;
GRANT EXECUTE ON FUNCTION store_can_enable_marketplace(text) TO authenticated;
GRANT EXECUTE ON FUNCTION store_can_manage_branches(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_limit_by_package(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_branch_limit_by_package(text) TO authenticated;
