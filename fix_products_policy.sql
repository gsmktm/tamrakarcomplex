-- SQL to fix products RLS policy for suadmin
-- Run in Supabase SQL Editor

DROP POLICY IF EXISTS "Products: Admins manage all" ON public.products;

CREATE POLICY "Products: Admins manage all" ON public.products FOR ALL TO authenticated 
USING (public.is_super_admin() OR public.is_staff_admin()) 
WITH CHECK (public.is_super_admin() OR public.is_staff_admin());