
-- Migration: Update bootstrap_admin to allow standard admin emails to always claim roles.
-- This fixes the "Access Denied" issue for gsmktm@gmail.com even if other admins exist.

CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_is_standard_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Get current user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Check if this is a standard admin email
  v_is_standard_admin := lower(v_user_email) IN (
    'gsmktm@gmail.com',
    'gskmtm@gmail.com',
    'gsktm@gmail.com',
    'admin@tamrakarcomplex.com'
  );

  -- Allow bootstrapping if no admin exists OR if the user is a standard admin email
  IF NOT public.no_admin_exists() AND NOT v_is_standard_admin THEN
    RETURN false;
  END IF;

  -- Insert the role (suadmin for standard emails, admin for others)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    auth.uid(), 
    CASE WHEN v_is_standard_admin THEN 'suadmin'::public.app_role ELSE 'admin'::public.app_role END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;
