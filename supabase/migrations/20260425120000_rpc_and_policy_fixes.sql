-- Migration: RPC Functions and Policy Consolidation
-- This migration adds missing RPC functions and ensures RLS policies are consistent

-- 1. RPC: get_catalog_verification_stats
CREATE OR REPLACE FUNCTION public.get_catalog_verification_stats()
RETURNS json AS $$
DECLARE
  v_total integer;
  v_verified integer;
  v_pending integer;
  v_brands integer;
  v_models integer;
BEGIN
  SELECT count(*) INTO v_total FROM public.catalog_products;
  SELECT count(*) INTO v_verified FROM public.catalog_products WHERE verified = true;
  SELECT count(*) INTO v_pending FROM public.catalog_products WHERE verified = false;
  SELECT count(*) INTO v_brands FROM public.brands;
  SELECT count(*) INTO v_models FROM public.device_models;

  RETURN json_build_object(
    'total_products', v_total,
    'verified_products', v_verified,
    'pending_verification', v_pending,
    'total_brands', v_brands,
    'total_models', v_models
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: find_duplicate_catalog_products
CREATE OR REPLACE FUNCTION public.find_duplicate_catalog_products()
RETURNS TABLE (
  name text,
  slug text,
  duplicate_count bigint,
  ids uuid[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.name, 
    cp.slug, 
    count(*), 
    array_agg(cp.id)
  FROM public.catalog_products cp
  GROUP BY cp.name, cp.slug
  HAVING count(*) > 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: merge_catalog_products
CREATE OR REPLACE FUNCTION public.merge_catalog_products(
  p_target_id uuid,
  p_source_ids uuid[]
) RETURNS boolean AS $$
BEGIN
  -- 1. Update inventory to point to target
  UPDATE public.store_inventory
  SET catalog_product_id = p_target_id
  WHERE catalog_product_id = ANY(p_source_ids);

  -- 2. Update order items
  UPDATE public.order_items
  SET catalog_product_id = p_target_id
  WHERE catalog_product_id = ANY(p_source_ids);

  -- 3. Update search events
  UPDATE public.device_search_events
  SET catalog_product_id = p_target_id
  WHERE catalog_product_id = ANY(p_source_ids);

  -- 4. Delete source products
  DELETE FROM public.catalog_products
  WHERE id = ANY(p_source_ids);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: update_device_popularity
CREATE OR REPLACE FUNCTION public.update_device_popularity(
  p_catalog_product_id uuid,
  p_increment_search boolean DEFAULT false,
  p_increment_click boolean DEFAULT false
) RETURNS void AS $$
BEGIN
  UPDATE public.catalog_products
  SET 
    search_count = search_count + (CASE WHEN p_increment_search THEN 1 ELSE 0 END),
    click_count = click_count + (CASE WHEN p_increment_click THEN 1 ELSE 0 END),
    popularity_score = (search_count * 0.3) + (click_count * 0.7),
    updated_at = now()
  WHERE id = p_catalog_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: convert_points_to_wallet
-- Assuming profiles table has points and wallet_balance columns
CREATE OR REPLACE FUNCTION public.convert_points_to_wallet(
  p_user_id uuid,
  p_points_to_convert integer
) RETURNS boolean AS $$
DECLARE
  v_current_points integer;
  v_conversion_rate decimal := 0.1; -- 10 points = 1 NPR
  v_amount_to_add decimal;
BEGIN
  SELECT points INTO v_current_points FROM public.profiles WHERE id = p_user_id;
  
  IF v_current_points < p_points_to_convert THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  v_amount_to_add := p_points_to_convert * v_conversion_rate;

  UPDATE public.profiles
  SET 
    points = points - p_points_to_convert,
    -- Assuming wallet_balance exists, if not this might fail but user mentioned it
    wallet_balance = COALESCE(wallet_balance, 0) + v_amount_to_add,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Consolidate and fix Policies (ensure DROP before CREATE)

-- orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Store admins can view store orders" ON public.orders;
DROP POLICY IF EXISTS "Staff and super admin can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Orders: Users manage own" ON public.orders;
DROP POLICY IF EXISTS "Orders: Admins manage all" ON public.orders;

CREATE POLICY "Orders: Users manage own" ON public.orders 
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Orders: Store admins view store orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.store_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.store_id = orders.store_id
    )
  );

CREATE POLICY "Orders: Admins manage all" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Order items: Users view own" ON public.order_items;
DROP POLICY IF EXISTS "Order items: Store admins view own" ON public.order_items;
DROP POLICY IF EXISTS "Order items: Admins manage all" ON public.order_items;

CREATE POLICY "Order items: Users view own" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Order items: Store admins view own" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.store_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.store_id = order_items.store_id
    )
  );

CREATE POLICY "Order items: Admins manage all" ON public.order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- device_search_events
ALTER TABLE public.device_search_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert search events" ON public.device_search_events;
DROP POLICY IF EXISTS "Admins read search events" ON public.device_search_events;

CREATE POLICY "Anyone can insert search events" ON public.device_search_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins read search events" ON public.device_search_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_catalog_verification_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_duplicate_catalog_products() TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_catalog_products(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_device_popularity(uuid, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_points_to_wallet(uuid, integer) TO authenticated;
