-- Production hardening: neutralize demo/dev helpers, enforce validation/rate limits,
-- tighten store/order visibility, and keep admin changes auditable.

CREATE TABLE IF NOT EXISTS public.app_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  identifier text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bucket, identifier, window_start)
);

CREATE INDEX IF NOT EXISTS idx_app_rate_limits_bucket_identifier
  ON public.app_rate_limits(bucket, identifier, window_start DESC);

ALTER TABLE public.app_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only super admin can read rate limits" ON public.app_rate_limits;
CREATE POLICY "Only super admin can read rate limits"
ON public.app_rate_limits FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket text,
  p_identifier text,
  p_max_attempts integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_attempts integer;
BEGIN
  IF p_identifier IS NULL OR length(trim(p_identifier)) = 0 THEN
    RAISE EXCEPTION 'rate_limit_identifier_required' USING ERRCODE = '22023';
  END IF;

  v_window_start := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.app_rate_limits(bucket, identifier, window_start, attempts)
  VALUES (p_bucket, lower(trim(p_identifier)), v_window_start, 1)
  ON CONFLICT (bucket, identifier, window_start)
  DO UPDATE SET attempts = public.app_rate_limits.attempts + 1, updated_at = now()
  RETURNING attempts INTO v_attempts;

  DELETE FROM public.app_rate_limits
  WHERE window_start < now() - interval '2 days';

  RETURN v_attempts <= p_max_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sanitize_plain_text(p_value text, p_max_len integer DEFAULT 1000)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(left(trim(regexp_replace(regexp_replace(coalesce(p_value, ''), '<[^>]*>', '', 'g'), '\s+', ' ', 'g')), p_max_len), '');
$$;

