-- READ ONLY. Run with a privileged database inspection role on a STAGING
-- CLONE first; do not paste results containing customer data into tickets.
-- PostgreSQL/Supabase schema review for Tamrakar Complex.
-- This script makes no changes and intentionally reads metadata only.

-- Exposed public tables without RLS:
SELECT schemaname, tablename
FROM pg_catalog.pg_tables
WHERE schemaname = 'public' AND rowsecurity = false
ORDER BY tablename;

-- Table owners, tenant keys and RLS switch:
SELECT t.table_name, t.column_name, t.data_type
FROM information_schema.columns t
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'stores','store_admins','store_staff','products','orders','order_items',
    'store_order_fulfillments','repair_requests','sell_phone_leads',
    'exchange_requests','subscription_payments','store_payouts','user_roles',
    'audit_logs'
  )
  AND t.column_name IN ('id','user_id','store_id','owner_id','payment_status','status','role')
ORDER BY t.table_name, t.ordinal_position;

-- Role-level row policies: read full expression, not just whether a policy exists.
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- SECURITY DEFINER functions in the public schema and who can invoke them.
-- Investigate any anonymous EXECEUTE privileges and all role-changing RPCs.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace ns ON ns.oid = p.pronamespace
WHERE ns.nspname = 'public'
ORDER BY p.proname, arguments;

-- Inspect grants to exposed client roles (separate from row policies):
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon','authenticated')
ORDER BY table_name, grantee, privilege_type;

-- Verify no service-role material is embedded in frontend build outputs.
-- This is a code/bundle inspection task, not a SQL query.
