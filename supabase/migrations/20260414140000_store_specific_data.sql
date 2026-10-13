
-- Add store_id to products and orders to support store-specific management
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;

-- Update RLS for products
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Products: Viewable by everyone" ON public.products;
CREATE POLICY "Products: Viewable by everyone" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products: Admins manage all" ON public.products;
CREATE POLICY "Products: Admins manage all" ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Products: Super admins manage all" ON public.products;
CREATE POLICY "Products: Super admins manage all" ON public.products FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Products: Store owners manage own" ON public.products;
CREATE POLICY "Products: Store owners manage own" ON public.products FOR ALL TO authenticated 
  USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- Update RLS for orders
DROP POLICY IF EXISTS "Orders: Users manage own" ON public.orders;
CREATE POLICY "Orders: Users manage own" ON public.orders FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Orders: Admins manage all" ON public.orders;
CREATE POLICY "Orders: Admins manage all" ON public.orders FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Orders: Super admins manage all" ON public.orders;
CREATE POLICY "Orders: Super admins manage all" ON public.orders FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Orders: Store owners view own" ON public.orders;
CREATE POLICY "Orders: Store owners view own" ON public.orders FOR SELECT TO authenticated 
  USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- Also ensure store owners can update order status for their store
DROP POLICY IF EXISTS "Orders: Store owners update own status" ON public.orders;
CREATE POLICY "Orders: Store owners update own status" ON public.orders FOR UPDATE TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
