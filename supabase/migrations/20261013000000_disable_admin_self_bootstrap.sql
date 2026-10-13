-- Additive release-security migration; historical migration edits do not run
-- against databases that already recorded their migration versions.
--
-- Administrators must never be created through unauthenticated/first-user
-- self-bootstrap. Privilege assignment requires explicit audited approval.
-- This migration does NOT delete users, revoke existing role rows, or reset
-- passwords. Apply only after checking the correct project and a backup.
CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Administrator self-bootstrap is disabled'
    USING ERRCODE = '42501';
END;
$$;

-- REVOKE PUBLIC alone does not remove any earlier explicit role grants.
REVOKE ALL ON FUNCTION public.bootstrap_admin() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.bootstrap_admin()
  IS 'Disabled: self-service privileged role escalation is prohibited. Use approved admin provisioning.';

-- Disable legacy confirmation helper even on databases where it was created
-- and granted by an already-applied historical migration.
CREATE OR REPLACE FUNCTION public.dev_ensure_confirmed_admin(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT false;
$$;
REVOKE ALL ON FUNCTION public.dev_ensure_confirmed_admin(text)
  FROM PUBLIC, anon, authenticated;

-- The original demo cleanup function removed Auth identities and store/order
-- related data. Preserve the old RPC signature, but deny this destructive
-- operation regardless of the caller.
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
REVOKE ALL ON FUNCTION public.cleanup_demo_accounts()
  FROM PUBLIC, anon, authenticated;
