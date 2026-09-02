-- Canonical store onboarding and subscription payment lifecycle.
-- Client code may request transitions, but only these database functions can
-- approve an application or activate a paid package.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text,
  action text NOT NULL,
  module text,
  target_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin'));

ALTER TABLE public.store_applications
  ADD COLUMN IF NOT EXISTS requested_package_id uuid REFERENCES public.store_packages(id),
  ADD COLUMN IF NOT EXISTS requested_package_slug text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS linked_store_id uuid REFERENCES public.stores(id),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.store_applications
  DROP CONSTRAINT IF EXISTS store_applications_billing_cycle_check;
ALTER TABLE public.store_applications
  ADD CONSTRAINT store_applications_billing_cycle_check
  CHECK (billing_cycle IN ('monthly', 'yearly'));

ALTER TABLE public.store_subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz;

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.store_subscriptions(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  payment_method text,
  transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.store_packages(id),
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS invoice_no text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_transaction_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmins can view all payments" ON public.subscription_payments;
CREATE POLICY "Superadmins can view all payments" ON public.subscription_payments FOR SELECT TO authenticated
USING (public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin'));
DROP POLICY IF EXISTS "Storeadmins can view own payments" ON public.subscription_payments;
CREATE POLICY "Storeadmins can view own payments" ON public.subscription_payments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id
  AND (s.owner_id=auth.uid() OR s.owner_user_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public.store_admins sa WHERE sa.store_id=s.id AND sa.user_id=auth.uid() AND sa.status='active'))));

CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_invoice_no_key
  ON public.subscription_payments(invoice_no) WHERE invoice_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_provider_reference_key
  ON public.subscription_payments(provider, provider_transaction_id)
  WHERE provider IS NOT NULL AND provider_transaction_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.approve_store_application(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.store_applications%ROWTYPE;
  v_store_id uuid;
  v_package public.store_packages%ROWTYPE;
  v_owner_id uuid;
  v_slug text;
BEGIN
  IF NOT (public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_app FROM public.store_applications
  WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF v_app.status = 'rejected' THEN RAISE EXCEPTION 'Rejected application cannot be approved'; END IF;

  SELECT * INTO v_package FROM public.store_packages
  WHERE slug = COALESCE(NULLIF(v_app.requested_package_slug, ''), 'free');
  IF NOT FOUND THEN
    SELECT * INTO v_package FROM public.store_packages WHERE slug = 'free';
  END IF;

  IF v_app.linked_store_id IS NOT NULL THEN
    v_store_id := v_app.linked_store_id;
  ELSE
    SELECT id INTO v_owner_id FROM auth.users
    WHERE lower(email) = lower(v_app.email) LIMIT 1;
    v_slug := trim(both '-' from regexp_replace(lower(v_app.store_name), '[^a-z0-9]+', '-', 'g'));

    SELECT id INTO v_store_id FROM public.stores
    WHERE lower(email) = lower(v_app.email) OR lower(name) = lower(v_app.store_name)
    ORDER BY created_at LIMIT 1;

    IF v_store_id IS NULL THEN
      INSERT INTO public.stores (
        name, slug, owner_id, owner_user_id, phone, email, location, shop_no,
        description, logo_url, is_verified, public_status, package_id,
        package_slug, subscription_status, subscription_start_date, subscription_end_date
      ) VALUES (
        v_app.store_name, v_slug || '-' || substr(gen_random_uuid()::text, 1, 6),
        v_owner_id, v_owner_id, v_app.phone, v_app.email, v_app.location,
        v_app.shop_number, COALESCE(v_app.message, v_app.description), v_app.logo_url,
        true, 'published', v_package.id,
        CASE WHEN v_package.price = 0 THEN v_package.slug ELSE 'free' END,
        CASE WHEN v_package.price = 0 THEN 'active' ELSE 'pending_payment' END,
        CASE WHEN v_package.price = 0 THEN now() ELSE NULL END, NULL
      ) RETURNING id INTO v_store_id;
    END IF;
  END IF;

  INSERT INTO public.store_subscriptions
    (store_id, package_id, status, is_enabled, start_date, end_date, billing_cycle, auto_renew)
  VALUES (
    v_store_id, v_package.id,
    CASE WHEN v_package.price = 0 THEN 'active' ELSE 'pending' END,
    v_package.price = 0,
    CASE WHEN v_package.price = 0 THEN now() ELSE NULL END,
    NULL, v_app.billing_cycle, false
  )
  ON CONFLICT (store_id) DO UPDATE SET
    package_id = EXCLUDED.package_id,
    status = EXCLUDED.status,
    is_enabled = EXCLUDED.is_enabled,
    billing_cycle = EXCLUDED.billing_cycle,
    updated_at = now();

  UPDATE public.store_applications SET
    status = 'approved', requested_package_id = v_package.id,
    linked_store_id = v_store_id, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_application_id;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'INSERT INTO public.audit_logs(actor_id, actor_role, action, module, target_id, new_data) VALUES ($1,$2,$3,$4,$5,$6)'
    USING auth.uid(), 'admin', 'store_application.approved', 'stores', v_store_id,
      jsonb_build_object('application_id', p_application_id, 'package', v_package.slug,
        'billing_cycle', v_app.billing_cycle, 'payment_required', v_package.price > 0);
  END IF;
  RETURN v_store_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_store_subscription_payment(
  p_store_id uuid, p_package_slug text, p_billing_cycle text DEFAULT 'monthly',
  p_payment_method text DEFAULT 'esewa', p_transaction_reference text DEFAULT NULL
) RETURNS public.subscription_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_package public.store_packages%ROWTYPE;
  v_subscription public.store_subscriptions%ROWTYPE;
  v_payment public.subscription_payments%ROWTYPE;
  v_amount numeric;
BEGIN
  IF p_billing_cycle NOT IN ('monthly', 'yearly') THEN RAISE EXCEPTION 'Invalid billing cycle'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = p_store_id
      AND (s.owner_id = auth.uid() OR s.owner_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.store_admins sa WHERE sa.store_id=s.id AND sa.user_id=auth.uid() AND sa.status='active'))
  ) THEN RAISE EXCEPTION 'Not authorized for this store'; END IF;

  SELECT * INTO v_package FROM public.store_packages WHERE slug=p_package_slug;
  IF NOT FOUND OR v_package.price <= 0 THEN RAISE EXCEPTION 'Paid package not found'; END IF;
  v_amount := CASE WHEN p_billing_cycle='yearly' THEN v_package.price * 10 ELSE v_package.price END;

  INSERT INTO public.store_subscriptions(store_id, package_id, status, is_enabled, billing_cycle, auto_renew)
  VALUES (p_store_id, v_package.id, 'pending', false, p_billing_cycle, false)
  ON CONFLICT (store_id) DO UPDATE SET package_id=EXCLUDED.package_id,
    status='pending', is_enabled=false, billing_cycle=EXCLUDED.billing_cycle, updated_at=now()
  RETURNING * INTO v_subscription;

  INSERT INTO public.subscription_payments(
    subscription_id, store_id, package_id, amount, status, payment_method,
    provider, provider_transaction_id, billing_cycle, invoice_no, metadata
  ) VALUES (
    v_subscription.id, p_store_id, v_package.id, v_amount, 'pending', p_payment_method,
    p_payment_method, NULLIF(trim(p_transaction_reference), ''), p_billing_cycle,
    'TC-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text,1,8)),
    jsonb_build_object('requested_by', auth.uid())
  ) RETURNING * INTO v_payment;
  RETURN v_payment;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_store_subscription_payment(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_payment public.subscription_payments%ROWTYPE;
  v_days integer;
BEGIN
  IF NOT (public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_payment FROM public.subscription_payments WHERE id=p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.status = 'completed' THEN RETURN v_payment.store_id; END IF;
  v_days := CASE WHEN v_payment.billing_cycle='yearly' THEN 365 ELSE 30 END;

  UPDATE public.subscription_payments SET status='completed', paid_at=now(),
    verified_at=now(), verified_by=auth.uid(), updated_at=now() WHERE id=p_payment_id;
  UPDATE public.store_subscriptions SET package_id=v_payment.package_id, status='active',
    is_enabled=true, start_date=now(), end_date=now()+make_interval(days=>v_days), updated_at=now()
  WHERE id=v_payment.subscription_id;
  UPDATE public.stores SET package_id=v_payment.package_id,
    package_slug=(SELECT slug FROM public.store_packages WHERE id=v_payment.package_id),
    subscription_status='active', subscription_start_date=now(),
    subscription_end_date=now()+make_interval(days=>v_days), updated_at=now()
  WHERE id=v_payment.store_id;
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'INSERT INTO public.audit_logs(actor_id, actor_role, action, module, target_id, new_data) VALUES ($1,$2,$3,$4,$5,$6)'
    USING auth.uid(),'admin','subscription.payment_verified','subscriptions',v_payment.store_id,
      jsonb_build_object('payment_id',p_payment_id,'amount',v_payment.amount,'days',v_days);
  END IF;
  RETURN v_payment.store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_store_application(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_store_subscription_payment(uuid,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_store_subscription_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_store_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_store_subscription_payment(uuid,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_store_subscription_payment(uuid) TO authenticated;

DROP POLICY IF EXISTS "Storeadmins can insert own payments" ON public.subscription_payments;
CREATE POLICY "Storeadmins can insert own payments" ON public.subscription_payments FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id
  AND (s.owner_id=auth.uid() OR s.owner_user_id=auth.uid())));
