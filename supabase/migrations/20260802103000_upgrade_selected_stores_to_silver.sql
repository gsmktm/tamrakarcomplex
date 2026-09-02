-- Upgrade the selected Tamrakar Complex stores to Silver for 180 days.
-- Abort atomically if the exact target set or canonical Silver package is missing.

DO $$
DECLARE
  v_silver_package_id uuid;
  v_legacy_silver_package_id uuid;
  v_target_count integer;
  v_end_date timestamptz := now() + interval '180 days';
  v_names constant text[] := ARRAY[
    'Smart Phone Gallery',
    'Smart Watch Gallery',
    'Smart Zone',
    'Subha Central Mobile',
    'Talk & Me',
    'Tamrakar Laptop Zone',
    'Tamrakar Mobile',
    'Tamrakar Mobile Hub',
    'Tamrakar Official Store',
    'TATHAASTU',
    'Tele World',
    'The Cellular Point',
    'The Cloud Store',
    'The Mobile Repair',
    'Tirupati Mobile Center'
  ];
BEGIN
  SELECT id INTO v_silver_package_id
  FROM public.store_packages
  WHERE lower(slug) = 'silver'
  LIMIT 1;

  IF v_silver_package_id IS NULL THEN
    RAISE EXCEPTION 'Canonical Silver package is missing from store_packages';
  END IF;

  SELECT count(*) INTO v_target_count
  FROM public.stores
  WHERE name = ANY(v_names);

  IF v_target_count <> cardinality(v_names) THEN
    RAISE EXCEPTION 'Expected % exact target stores but found %; no upgrades applied', cardinality(v_names), v_target_count;
  END IF;

  UPDATE public.stores
  SET package_id = v_silver_package_id,
      package_slug = 'silver',
      subscription_status = 'active',
      subscription_end_date = v_end_date,
      theme_slug = CASE
        WHEN theme_slug IN ('modern', 'editorial', 'premium') THEN theme_slug
        ELSE 'modern'
      END,
      updated_at = now()
  WHERE name = ANY(v_names);

  -- Keep the historical subscription ledger aligned when its legacy Silver
  -- package exists. Runtime access no longer depends on this table.
  SELECT id INTO v_legacy_silver_package_id
  FROM public.packages
  WHERE lower(slug) = 'silver'
  LIMIT 1;

  IF v_legacy_silver_package_id IS NOT NULL THEN
    INSERT INTO public.store_subscriptions (
      store_id, package_id, status, is_enabled, start_date, end_date, auto_renew, updated_at
    )
    SELECT id, v_legacy_silver_package_id, 'active', true, now(), v_end_date, false, now()
    FROM public.stores
    WHERE name = ANY(v_names)
    ON CONFLICT (store_id) DO UPDATE
    SET package_id = excluded.package_id,
        status = 'active',
        is_enabled = true,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        auto_renew = false,
        updated_at = now();
  END IF;
END;
$$;
