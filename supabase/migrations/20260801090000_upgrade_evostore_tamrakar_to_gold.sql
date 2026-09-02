-- Upgrade the exact EvoStore Tamrakar directory entry to an active Gold plan.
-- Keep both the Store OS package FK and the canonical subscription record in sync.
DO $$
DECLARE
  v_store_id uuid;
  v_store_count integer;
  v_store_package_id uuid;
  v_subscription_package_id uuid;
  v_end_date timestamptz := now() + interval '1 year';
BEGIN
  -- Some installations seeded Store OS packages but only the Free row in the
  -- canonical subscription table. Ensure Gold exists before assigning it.
  INSERT INTO public.packages (
    name,
    slug,
    price_monthly,
    price_yearly,
    product_limit,
    admin_limit,
    branch_limit,
    promo_slot_limit,
    active,
    updated_at
  )
  VALUES ('Gold', 'gold', 3500, 35000, 100, 5, 3, 2, true, now())
  ON CONFLICT (slug) DO UPDATE SET
    name = excluded.name,
    active = true,
    updated_at = now();

  SELECT count(*)
  INTO v_store_count
  FROM public.stores
  WHERE lower(trim(name)) = 'evostore tamrakar';

  IF v_store_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one EvoStore Tamrakar store, found %', v_store_count;
  END IF;

  SELECT id
  INTO v_store_id
  FROM public.stores
  WHERE lower(trim(name)) = 'evostore tamrakar';

  SELECT id
  INTO v_store_package_id
  FROM public.store_packages
  WHERE lower(slug) = 'gold'
  LIMIT 1;

  SELECT id
  INTO v_subscription_package_id
  FROM public.packages
  WHERE lower(slug) = 'gold'
  LIMIT 1;

  IF v_store_package_id IS NULL OR v_subscription_package_id IS NULL THEN
    RAISE EXCEPTION 'Gold package is missing from store_packages or packages';
  END IF;

  INSERT INTO public.store_subscriptions (
    store_id,
    package_id,
    status,
    is_enabled,
    start_date,
    end_date,
    auto_renew,
    updated_at
  )
  VALUES (
    v_store_id,
    v_subscription_package_id,
    'active',
    true,
    now(),
    v_end_date,
    true,
    now()
  )
  ON CONFLICT (store_id) DO UPDATE SET
    package_id = excluded.package_id,
    status = 'active',
    is_enabled = true,
    start_date = now(),
    end_date = excluded.end_date,
    auto_renew = true,
    updated_at = now();

  UPDATE public.stores
  SET
    package_slug = 'gold',
    package_id = v_store_package_id,
    subscription_status = 'active',
    subscription_end_date = v_end_date,
    updated_at = now()
  WHERE id = v_store_id;
END;
$$;
