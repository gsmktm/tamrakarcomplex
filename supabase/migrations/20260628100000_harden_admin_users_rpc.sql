-- Keep super-admin access consistent with the frontend: privileged user
-- listing is granted only through rows in public.user_roles.

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
#variable_conflict use_column
DECLARE
  caller_id uuid;
  is_super_admin boolean;
BEGIN
  caller_id := auth.uid();

  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur2
    WHERE ur2.user_id = caller_id
      AND ur2.role IN ('suadmin')
  ) INTO is_super_admin;

  IF NOT is_super_admin THEN
    RAISE EXCEPTION 'Access Denied: You must be a Super Admin to view users.';
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
    COALESCE(ur.role::text, 'user') AS role
  FROM auth.users au
  LEFT JOIN public.profiles p
    ON p.user_id = au.id
  LEFT JOIN LATERAL (
    SELECT user_roles.role
    FROM public.user_roles
    WHERE user_roles.user_id = au.id
    ORDER BY CASE user_roles.role
      WHEN 'suadmin' THEN 1
      WHEN 'staffadmin' THEN 2
      WHEN 'admin' THEN 3
      WHEN 'storeadmin' THEN 4
      WHEN 'store_owner' THEN 5
      WHEN 'storestaff' THEN 6
      WHEN 'user' THEN 7
      ELSE 8
    END
    LIMIT 1
  ) ur ON true
  ORDER BY au.created_at DESC;
END;
$$;
