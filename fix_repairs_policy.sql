-- SQL to fix repair_requests RLS policy for suadmin
-- Run in Supabase SQL Editor

DROP POLICY IF EXISTS "Admins and Store Owners manage repair requests" ON public.repair_requests;

CREATE POLICY "Admins and Store Owners manage repair requests"
ON public.repair_requests
FOR ALL
TO authenticated
USING (
    public.is_super_admin() OR public.is_staff_admin() OR
    (public.is_store_owner() AND assigned_store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
);