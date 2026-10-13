-- ==============================================================================
-- ADMIN AUTHENTICATION & SECURITY HARDENING - FIXED
-- Fixes suadmin@tamrakarcomplex.com login and email confirmation issues.
-- Ensures all admin emails are confirmed and have correct roles.
-- ==============================================================================

-- 1. Ensure pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create helper to find first available instance_id
CREATE OR REPLACE FUNCTION public.get_auth_instance_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
$$;

-- 2.1. Update no_admin_exists to be more accurate
CREATE OR REPLACE FUNCTION public.no_admin_exists()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE role IN ('suadmin', 'staffadmin')
  );
END;
$$;

-- 2.2. Unified role checking functions (Hardened)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'suadmin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'staffadmin'
    );
$$;

-- 2.3. Harden and fix get_admin_users_list_secure
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
SET search_path = public, auth
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
      WHEN 'staffadmin' THEN 2
      WHEN 'storeadmin' THEN 3
      WHEN 'storestaff' THEN 4
      WHEN 'user' THEN 5
      ELSE 6
    END
    LIMIT 1
  ) ur ON true
  ORDER BY au.created_at DESC;
END;
$$;

-- Grant permissions for secure functions
GRANT EXECUTE ON FUNCTION public.get_admin_users_list_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_store_owner() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.is_store_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT public.is_admin() OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'storeadmin'
    );
$$;

-- 3. Remove dev_ensure_confirmed_admin (dev-only function with hardcoded emails)
-- This function is no longer needed. Use proper role assignment via user_roles table instead.
DROP FUNCTION IF EXISTS public.dev_ensure_confirmed_admin(text);

-- 4. The former block reset a list of named Auth accounts to a known
-- password, bypassed email verification and reassigned super-admin roles.
-- Bootstrap must remain disabled, and all Auth account provisioning must
-- happen through the separately authorized Supabase Auth Admin API.
-- No auth.users/auth.identities DML or role seeding is permitted here.

-- 5. Security Hardening: Ensure RLS for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Suadmins can manage all roles" ON public.user_roles;
CREATE POLICY "Suadmins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());


