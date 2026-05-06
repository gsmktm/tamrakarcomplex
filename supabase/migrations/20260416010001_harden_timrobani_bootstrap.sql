-- Migration: Harden bootstrap_admin for system owner.
-- Allows bootstrap-admin@example.invalid to claim suadmin role even if others exist.
-- Also ensures email confirmation is granted upon claiming.

CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Get current user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  -- 1. Check if we can bootstrap:
  --    - Either NO admins exist
  --    - OR the current user is bootstrap-admin@example.invalid (emergency bypass)
  IF NOT public.no_admin_exists() AND lower(v_user_email) != 'bootstrap-admin@example.invalid' THEN
    RETURN false;
  END IF;

  -- 2. Confirm the user's email if it's not already
  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = auth.uid();

  -- 3. Grant the suadmin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'suadmin'::public.app_role)
  ON CONFLICT (user_id, role) DO UPDATE SET role = 'suadmin'::public.app_role;

  RETURN true;
END;
$$;
