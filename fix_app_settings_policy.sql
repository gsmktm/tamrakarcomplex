-- Ensure app_settings policy allows suadmin to save package overrides
-- Run in Supabase SQL Editor

DROP POLICY IF EXISTS "Allow suadmin+staffadmin write access" ON public.app_settings;

CREATE POLICY "Allow suadmin+staffadmin write access"
ON public.app_settings FOR ALL
TO authenticated
USING (public.is_super_admin() OR public.is_staff_admin())
WITH CHECK (public.is_super_admin() OR public.is_staff_admin());