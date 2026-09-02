-- Canonical public and checkout prices for Silver, Gold, and Diamond.
ALTER TABLE public.store_packages
  ADD COLUMN IF NOT EXISTS yearly_price numeric NOT NULL DEFAULT 0 CHECK (yearly_price >= 0);

UPDATE public.store_packages SET price = 999, yearly_price = 1111, updated_at = now() WHERE slug = 'silver';
UPDATE public.store_packages SET price = 1999, yearly_price = 19999, updated_at = now() WHERE slug = 'gold';
UPDATE public.store_packages SET price = 2999, yearly_price = 31999, updated_at = now() WHERE slug = 'diamond';
UPDATE public.store_packages SET price = 0, yearly_price = 0, updated_at = now() WHERE slug = 'free';

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
  v_amount := CASE WHEN p_billing_cycle='yearly' THEN v_package.yearly_price ELSE v_package.price END;
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Package price is not configured'; END IF;

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

REVOKE ALL ON FUNCTION public.request_store_subscription_payment(uuid,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_store_subscription_payment(uuid,text,text,text,text) TO authenticated;
