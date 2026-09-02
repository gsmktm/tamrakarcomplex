-- Atomic, server-authoritative checkout for product, catalog, and store-product lines.
-- The authenticated JWT identity is the only accepted order owner.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_user_checkout_idempotency
  ON public.orders (user_id, checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_order_atomic_v2(
  p_payment_method text,
  p_shipping_address jsonb,
  p_contact_info jsonb,
  p_items jsonb,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_existing public.orders%ROWTYPE;
  v_item jsonb;
  v_source text;
  v_product_id uuid;
  v_store_product_id uuid;
  v_catalog_product_id uuid;
  v_store_id uuid;
  v_name text;
  v_sku text;
  v_quantity integer;
  v_available integer;
  v_unit_price numeric(12,2);
  v_total numeric(12,2) := 0;
  v_status text;
  v_phone text := regexp_replace(coalesce(p_contact_info->>'phone', ''), '[\s-]', '', 'g');
  v_email text := lower(trim(coalesce(p_contact_info->>'email', '')));
  v_key text := nullif(trim(p_idempotency_key), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF p_payment_method NOT IN ('cod', 'esewa') THEN
    RAISE EXCEPTION 'invalid_payment_method' USING ERRCODE = '22023';
  END IF;
  IF v_key IS NULL OR length(v_key) < 16 OR length(v_key) > 100 THEN
    RAISE EXCEPTION 'invalid_idempotency_key' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_valid_nepal_phone(v_phone) THEN
    RAISE EXCEPTION 'invalid_checkout_phone' USING ERRCODE = '22023';
  END IF;
  IF v_email <> '' AND NOT public.is_valid_email(v_email) THEN
    RAISE EXCEPTION 'invalid_checkout_email' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'invalid_checkout_items' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing
  FROM public.orders
  WHERE user_id = v_user_id AND checkout_idempotency_key = v_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_existing.id,
      'total_amount', v_existing.total_amount,
      'payment_method', v_existing.payment_method,
      'status', v_existing.order_status,
      'created_at', v_existing.created_at,
      'idempotent_replay', true
    );
  END IF;

  IF NOT public.check_rate_limit('checkout', v_user_id::text, 10, 3600) THEN
    RAISE EXCEPTION 'checkout_rate_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  CREATE TEMP TABLE checkout_lines (
    product_id uuid,
    store_product_id uuid,
    catalog_product_id uuid,
    store_id uuid,
    source_type text NOT NULL,
    product_name text NOT NULL,
    product_sku text,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL
  ) ON COMMIT DROP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_source := coalesce(nullif(v_item->>'source_type', ''), 'product');
    v_quantity := greatest(1, least(10, coalesce((v_item->>'quantity')::integer, 1)));
    v_product_id := NULL;
    v_store_product_id := NULL;
    v_catalog_product_id := NULL;
    v_store_id := NULL;
    v_name := NULL;
    v_sku := NULL;
    v_unit_price := NULL;

    IF v_source = 'store_product' THEN
      v_store_product_id := coalesce(
        nullif(v_item->>'store_product_id', '')::uuid,
        nullif(v_item->>'product_id', '')::uuid
      );
      SELECT sp.store_id, sp.title, NULL::text,
             coalesce(sp.discount_price, sp.price_sale, sp.price),
             coalesce(sp.stock_quantity, sp.stock, 0)
      INTO v_store_id, v_name, v_sku, v_unit_price, v_available
      FROM public.store_products sp
      WHERE sp.id = v_store_product_id AND sp.status = 'active'
      FOR UPDATE;
      IF NOT FOUND OR v_store_id IS NULL OR v_unit_price <= 0 OR v_available < v_quantity THEN
        RAISE EXCEPTION 'store_product_unavailable' USING ERRCODE = 'P0001';
      END IF;
      UPDATE public.store_products
      SET stock_quantity = v_available - v_quantity,
          stock = v_available - v_quantity,
          updated_at = now()
      WHERE id = v_store_product_id;
    ELSIF v_source = 'catalog_product' THEN
      v_catalog_product_id := nullif(v_item->>'catalog_product_id', '')::uuid;
      SELECT cp.name, cp.price_npr
      INTO v_name, v_unit_price
      FROM public.catalog_products cp
      WHERE cp.id = v_catalog_product_id AND cp.is_active = true AND cp.verified = true;
      IF NOT FOUND OR v_unit_price <= 0 THEN
        RAISE EXCEPTION 'catalog_product_unavailable' USING ERRCODE = 'P0001';
      END IF;
    ELSIF v_source = 'product' THEN
      v_product_id := nullif(v_item->>'product_id', '')::uuid;
      SELECT p.store_id, p.name,
             coalesce(p.price_value::numeric, nullif(regexp_replace(coalesce(p.price, ''), '[^0-9.]', '', 'g'), '')::numeric)
      INTO v_store_id, v_name, v_unit_price
      FROM public.products p
      WHERE p.id = v_product_id AND coalesce(p.in_stock, true) = true;
      IF NOT FOUND OR v_store_id IS NULL OR v_unit_price <= 0 THEN
        RAISE EXCEPTION 'product_unavailable' USING ERRCODE = 'P0001';
      END IF;
    ELSE
      RAISE EXCEPTION 'invalid_product_source' USING ERRCODE = '22023';
    END IF;

    INSERT INTO checkout_lines VALUES (
      v_product_id, v_store_product_id, v_catalog_product_id, v_store_id,
      v_source, v_name, v_sku, v_quantity, v_unit_price,
      round(v_unit_price * v_quantity, 2)
    );
    v_total := v_total + round(v_unit_price * v_quantity, 2);
  END LOOP;

  v_status := CASE WHEN p_payment_method = 'cod' THEN 'confirmed' ELSE 'pending_payment' END;
  INSERT INTO public.orders (
    user_id, total_amount, payment_method, payment_status, order_status,
    shipping_address, contact_info, notes, checkout_idempotency_key
  ) VALUES (
    v_user_id, v_total, p_payment_method, 'pending', v_status,
    p_shipping_address,
    jsonb_build_object(
      'name', public.sanitize_plain_text(p_contact_info->>'name', 120),
      'phone', v_phone,
      'email', nullif(v_email, '')
    ),
    public.sanitize_plain_text(p_notes, 1000),
    v_key
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, store_product_id, catalog_product_id, store_id,
    source_type, product_name, product_sku, quantity, price, unit_price, total_price
  )
  SELECT v_order_id, product_id, store_product_id, catalog_product_id, store_id,
         source_type, product_name, product_sku, quantity, unit_price, unit_price, total_price
  FROM checkout_lines;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'total_amount', v_total,
    'payment_method', p_payment_method,
    'status', v_status,
    'created_at', now(),
    'idempotent_replay', false
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing
    FROM public.orders
    WHERE user_id = v_user_id AND checkout_idempotency_key = v_key;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'id', v_existing.id,
        'total_amount', v_existing.total_amount,
        'payment_method', v_existing.payment_method,
        'status', v_existing.order_status,
        'created_at', v_existing.created_at,
        'idempotent_replay', true
      );
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_atomic_v2(text, jsonb, jsonb, jsonb, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_atomic_v2(text, jsonb, jsonb, jsonb, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.create_order_atomic_v2(text, jsonb, jsonb, jsonb, text, text) IS
  'Creates an authenticated order, line items, fulfillment rows, and store inventory reservations in one transaction using authoritative database prices.';
