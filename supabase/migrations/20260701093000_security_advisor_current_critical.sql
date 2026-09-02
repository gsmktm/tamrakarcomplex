-- Resolve current Supabase advisor ERROR items:
-- 1) public.staffadmin_permissions SECURITY DEFINER view
-- 2) RLS disabled on public.staff_permissions
-- 3) RLS disabled on public.packages

CREATE OR REPLACE VIEW public.staffadmin_permissions
WITH (security_invoker = true)
AS
SELECT
  id,
  staff_user_id AS user_id,
  module_key,
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_approve,
  can_assign,
  can_export,
  granted_by,
  created_at,
  updated_at
FROM public.staff_permissions;

GRANT SELECT ON public.staffadmin_permissions TO authenticated;

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff permissions read own or admin" ON public.staff_permissions;
CREATE POLICY "Staff permissions read own or admin"
ON public.staff_permissions
FOR SELECT
TO authenticated
USING (
  staff_user_id = auth.uid()
  OR public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text = 'staffadmin'
  )
);

DROP POLICY IF EXISTS "Staff permissions admin write" ON public.staff_permissions;
CREATE POLICY "Staff permissions admin write"
ON public.staff_permissions
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text = 'staffadmin'
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text = 'staffadmin'
  )
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active packages" ON public.packages;
CREATE POLICY "Public can read active packages"
ON public.packages
FOR SELECT
USING (active IS TRUE);

DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;
CREATE POLICY "Admins can manage packages"
ON public.packages
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text = 'staffadmin'
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text = 'staffadmin'
  )
);
