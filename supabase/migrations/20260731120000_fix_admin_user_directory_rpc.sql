-- Restore the admin user directory against the current profiles/user_roles schema.
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
STABLE
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: authentication required';
  END IF;

  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: super-admin permission required';
  END IF;

  RETURN QUERY
  SELECT
    auth_user.id,
    auth_user.email::varchar,
    COALESCE(
      profile.display_name,
      auth_user.raw_user_meta_data->>'full_name',
      auth_user.raw_user_meta_data->>'name',
      split_part(COALESCE(auth_user.email, 'Unknown'), '@', 1)
    )::text AS full_name,
    profile.avatar_url,
    COALESCE(highest_role.role::text, 'user') AS role
  FROM auth.users AS auth_user
  LEFT JOIN LATERAL (
    SELECT p.display_name, p.avatar_url
    FROM public.profiles AS p
    WHERE p.user_id = auth_user.id
    ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
    LIMIT 1
  ) AS profile ON true
  LEFT JOIN LATERAL (
    SELECT ur.role
    FROM public.user_roles AS ur
    WHERE ur.user_id = auth_user.id
    ORDER BY CASE ur.role::text
      WHEN 'suadmin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'staffadmin' THEN 3
      WHEN 'storeadmin' THEN 4
      WHEN 'store_owner' THEN 5
      WHEN 'storestaff' THEN 6
      WHEN 'user' THEN 7
      ELSE 8
    END
    LIMIT 1
  ) AS highest_role ON true
  ORDER BY auth_user.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users_list_secure() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_users_list_secure() TO authenticated;
