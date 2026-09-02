-- Final privilege boundary for SECURITY DEFINER functions recreated by later
-- repair migrations. PostgreSQL grants function execution to PUBLIC by
-- default, so every recreation must be followed by explicit grants.

REVOKE ALL ON FUNCTION public.bootstrap_suadmin_by_email(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_suadmin_by_email(text)
  TO service_role;

REVOKE ALL ON FUNCTION public.create_order_payouts(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_payouts(uuid)
  TO service_role;

COMMENT ON FUNCTION public.bootstrap_suadmin_by_email(text) IS
  'Service-role-only emergency bootstrap. Run from a trusted server or the SQL editor.';
COMMENT ON FUNCTION public.create_order_payouts(uuid) IS
  'Service-role-only payout materialization called after verified payment.';
