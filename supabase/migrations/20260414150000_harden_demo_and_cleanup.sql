-- Historical demo/authorization security correction.
--
-- The former migration provisioned four fixed-password auth.users, wrote
-- auth.identities directly, mutated store owner/subscription/product records,
-- bypassed authorization by hard-coded JWT email, and published a SECURITY
-- DEFINER function that deleted Auth and storefront data. None is appropriate
-- in a production schema migration. This version retains stable RPC signatures
-- but removes account/commerce mutations and email-based privilege shortcuts.

-- Legacy dev-only operation stays unavailable instead of changing auth.users.
CREATE OR REPLACE FUNCTION public.dev_ensure_confirmed_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.dev_ensure_confirmed_admin(text) FROM PUBLIC, anon, authenticated;

-- These role helpers read canonical roles from protected public.user_roles.
-- Authorization never depends on user-editable metadata, JWT email allowlists,
-- or ownership of a demo account.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'suadmin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_store_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('store_owner'::public.app_role, 'storeadmin'::public.app_role)
    )
  );
$$;

-- Do not retain a callable RPC that deletes Auth identities and store data.
-- The function name remains for older clients, but it always fails closed.
CREATE OR REPLACE FUNCTION public.cleanup_demo_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Destructive demo account cleanup is disabled'
    USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_demo_accounts() FROM PUBLIC, anon, authenticated;
