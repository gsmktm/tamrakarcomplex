-- READ-ONLY diagnostics for the correct Tamrakar Supabase project ONLY.
-- No DDL, DML, grants, Auth user rows, secrets, or payment requests.
-- Run only with authorized access. Review results before ANY migration push.

-- 1. Applied migration history (compare to GitHub versions).
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- 2. Table RLS status (pay special attention to public tables with rls=off).
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

-- 3. Applied public RLS policies (metadata only, no customer rows).
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Actual relevant table column contracts.
SELECT table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'orders', 'order_items', 'payments', 'user_roles', 'store_subscriptions',
    'store_commissions', 'store_payouts', 'payment_providers'
  )
ORDER BY table_name, ordinal_position;

-- 5. Selected RPC signatures and security modes.
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS input_arguments,
       pg_get_function_result(p.oid) AS return_contract,
       p.prosecdef AS security_definer,
       p.proacl AS execution_acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'bootstrap_admin', 'is_super_admin', 'is_staff_admin',
    'grant_role_by_email', 'get_stores_directory',
    'create_order_atomic_v2', 'get_payment_provider_for_checkout'
  )
ORDER BY p.proname, input_arguments;

-- 6. Check enum values for known role and payment types.
SELECT ns.nspname AS enum_schema, t.typname AS enum_name,
       e.enumlabel AS label, e.enumsortorder AS order_number
FROM pg_type t
JOIN pg_namespace ns ON ns.oid = t.typnamespace
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE ns.nspname = 'public'
  AND t.typname IN ('app_role')
ORDER BY t.typname, e.enumsortorder;

-- 7. Return metadata-only review signals (not a release gate by itself).
SELECT COUNT(*) AS public_tables_without_rls
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  AND NOT c.relrowsecurity;
