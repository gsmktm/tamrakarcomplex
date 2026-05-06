-- Update grant_role_by_email to allow hardcoded super admins to bootstrap themselves
-- This is critical for the first login of super admins who don't have the role in DB yet

CREATE OR REPLACE FUNCTION public.grant_role_by_email(p_email text, p_role public.app_role)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_caller_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();

  -- Allow if caller is admin OR if caller is in the hardcoded super admin list
  -- This allows the owners to promote themselves or others even if they don't have the 'admin' role in DB yet
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) 
     AND NOT public.has_role(auth.uid(), 'suadmin'::public.app_role)
     AND NOT (lower(v_caller_email) IN ('gsmktm@gmail.com', 'gskmtm@gmail.com', 'gsktm@gmail.com', 'admin@tamrakarcomplex.com')) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (v_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_user_id;
END;
$$;
