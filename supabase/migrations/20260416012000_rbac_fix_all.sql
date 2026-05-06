-- Migration: Master RBAC Hardening
-- Consolidates is_super_admin, is_admin, and is_store_owner
-- Adds get_my_role for streamlined frontend role resolution

-- Ensure public_user exists in enum if it was missed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'public_user') THEN
        ALTER TYPE public.app_role ADD VALUE 'public_user';
    END IF;
END $$;

-- 1. Unified function to check Super Admin status
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
    ) OR (
        lower(auth.jwt() ->> 'email') IN (
          'suadmin@tamrakarcomplex.com',
          'admin@tamrakarcomplex.com', 
          'bootstrap-admin@example.invalid', 
          'gsmktm@gmail.com', 
          'gskmtm@gmail.com', 
          'gsktm@gmail.com', 
          'superadmin@tamrakarcomplex.com'
        )
    );
$$;

-- 2. Unified function to check Admin status
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
        AND role = 'admin'
    ) OR (
        lower(auth.jwt() ->> 'email') IN ('admin@tamrakarcomplex.com', 'suadmin@tamrakarcomplex.com')
    );
$$;

-- 3. Unified function to check Store Owner status
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
        AND (role = 'store_owner' OR role = 'moderator')
    ) OR (
        lower(auth.jwt() ->> 'email') IN ('store@tamrakarcomplex.com')
    );
$$;

-- 4. NEW: Unified function to get primary role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_role public.app_role;
BEGIN
    -- Check Super Admin first
    IF public.is_super_admin() THEN
        RETURN 'suadmin'::public.app_role;
    END IF;

    -- Then regular Admin
    IF public.is_admin() THEN
        RETURN 'admin'::public.app_role;
    END IF;

    -- Then Store Owner
    IF public.is_store_owner() THEN
        RETURN 'store_owner'::public.app_role;
    END IF;

    -- Default to user_roles table or public_user
    SELECT role INTO v_role 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    LIMIT 1;

    RETURN COALESCE(v_role, 'public_user'::public.app_role);
END;
$$;
