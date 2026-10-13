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
