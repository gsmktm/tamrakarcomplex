-- Supabase Advisor hardening:
-- 1. Ensure store_packages always has RLS enabled after later repair migrations.
-- 2. Make public read views run with caller permissions instead of owner privileges.
-- 3. Add focused indexes for public catalog/marketplace view traffic.

CREATE OR REPLACE FUNCTION public.has_role(target_user_id uuid, target_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF target_user_id IS NULL OR to_regclass('public.user_roles') IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = target_user_id
      AND ur.role::text = target_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'suadmin') OR public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin');
$$;

ALTER TABLE public.store_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_packages_public_read ON public.store_packages;
DROP POLICY IF EXISTS store_os_packages_read ON public.store_packages;
DROP POLICY IF EXISTS "Packages are viewable by everyone" ON public.store_packages;
CREATE POLICY store_packages_public_read
  ON public.store_packages
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS store_packages_admin_manage ON public.store_packages;
DROP POLICY IF EXISTS store_os_packages_super_admin ON public.store_packages;
CREATE POLICY store_packages_admin_manage
  ON public.store_packages
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

GRANT SELECT ON public.store_packages TO anon, authenticated;

-- SECURITY DEFINER views can bypass the caller's RLS context. These public
-- browse views should respect the permissions of anon/authenticated callers.
ALTER VIEW IF EXISTS public.public_marketplace_items SET (security_invoker = on);
ALTER VIEW IF EXISTS public.mobile_catalog_view SET (security_invoker = on);

GRANT SELECT ON public.public_marketplace_items TO anon, authenticated;
GRANT SELECT ON public.mobile_catalog_view TO anon, authenticated;

-- Marketplace view filters active inventory and active user listings, then
-- sorts/segments by store tier and recency.
CREATE INDEX IF NOT EXISTS idx_store_products_active_marketplace
  ON public.store_products (store_id, created_at DESC)
  WHERE status = 'active' AND COALESCE(stock_quantity, stock, 0) > 0;

CREATE INDEX IF NOT EXISTS idx_sell_listings_active_marketplace
  ON public.sell_listings (store_id, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_stores_public_marketplace_tier
  ON public.stores (id, package_slug, is_featured, is_verified)
  WHERE COALESCE(public_status, 'published') = 'published'
    AND COALESCE(status, 'active') = 'active';

-- Mobile catalog view uses model_id lookups for price, exchange, repair,
-- unlocking, and specs summaries.
CREATE INDEX IF NOT EXISTS idx_store_products_active_model_price
  ON public.store_products (model_id, discount_price, price_sale, price)
  WHERE status = 'active' AND COALESCE(stock_quantity, stock, 0) > 0;

CREATE INDEX IF NOT EXISTS idx_exchange_values_model_value
  ON public.exchange_values (model_id, max_value DESC);

CREATE INDEX IF NOT EXISTS idx_repair_services_model_lookup
  ON public.repair_services (model_id);

CREATE INDEX IF NOT EXISTS idx_unlocking_services_model_lookup
  ON public.unlocking_services (model_id);

CREATE INDEX IF NOT EXISTS idx_phone_specs_model_lookup
  ON public.phone_specs (model_id);

NOTIFY pgrst, 'reload schema';