CREATE OR REPLACE FUNCTION public.is_valid_email(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(p_value, '') ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    AND length(coalesce(p_value, '')) <= 320;
$$;

CREATE OR REPLACE FUNCTION public.is_valid_nepal_phone(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(p_value, ''), '[\s-]', '', 'g') ~ '^(\+?977)?(97|98)[0-9]{8}$';
$$;

CREATE OR REPLACE FUNCTION public.is_valid_imei(p_value text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := coalesce(p_value, '');
  v_sum integer := 0;
  v_digit integer;
BEGIN
  IF v !~ '^[0-9]{15}$' THEN
    RETURN false;
  END IF;

  FOR i IN 1..15 LOOP
    v_digit := substr(v, i, 1)::integer;
    IF mod(i, 2) = 0 THEN
      v_digit := v_digit * 2;
      IF v_digit > 9 THEN
        v_digit := v_digit - 9;
      END IF;
    END IF;
    v_sum := v_sum + v_digit;
  END LOOP;

  RETURN mod(v_sum, 10) = 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.harden_contact_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.name := public.sanitize_plain_text(NEW.name, 120);
  NEW.email := lower(public.sanitize_plain_text(NEW.email, 320));
  NEW.subject := public.sanitize_plain_text(NEW.subject, 180);
  NEW.message := public.sanitize_plain_text(NEW.message, 3000);

  IF NEW.name IS NULL OR NEW.message IS NULL OR NOT public.is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'invalid_contact_message' USING ERRCODE = '22023';
  END IF;

  IF NOT public.check_rate_limit('contact_form', NEW.email, 5, 3600) THEN
    RAISE EXCEPTION 'rate_limited_contact_form' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_harden_contact_message ON public.contact_messages;
CREATE TRIGGER tr_harden_contact_message
BEFORE INSERT OR UPDATE ON public.contact_messages
FOR EACH ROW EXECUTE FUNCTION public.harden_contact_message();

CREATE OR REPLACE FUNCTION public.harden_repair_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.name := public.sanitize_plain_text(NEW.name, 120);
  NEW.phone := regexp_replace(public.sanitize_plain_text(NEW.phone, 32), '[\s-]', '', 'g');
  NEW.email := lower(public.sanitize_plain_text(NEW.email, 320));
  NEW.device_brand := public.sanitize_plain_text(NEW.device_brand, 80);
  NEW.device_model := public.sanitize_plain_text(NEW.device_model, 120);
  NEW.issue_type := public.sanitize_plain_text(NEW.issue_type, 80);
  NEW.description := public.sanitize_plain_text(NEW.description, 3000);

  IF NEW.name IS NULL OR NEW.device_brand IS NULL OR NEW.device_model IS NULL OR NOT public.is_valid_nepal_phone(NEW.phone) THEN
    RAISE EXCEPTION 'invalid_repair_request' USING ERRCODE = '22023';
  END IF;
  IF NEW.email IS NOT NULL AND NOT public.is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'invalid_repair_email' USING ERRCODE = '22023';
  END IF;

  IF TG_OP = 'INSERT' AND NOT public.check_rate_limit('repair_request', NEW.phone, 4, 3600) THEN
    RAISE EXCEPTION 'rate_limited_repair_request' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_harden_repair_request ON public.repair_requests;
CREATE TRIGGER tr_harden_repair_request
BEFORE INSERT OR UPDATE ON public.repair_requests
FOR EACH ROW EXECUTE FUNCTION public.harden_repair_request();

CREATE OR REPLACE FUNCTION public.harden_sell_phone_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.brand := public.sanitize_plain_text(NEW.brand, 80);
  NEW.model := public.sanitize_plain_text(NEW.model, 120);
  NEW.storage := public.sanitize_plain_text(NEW.storage, 40);
  NEW.customer_name := public.sanitize_plain_text(NEW.customer_name, 120);
  NEW.customer_phone := regexp_replace(public.sanitize_plain_text(NEW.customer_phone, 32), '[\s-]', '', 'g');
  NEW.customer_email := lower(public.sanitize_plain_text(NEW.customer_email, 320));
  NEW.imei := public.sanitize_plain_text(NEW.imei, 15);
  NEW.source := public.sanitize_plain_text(NEW.source, 60);
  NEW.notes := public.sanitize_plain_text(NEW.notes, 2000);

  IF NEW.brand IS NULL OR NEW.model IS NULL OR NEW.customer_name IS NULL
    OR NOT public.is_valid_nepal_phone(NEW.customer_phone)
    OR NOT public.is_valid_email(NEW.customer_email) THEN
    RAISE EXCEPTION 'invalid_sell_phone_lead' USING ERRCODE = '22023';
  END IF;
  IF NEW.imei IS NOT NULL AND NOT public.is_valid_imei(NEW.imei) THEN
    RAISE EXCEPTION 'invalid_imei' USING ERRCODE = '22023';
  END IF;

  IF TG_OP = 'INSERT' AND NOT public.check_rate_limit('sell_phone_quote', NEW.customer_phone, 5, 3600) THEN
    RAISE EXCEPTION 'rate_limited_sell_phone_quote' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_harden_sell_phone_lead ON public.sell_phone_leads;
CREATE TRIGGER tr_harden_sell_phone_lead
BEFORE INSERT OR UPDATE ON public.sell_phone_leads
FOR EACH ROW EXECUTE FUNCTION public.harden_sell_phone_lead();

-- Disable production access to development account helpers.
CREATE OR REPLACE FUNCTION public.dev_ensure_confirmed_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'dev helper disabled in production' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.dev_create_user(p_email text, p_password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'dev helper disabled in production' USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.dev_ensure_confirmed_admin(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dev_create_user(text, text) FROM PUBLIC, anon, authenticated;

-- Remove known demo/bootstrap accounts if old migrations created them.
DO $$
DECLARE
  v_emails text[] := ARRAY[
    'demo@admin.com',
    'suadmin@tamrakarcomplex.com',
    'admin@tamrakarcomplex.com',
    'store@tamrakarcomplex.com',
    'user@tamrakarcomplex.com',
    'superadmin@tamrakarcomplex.com',
    'gsmktm@gmail.com',
    'gskmtm@gmail.com',
    'gsktm@gmail.com',
    'bootstrap-admin@example.invalid'
  ];
BEGIN
  DELETE FROM public.user_roles ur
  USING auth.users au
  WHERE ur.user_id = au.id
    AND lower(au.email) = ANY(v_emails);

  DELETE FROM auth.users
  WHERE lower(email) = ANY(v_emails);
END $$;

-- Restrict critical commerce tables.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff and super admin can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can view permitted orders" ON public.orders;
CREATE POLICY "Staff can view permitted orders"
ON public.orders FOR SELECT
TO authenticated
USING (public.is_super_admin() OR public.has_staff_permission('orders', 'view'));

DROP POLICY IF EXISTS "Store admins can view store orders" ON public.orders;
DROP POLICY IF EXISTS "Store admins can view own store orders" ON public.orders;
CREATE POLICY "Store admins can view own store orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.stores s ON s.id = oi.store_id
    WHERE oi.order_id = orders.id
      AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store admins can view own order items" ON public.order_items;
CREATE POLICY "Store admins can view own order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = order_items.store_id
      AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Staff can view permitted order items" ON public.order_items;
CREATE POLICY "Staff can view permitted order items"
ON public.order_items FOR SELECT
TO authenticated
USING (public.is_super_admin() OR public.has_staff_permission('orders', 'view'));

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff and super admin can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can view permitted payments" ON public.payments;
CREATE POLICY "Staff can view permitted payments"
ON public.payments FOR SELECT
TO authenticated
USING (public.is_super_admin() OR public.has_staff_permission('payments', 'view'));

DROP POLICY IF EXISTS "Staff can edit permitted payments" ON public.payments;
CREATE POLICY "Staff can edit permitted payments"
ON public.payments FOR UPDATE
TO authenticated
USING (public.is_super_admin() OR public.has_staff_permission('payments', 'edit'))
WITH CHECK (public.is_super_admin() OR public.has_staff_permission('payments', 'edit'));

-- Staff cannot use broad role membership to bypass module permissions.
DROP POLICY IF EXISTS "Staff and super admin manage all leads" ON public.sell_phone_leads;
DROP POLICY IF EXISTS "Staff can manage permitted sell phone leads" ON public.sell_phone_leads;
CREATE POLICY "Staff can manage permitted sell phone leads"
ON public.sell_phone_leads FOR ALL
TO authenticated
USING (public.is_super_admin() OR public.has_staff_permission('valuation', 'view'))
WITH CHECK (public.is_super_admin() OR public.has_staff_permission('valuation', 'edit') OR public.has_staff_permission('valuation', 'create'));

-- Public can create leads, but only for themselves or anonymous records. Triggers validate and rate-limit.
DROP POLICY IF EXISTS "Public can create sell phone leads" ON public.sell_phone_leads;
CREATE POLICY "Public can create sell phone leads"
ON public.sell_phone_leads FOR INSERT
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Recreate create_order so totals are computed server-side, not trusted from the browser.
CREATE OR REPLACE FUNCTION public.create_order(
  p_user_id uuid,
  p_total_amount numeric,
  p_payment_method text,
  p_shipping_address jsonb,
  p_contact_info jsonb,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_phone text := regexp_replace(coalesce(p_contact_info->>'phone', ''), '[\s-]', '', 'g');
  v_email text := lower(coalesce(p_contact_info->>'email', ''));
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'authenticated_user_required' USING ERRCODE = '42501';
  END IF;
  IF p_payment_method NOT IN ('cod', 'esewa', 'khalti', 'fonepay', 'bank') THEN
    RAISE EXCEPTION 'invalid_payment_method' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_valid_nepal_phone(v_phone) THEN
    RAISE EXCEPTION 'invalid_checkout_phone' USING ERRCODE = '22023';
  END IF;
  IF v_email <> '' AND NOT public.is_valid_email(v_email) THEN
    RAISE EXCEPTION 'invalid_checkout_email' USING ERRCODE = '22023';
  END IF;
  IF NOT public.check_rate_limit('checkout', auth.uid()::text, 10, 3600) THEN
    RAISE EXCEPTION 'rate_limited_checkout' USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'checkout_items_required' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := greatest(1, least(coalesce((v_item->>'quantity')::integer, 1), 10));
    SELECT
      id,
      name,
      coalesce(price_value::numeric, nullif(regexp_replace(coalesce(price, ''), '[^0-9.]', '', 'g'), '')::numeric) AS price_value,
      in_stock
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
      AND coalesce(in_stock, true) IS TRUE;

    IF v_product.id IS NULL OR coalesce(v_product.price_value, 0) <= 0 THEN
      RAISE EXCEPTION 'invalid_checkout_product' USING ERRCODE = '22023';
    END IF;

    v_total := v_total + (v_product.price_value * v_qty);
  END LOOP;

  INSERT INTO public.orders(user_id, total_amount, payment_method, payment_status, shipping_address, contact_info)
  VALUES (
    auth.uid(),
    v_total,
    p_payment_method,
    'pending',
    p_shipping_address,
    jsonb_build_object(
      'name', public.sanitize_plain_text(p_contact_info->>'name', 120),
      'phone', v_phone,
      'email', nullif(v_email, '')
    )
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := greatest(1, least(coalesce((v_item->>'quantity')::integer, 1), 10));
    SELECT
      id,
      name,
      coalesce(price_value::numeric, nullif(regexp_replace(coalesce(price, ''), '[^0-9.]', '', 'g'), '')::numeric) AS price_value
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid;

    INSERT INTO public.order_items(order_id, product_id, quantity, price, product_name)
    VALUES (v_order_id, v_product.id, v_qty, v_product.price_value, v_product.name);
  END LOOP;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(uuid, numeric, text, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, numeric, text, jsonb, jsonb, jsonb) TO authenticated;

-- Keep admin-sensitive tables audited.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders',
    'order_items',
    'payments',
    'sell_phone_leads',
    'contact_messages',
    'repair_requests',
    'stores',
    'sell_listings',
    'products',
    'articles',
    'staffadmin_permissions',
    'user_roles'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_audit_action()',
      t,
      t
    );
  END LOOP;
END $$;
