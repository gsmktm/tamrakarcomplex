-- Repair older linked environments that had the lifecycle migration applied
-- before these compatibility columns were detected by plpgsql_check.
ALTER TABLE public.store_subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz;

DO $$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.approve_store_application(uuid)'::regprocedure)
    INTO v_definition;
  v_definition := replace(v_definition, 'FROM public.profiles', 'FROM auth.users');
  EXECUTE v_definition;
END;
$$;
