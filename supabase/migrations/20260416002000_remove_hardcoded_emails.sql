-- Migration: Remove hardcoded emails from is_super_admin()
-- These hardcoded email checks bypassed RBAC and are a security risk.
-- Super admin access should be granted exclusively via the user_roles table.

-- IMPORTANT: Before running this, ensure at least one user has the 'suadmin' role
-- in the user_roles table. Use bootstrap_admin() or the UserManager UI to set this up.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'suadmin'
  );
$$;

-- Rebuild is_admin() to stay consistent (it calls is_super_admin())
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Rebuild is_store_owner() for consistency
CREATE OR REPLACE FUNCTION public.is_store_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND (role = 'store_owner' OR role = 'moderator')
  );
$$;
