-- Migration: Dev-only helper to ensure admin emails are confirmed.
-- Allows the UI to bypass the "Email not confirmed" blocker for system owners.

CREATE OR REPLACE FUNCTION public.dev_ensure_confirmed_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ONLY allow specific, blessed system emails
  IF lower(p_email) NOT IN (
    'suadmin@tamrakarcomplex.com', 
    'admin@tamrakarcomplex.com', 
    'store@tamrakarcomplex.com',
    'user@tamrakarcomplex.com',
    'bootstrap-admin@example.invalid', 
    'gsmktm@gmail.com',
    'superadmin@tamrakarcomplex.com'
  ) THEN
    RETURN false;
  END IF;

  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE lower(email) = lower(p_email);

  RETURN true;
END;
$$;

-- Also update bootstrap_admin to include the new blessed email
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

  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  -- Allow BOTH blessed emails to bypass the "exists" check
  IF NOT public.no_admin_exists() AND lower(v_user_email) NOT IN ('bootstrap-admin@example.invalid', 'admin@tamrakarcomplex.com') THEN
    RETURN false;
  END IF;

  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = auth.uid();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'suadmin'::public.app_role)
  ON CONFLICT (user_id, role) DO UPDATE SET role = 'suadmin'::public.app_role;

  RETURN true;
END;
$$;
