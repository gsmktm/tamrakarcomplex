-- Payment provider management for super admins.
-- Central registry of payment methods (Nepal + international) with
-- sandbox/production/demo modes, merchant credentials, and gating.
-- Secrets are never exposed to non-suadmin callers: all reads go through
-- RPCs that strip secret_key; direct table access is denied by RLS.

-- 0. Widen payments constraints so the provider registry can route through
-- any configured method slug and supersede stale attempts:
--   provider CHECK gains the seeded slugs (imepay, connectips, mobilebanking,
--   visa, mastercard, stripe, paypal).
--   status CHECK gains 'cancelled' (superseded by a newer session attempt).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'payments' AND tc.constraint_type = 'CHECK'
  ) THEN
    EXECUTE $fn$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN
        SELECT conname, pg_get_constraintdef(oid) AS def
        FROM pg_constraint
        WHERE conrelid = 'public.payments'::regclass AND contype = 'c'
      LOOP
        IF r.def LIKE '%provider IN%' THEN
          EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', r.conname);
          EXECUTE 'ALTER TABLE public.payments ADD CONSTRAINT payments_provider_check CHECK (provider IN (''esewa'', ''khalti'', ''fonepay'', ''bank'', ''cod'', ''imepay'', ''connectips'', ''mobilebanking'', ''visa'', ''mastercard'', ''stripe'', ''paypal''))';
        ELSIF r.def LIKE '%status IN%' THEN
          EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', r.conname);
          EXECUTE 'ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status IN (''pending'', ''processing'', ''completed'', ''failed'', ''refunded'', ''cancelled''))';
        END IF;
      END LOOP;
    END $fn$;
  END IF;
END $$;

