-- Migration: Update bootstrap_admin to also confirm the user's email.
-- This ensures that a new Super Admin can actually log in without 
-- needing a real email confirmation loop in dev/test environments.

CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- 1. Check if we can bootstrap (no admin exists)
  IF NOT public.no_admin_exists() THEN
    RETURN false;
  END IF;

  -- 2. Confirm the user's email in the auth schema
  -- This requires SECURITY DEFINER and is safe in this context.
  UPDATE auth.users 
  SET email_confirmed_at = now(),
      updated_at = now()
  WHERE id = auth.uid();

  -- 3. Grant the suadmin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'suadmin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;
