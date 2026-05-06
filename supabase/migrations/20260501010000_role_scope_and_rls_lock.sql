-- Lock role scope and tighten key RLS paths.
-- This migration is idempotent and safe to re-run.

-- 1) Normalize roles in user_roles to allowed scope only.
UPDATE public.user_roles
SET role = 'suadmin'
WHERE role IN ('admin', 'superadmin', 'super_admin');

UPDATE public.user_roles
SET role = 'staffadmin'
WHERE role IN ('staff_admin', 'staff', 'moderator');

UPDATE public.user_roles
SET role = 'storeadmin'
WHERE role IN ('store_admin', 'merchantadmin', 'merchant_admin');

UPDATE public.user_roles
SET role = 'storestaff'
WHERE role IN ('store_staff', 'merchant_staff');

UPDATE public.user_roles
SET role = 'user'
WHERE role IS NULL
   OR role NOT IN ('suadmin', 'staffadmin', 'storeadmin', 'storestaff', 'user');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
      AND column_name = 'role'
  ) THEN
    BEGIN
      ALTER TABLE public.user_roles
        DROP CONSTRAINT IF EXISTS user_roles_role_check;
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END;

    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_role_check
      CHECK (role IN ('suadmin', 'staffadmin', 'storeadmin', 'storestaff', 'user'));
  END IF;
END $$;

-- 2) Helper function refresh (explicit allowed role only).
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ur.role
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('suadmin', 'staffadmin', 'storeadmin', 'storestaff', 'user')
      ORDER BY ur.created_at DESC NULLS LAST
      LIMIT 1
    ),
    'user'
  );
$$;

-- 3) Staff permissions table RLS (staffadmin own read, suadmin full write).
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_permissions_select_own_or_admin ON public.staff_permissions;
CREATE POLICY staff_permissions_select_own_or_admin
ON public.staff_permissions
FOR SELECT
USING (
  public.is_super_admin()
  OR public.is_staff_admin()
  OR staff_user_id = auth.uid()
);

DROP POLICY IF EXISTS staff_permissions_write_suadmin_only ON public.staff_permissions;
CREATE POLICY staff_permissions_write_suadmin_only
ON public.staff_permissions
FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- 4) Store admin/store staff/store tasks row-level ownership constraints.
ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_admins_read_policy ON public.store_admins;
CREATE POLICY store_admins_read_policy
ON public.store_admins
FOR SELECT
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS store_admins_write_policy ON public.store_admins;
CREATE POLICY store_admins_write_policy
ON public.store_admins
FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS store_staff_policy_select ON public.store_staff;
CREATE POLICY store_staff_policy_select
ON public.store_staff
FOR SELECT
USING (
  public.is_super_admin()
  OR store_id = ANY(public.get_my_store_ids())
);

DROP POLICY IF EXISTS store_staff_policy_write ON public.store_staff;
CREATE POLICY store_staff_policy_write
ON public.store_staff
FOR ALL
USING (
  public.is_super_admin()
  OR store_id = ANY(public.get_my_store_ids())
)
WITH CHECK (
  public.is_super_admin()
  OR store_id = ANY(public.get_my_store_ids())
);

DROP POLICY IF EXISTS store_tasks_policy_select ON public.store_tasks;
CREATE POLICY store_tasks_policy_select
ON public.store_tasks
FOR SELECT
USING (
  public.is_super_admin()
  OR store_id = ANY(public.get_my_store_ids())
);

DROP POLICY IF EXISTS store_tasks_policy_write ON public.store_tasks;
CREATE POLICY store_tasks_policy_write
ON public.store_tasks
FOR ALL
USING (
  public.is_super_admin()
  OR store_id = ANY(public.get_my_store_ids())
)
WITH CHECK (
  public.is_super_admin()
  OR store_id = ANY(public.get_my_store_ids())
);