-- 1. Table
CREATE TABLE IF NOT EXISTS public.payment_providers (
  slug             text PRIMARY KEY CHECK (slug ~ '^[a-z0-9_]+$'),
  name             text NOT NULL,
  region           text NOT NULL DEFAULT 'np' CHECK (region IN ('np', 'intl')),
  provider_type    text NOT NULL DEFAULT 'gateway' CHECK (provider_type IN ('wallet', 'card', 'bank', 'qr', 'cod', 'gateway')),
  is_enabled       boolean NOT NULL DEFAULT false,
  is_ready         boolean NOT NULL DEFAULT false,          -- false = "coming soon" badge in checkout
  mode             text NOT NULL DEFAULT 'sandbox' CHECK (mode IN ('sandbox', 'production', 'demo')),
  merchant_code    text,
  secret_key       text,
  gateway_url      text,
  fee_percent      numeric(5,2),
  icon_url         text,
  display_order    integer NOT NULL DEFAULT 0,
  config           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 2. RLS: deny all direct access (reads/writes go through RPCs only)
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_providers_deny_all" ON public.payment_providers;

-- 3. Safe public list: enabled providers, no secrets.
CREATE OR REPLACE FUNCTION public.list_active_payment_providers()
RETURNS TABLE (
  slug            text,
  name            text,
  region          text,
  provider_type   text,
  mode            text,
  is_ready        boolean,
  fee_percent     numeric,
  icon_url        text,
  display_order   integer
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp
AS $$
  SELECT pp.slug, pp.name, pp.region, pp.provider_type, pp.mode,
         pp.is_ready, pp.fee_percent, pp.icon_url, pp.display_order
  FROM public.payment_providers pp
  WHERE pp.is_enabled = true
  ORDER BY pp.display_order ASC, pp.name ASC;
$$;
REVOKE ALL ON FUNCTION public.list_active_payment_providers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_payment_providers() TO anon, authenticated;

-- 4. Suadmin read: full rows including credentials (role-checked, so the
-- SECURITY DEFINER bypass of RLS cannot leak secrets to other users).
CREATE OR REPLACE FUNCTION public.suadmin_get_payment_providers()
RETURNS SETOF public.payment_providers
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'insufficient_role' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM public.payment_providers ORDER BY region, display_order, name;
END;
$$;

-- 5. Suadmin upsert (add/edit provider settings)
CREATE OR REPLACE FUNCTION public.suadmin_upsert_payment_provider(
  p_slug          text,
  p_name          text,
  p_region        text DEFAULT 'np',
  p_provider_type text DEFAULT 'gateway',
  p_is_enabled    boolean DEFAULT false,
  p_is_ready      boolean DEFAULT false,
  p_mode          text DEFAULT 'sandbox',
  p_merchant_code text DEFAULT NULL,
  p_secret_key    text DEFAULT NULL,
  p_gateway_url   text DEFAULT NULL,
  p_fee_percent   numeric DEFAULT NULL,
  p_icon_url      text DEFAULT NULL,
  p_display_order integer DEFAULT 0,
  p_config        jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_old jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'insufficient_role' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(pp) INTO v_old FROM public.payment_providers pp WHERE pp.slug = p_slug;

  INSERT INTO public.payment_providers (
    slug, name, region, provider_type, is_enabled, is_ready, mode,
    merchant_code, secret_key, gateway_url, fee_percent, icon_url, display_order, config
  ) VALUES (
    p_slug, p_name, p_region, p_provider_type, p_is_enabled, p_is_ready, p_mode,
    p_merchant_code, p_secret_key, p_gateway_url, p_fee_percent, p_icon_url, p_display_order,
    COALESCE(p_config, '{}'::jsonb)
  )
  ON CONFLICT (slug) DO UPDATE SET
    name          = EXCLUDED.name,
    region        = EXCLUDED.region,
    provider_type = EXCLUDED.provider_type,
    is_enabled    = EXCLUDED.is_enabled,
    is_ready      = EXCLUDED.is_ready,
    mode          = EXCLUDED.mode,
    merchant_code = COALESCE(NULLIF(EXCLUDED.merchant_code, ''), payment_providers.merchant_code),
    secret_key    = COALESCE(NULLIF(EXCLUDED.secret_key, ''), payment_providers.secret_key),
    gateway_url   = COALESCE(NULLIF(EXCLUDED.gateway_url, ''), payment_providers.gateway_url),
    fee_percent   = EXCLUDED.fee_percent,
    icon_url      = EXCLUDED.icon_url,
    display_order = EXCLUDED.display_order,
    config        = COALESCE(EXCLUDED.config, payment_providers.config),
    updated_at    = now();

  PERFORM public.log_privileged_action(
    'UPSERT_PAYMENT_PROVIDER', 'billing', 'payment_providers',
    NULL, NULL, v_old,
    jsonb_build_object(
      'slug', p_slug, 'is_enabled', p_is_enabled, 'mode', p_mode,
      'merchant_code', p_merchant_code, 'is_ready', p_is_ready
    )
  );
END;
$$;

-- 6. Suadmin quick toggles
CREATE OR REPLACE FUNCTION public.suadmin_toggle_payment_provider(
  p_slug text,
  p_enabled boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_mode text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'insufficient_role' USING ERRCODE = '42501';
  END IF;
  IF p_enabled THEN
    -- Demo mode auto-passes verification: refuse to enable a demo provider so
    -- fake settlements can only be tested after an explicit mode change.
    SELECT mode INTO v_mode FROM public.payment_providers WHERE slug = p_slug;
    IF NOT FOUND THEN RAISE EXCEPTION 'provider_not_found' USING ERRCODE = 'P0002'; END IF;
    IF v_mode = 'demo' THEN
      RAISE EXCEPTION 'cannot_enable_demo_provider' USING ERRCODE = '22023';
    END IF;
  END IF;
  UPDATE public.payment_providers SET is_enabled = p_enabled, updated_at = now()
  WHERE slug = p_slug;
  IF NOT FOUND THEN RAISE EXCEPTION 'provider_not_found' USING ERRCODE = 'P0002'; END IF;
  PERFORM public.log_privileged_action(
    'TOGGLE_PAYMENT_PROVIDER', 'billing', 'payment_providers',
    NULL, NULL, NULL, jsonb_build_object('slug', p_slug, 'enabled', p_enabled)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.suadmin_set_payment_mode(
  p_slug text,
  p_mode text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'insufficient_role' USING ERRCODE = '42501';
  END IF;
  IF p_mode NOT IN ('sandbox', 'production', 'demo') THEN
    RAISE EXCEPTION 'invalid_mode' USING ERRCODE = '22023';
  END IF;
  UPDATE public.payment_providers SET mode = p_mode, updated_at = now()
  WHERE slug = p_slug;
  IF NOT FOUND THEN RAISE EXCEPTION 'provider_not_found' USING ERRCODE = 'P0002'; END IF;
  PERFORM public.log_privileged_action(
    'SET_PAYMENT_MODE', 'billing', 'payment_providers',
    NULL, NULL, NULL, jsonb_build_object('slug', p_slug, 'mode', p_mode)
  );
END;
$$;

-- 7. Internal helper for edge functions: single enabled provider row by slug.
CREATE OR REPLACE FUNCTION public.get_payment_provider_for_checkout(p_slug text)
RETURNS public.payment_providers
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.payment_providers WHERE slug = p_slug AND is_enabled = true;
$$;
REVOKE ALL ON FUNCTION public.get_payment_provider_for_checkout(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_provider_for_checkout(text) TO service_role;
-- Executed only by service role from edge functions. Deploy this migration
-- BEFORE shipping the updated create-payment-session / verify-payment functions.

REVOKE ALL ON FUNCTION public.suadmin_get_payment_providers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suadmin_get_payment_providers() TO authenticated;
REVOKE ALL ON FUNCTION public.suadmin_upsert_payment_provider(text, text, text, text, boolean, boolean, text, text, text, text, numeric, text, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suadmin_upsert_payment_provider(text, text, text, text, boolean, boolean, text, text, text, text, numeric, text, integer, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.suadmin_toggle_payment_provider(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suadmin_toggle_payment_provider(text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.suadmin_set_payment_mode(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suadmin_set_payment_mode(text, text) TO authenticated;

-- 8. Seed: Nepal's top payment methods + international
INSERT INTO public.payment_providers (slug, name, region, provider_type, is_enabled, is_ready, mode, gateway_url, fee_percent, icon_url, display_order, config) VALUES
  ('cod',         'Cash on Delivery',          'np',   'cod',     true,  true, 'production', NULL,                          0,    NULL, 0, '{"description": "Pay with cash when your order is delivered."}'),
  ('esewa',       'eSewa',                     'np',   'wallet',  false, true, 'sandbox',    'https://rc-epay.esewa.com.np/api/epay/main/v2/form', 2.0, 'https://esewa.com.np/common/images/esewa_logo.png', 1, '{"v2": true, "signature_fields": "total_amount,transaction_uuid,product_code", "prod_url": "https://epay.esewa.com.np/api/epay/main/v2/form", "sandbox_url": "https://rc-epay.esewa.com.np/api/epay/main/v2/form"}'),
  ('khalti',      'Khalti',                    'np',   'wallet',  false, true,  'sandbox',   'https://a.khalti.com/api/v2', 2.0, NULL, 2, '{"description": "Pay with Khalti wallet, cards, net banking and mobile banking.", "prod_url": "https://khalti.com/api/v2", "sandbox_url": "https://a.khalti.com/api/v2"}'),
  ('imepay',      'IME Pay',                   'np',   'wallet',  false, false, 'sandbox',   NULL, 2.0, NULL, 3, '{"description": "Pay with IME Pay wallet balance."}'),
  ('fonepay',     'Fonepay QR',                'np',   'qr',      false, false, 'sandbox',   NULL, 1.5, NULL, 4, '{"description": "Scan and pay from any Nepali bank app."}'),
  ('connectips',  'connectIPS',                'np',   'bank',    false, false, 'sandbox',   NULL, 1.0, NULL, 5, '{"description": "Pay directly from your bank account via connectIPS."}'),
  ('mobilebanking', 'Mobile Banking',          'np',   'bank',    false, false, 'sandbox',   NULL, 1.0, NULL, 6, '{"description": "Pay via your bank''s mobile banking app."}'),
  ('visa',        'Visa Card',                 'intl', 'card',    false, false, 'sandbox',   NULL, 2.5, NULL, 7, '{"description": "International Visa debit/credit card."}'),
  ('mastercard',  'Mastercard',                'intl', 'card',    false, false, 'sandbox',   NULL, 2.5, NULL, 8, '{"description": "International Mastercard debit/credit card."}'),
  ('stripe',      'Stripe (Cards)',            'intl', 'gateway', false, false, 'sandbox',   NULL, 2.9, NULL, 9, '{"description": "Cards and wallets for international customers via Stripe."}'),
  ('paypal',      'PayPal',                    'intl', 'gateway', false, false, 'sandbox',   NULL, 3.4, NULL, 10, '{"description": "PayPal balance or linked card for international customers."}')
ON CONFLICT (slug) DO NOTHING;

-- 9. Audit trigger on direct changes (defense in depth for service-role writes)
CREATE OR REPLACE FUNCTION public.fn_audit_payment_provider_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.log_privileged_action(
    'PAYMENT_PROVIDER_' || TG_OP, 'billing', 'payment_providers',
    NULL, NULL,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_payment_provider ON public.payment_providers;
CREATE TRIGGER trg_audit_payment_provider
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_providers
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_payment_provider_change();
