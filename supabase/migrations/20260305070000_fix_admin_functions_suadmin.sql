-- Update secure user list function to support suadmin role and bootstrapping emails
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
DECLARE
  caller_id uuid;
  caller_email text;
  is_super_admin boolean;
BEGIN
  caller_id := auth.uid();

  -- 1. Check if caller is authenticated
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Not authenticated';
  END IF;

  -- Get caller email for bootstrapping check
  SELECT au.email INTO caller_email FROM auth.users au WHERE au.id = caller_id;

  -- 2. Check if caller is a Super Admin (admin OR suadmin) OR is in the hardcoded list
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = caller_id
    AND role IN ('admin', 'suadmin')
  ) OR (
    lower(caller_email) IN ('gsmktm@gmail.com', 'gskmtm@gmail.com', 'gsktm@gmail.com', 'admin@tamrakarcomplex.com')
  ) INTO is_super_admin;

  IF NOT is_super_admin THEN
    RAISE EXCEPTION 'Access Denied: You must be a Super Admin to view users.';
  END IF;

  -- 3. Return the user list
  RETURN QUERY
  SELECT 
    au.id,
    au.email::varchar,
    COALESCE(p.display_name, 'Unknown') AS full_name,
    p.avatar_url,
    COALESCE(ur.role::text, 'user') AS role
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  ORDER BY au.created_at DESC;
END;
$$;

-- Update role management function to support suadmin role and bootstrapping emails
CREATE OR REPLACE FUNCTION public.manage_user_role(
  target_user_id uuid,
  new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  caller_email text;
  is_admin boolean;
BEGIN
  caller_id := auth.uid();
  
  -- Get caller email
  SELECT au.email INTO caller_email FROM auth.users au WHERE au.id = caller_id;

  -- Check if the current user is an admin (admin OR suadmin) OR is in the hardcoded list
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = caller_id
    AND role IN ('admin', 'suadmin')
  ) OR (
    lower(caller_email) IN ('gsmktm@gmail.com', 'gskmtm@gmail.com', 'gsktm@gmail.com', 'admin@tamrakarcomplex.com')
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied: Only admins can manage roles';
  END IF;

  -- Delete existing roles for the user
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Insert new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role::public.app_role);
END;
$$;
