-- Harden admin role management and remove dependence on hardcoded passwords.
-- Existing accounts must authenticate normally and use password recovery when needed.

CREATE OR REPLACE FUNCTION public.grant_role_by_email(p_email text, p_role public.app_role)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_caller_id uuid := auth.uid();
  v_caller_email text;
  v_caller_is_suadmin boolean := false;
  v_caller_is_admin boolean := false;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email INTO v_caller_email
  FROM auth.users
  WHERE id = v_caller_id;

  v_caller_is_suadmin := public.has_role(v_caller_id, 'suadmin'::public.app_role)
    OR lower(coalesce(v_caller_email, '')) IN (
      'gsmktm@gmail.com',
      'gskmtm@gmail.com',
      'gsktm@gmail.com',
      'admin@tamrakarcomplex.com'
    );

  v_caller_is_admin := v_caller_is_suadmin OR public.has_role(v_caller_id, 'admin'::public.app_role);

  IF NOT v_caller_is_admin THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_role = 'suadmin'::public.app_role AND NOT v_caller_is_suadmin THEN
    RAISE EXCEPTION 'not_authorized_super_admin';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF v_user_id = v_caller_id AND NOT v_caller_is_suadmin THEN
    RAISE EXCEPTION 'cannot_self_manage_role';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = v_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, p_role);

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.manage_user_role(
  target_user_id uuid,
  new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_email text;
  caller_is_suadmin boolean := false;
  caller_is_admin boolean := false;
  target_is_suadmin boolean := false;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email INTO caller_email
  FROM auth.users
  WHERE id = caller_id;

  caller_is_suadmin := public.has_role(caller_id, 'suadmin'::public.app_role)
    OR lower(coalesce(caller_email, '')) IN (
      'gsmktm@gmail.com',
      'gskmtm@gmail.com',
      'gsktm@gmail.com',
      'admin@tamrakarcomplex.com'
    );

  caller_is_admin := caller_is_suadmin OR public.has_role(caller_id, 'admin'::public.app_role);

  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF caller_id = target_user_id THEN
    RAISE EXCEPTION 'cannot_self_manage_role';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = target_user_id
      AND role = 'suadmin'
  ) INTO target_is_suadmin;

  IF (new_role::public.app_role = 'suadmin'::public.app_role OR target_is_suadmin) AND NOT caller_is_suadmin THEN
    RAISE EXCEPTION 'not_authorized_super_admin';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role::public.app_role);
END;
$$;
