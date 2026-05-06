-- Allow suadmin and staffadmin to manage app_settings

DROP POLICY IF EXISTS "Allow admin write access" ON public.app_settings;
DROP POLICY IF EXISTS "App Settings: Admins manage all" ON public.app_settings;
DROP POLICY IF EXISTS "Allow admin+suadmin write access" ON public.app_settings;

CREATE POLICY "Allow suadmin+staffadmin write access"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.is_super_admin() OR public.is_staff_admin())
  WITH CHECK (public.is_super_admin() OR public.is_staff_admin());
