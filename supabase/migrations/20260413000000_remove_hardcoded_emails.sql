-- Migration: Remove hardcoded super admin email list from all DB functions.
-- Admin status is now determined solely by a row in user_roles with role = 'suadmin'.
-- This migration first bootstraps any missing suadmin rows from the legacy email list,
-- then rewrites the functions to use the user_roles table only.

-- Step 1: Bootstrap suadmin rows for the historical accounts (idempotent).
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'suadmin'::public.app_role
FROM auth.users
WHERE lower(email) IN (
  'gsmktm@gmail.com',
  'gskmtm@gmail.com',
  'gsktm@gmail.com',
  'admin@tamrakarcomplex.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 2: Rewrite has_role() — pure DB lookup, no email fallback.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Step 3: Rewrite is_super_admin() — delegates to has_role, no email check.
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'suadmin'::public.app_role);
$$;

-- Step 4: Rewrite grant_role_by_email — caller must be suadmin in user_roles.
-- Preserve the existing UUID return contract from the February and March
-- migrations. PostgreSQL CREATE OR REPLACE cannot change a function's return
-- type; authorization is strengthened without breaking RPC callers.
CREATE OR REPLACE FUNCTION public.grant_role_by_email(
  p_email text,
  p_role public.app_role
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id   uuid := auth.uid();
  target_id   uuid;
BEGIN
  -- Caller must be a suadmin (DB-based check only)
  IF NOT public.has_role(caller_id, 'suadmin'::public.app_role) THEN
    RAISE EXCEPTION 'Permission denied: caller is not a super admin';
  END IF;

  SELECT id INTO target_id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', p_email;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN target_id;
END;
$$;

-- Step 5: Rewrite manage_user_role — caller must be suadmin in user_roles.
CREATE OR REPLACE FUNCTION public.manage_user_role(
  target_user_id uuid,
  new_role public.app_role,
  action text DEFAULT 'grant'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  -- Caller must be a suadmin (DB-based check only)
  IF NOT public.has_role(caller_id, 'suadmin'::public.app_role) THEN
    RAISE EXCEPTION 'Permission denied: caller is not a super admin';
  END IF;

  IF action = 'grant' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, new_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF action = 'revoke' THEN
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id AND role = new_role;
  ELSE
    RAISE EXCEPTION 'Invalid action: %. Use ''grant'' or ''revoke''.', action;
  END IF;

  RETURN true;
END;
$$;
