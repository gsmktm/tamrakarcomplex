-- Fix stores RLS policy for suadmin editing
-- Run in Supabase SQL Editor

DROP POLICY IF EXISTS "Stores: Admins manage all" ON public.stores;

CREATE POLICY "Stores: Admins manage all" ON public.stores FOR ALL TO authenticated 
USING (public.is_super_admin() OR public.is_staff_admin()) 
WITH CHECK (public.is_super_admin() OR public.is_staff_admin());