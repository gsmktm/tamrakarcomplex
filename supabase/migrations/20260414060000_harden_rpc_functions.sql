
-- 1. Harden and fix get_admin_users_list_secure
CREATE OR REPLACE FUNCTION public.get_admin_users_list_secure()
RETURNS TABLE (
  id uuid,
  email varchar,
  full_name text,
  avatar_url text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: You must be an Admin to view users.';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.email::varchar,
    COALESCE(
      p.display_name,
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      split_part(COALESCE(au.email, 'Unknown'), '@', 1)
    ) AS full_name,
    p.avatar_url,
    COALESCE(ur.role::text, 'public_user') AS role
  FROM auth.users au
  LEFT JOIN public.profiles p
    ON p.user_id = au.id
  LEFT JOIN LATERAL (
    SELECT user_roles.role
    FROM public.user_roles
    WHERE user_roles.user_id = au.id
    ORDER BY CASE user_roles.role
      WHEN 'suadmin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'store_owner' THEN 3
      WHEN 'moderator' THEN 4
      WHEN 'public_user' THEN 5
      WHEN 'user' THEN 6
      ELSE 7
    END
    LIMIT 1
  ) ur ON true
  ORDER BY au.created_at DESC;
END;
$$;

-- 2. Harden and fix grant_role_by_email
CREATE OR REPLACE FUNCTION public.grant_role_by_email(p_email text, p_role public.app_role)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_role = 'suadmin'::public.app_role AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not_authorized_super_admin';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF v_user_id = auth.uid() AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'cannot_self_manage_role';
  END IF;

  -- Remove existing roles first
  DELETE FROM public.user_roles
  WHERE user_id = v_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, p_role);

  RETURN v_user_id;
END;
$$;

-- 3. Harden and fix manage_user_role (adding action parameter)
CREATE OR REPLACE FUNCTION public.manage_user_role(
  target_user_id uuid,
  new_role text,
  action text DEFAULT 'update'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_is_suadmin boolean := false;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'cannot_self_manage_role';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = target_user_id
      AND role = 'suadmin'
  ) INTO target_is_suadmin;

  -- Only super admins can manage other super admins or grant super admin role
  IF (new_role::public.app_role = 'suadmin'::public.app_role OR target_is_suadmin) AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not_authorized_super_admin';
  END IF;

  IF action = 'delete' THEN
    -- In Supabase, deleting from auth.users requires service_role or specific setup.
    -- For safety, we just remove all roles, which makes them a public_user.
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, new_role::public.app_role);
  END IF;
END;
$$;
