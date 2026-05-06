-- ==============================================================================
-- SETTINGS PERMISSIONS & HARDENING
-- Fixes "save settings" not working by ensuring all admin roles have full access.
-- ==============================================================================

-- 1. Ensure app_settings has robust RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.app_settings;
CREATE POLICY "Allow public read access"
  ON public.app_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow admin write access" ON public.app_settings;
DROP POLICY IF EXISTS "App Settings: Admins manage all" ON public.app_settings;
DROP POLICY IF EXISTS "Allow admin+suadmin write access" ON public.app_settings;
DROP POLICY IF EXISTS "Settings: Admins manage all" ON public.app_settings;

CREATE POLICY "Settings: Admins manage all"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Ensure console_settings has robust RLS
ALTER TABLE public.console_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Console Settings: Admins read all" ON public.console_settings;
CREATE POLICY "Console Settings: Admins read all"
  ON public.console_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Console Settings: Admins manage all" ON public.console_settings;
CREATE POLICY "Console Settings: Admins manage all"
  ON public.console_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Grant necessary permissions to authenticated role
GRANT ALL ON public.app_settings TO authenticated;
GRANT ALL ON public.console_settings TO authenticated;

-- 4. Ensure dev_ensure_confirmed_admin is accessible
GRANT EXECUTE ON FUNCTION public.dev_ensure_confirmed_admin(text) TO anon, authenticated;

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';
