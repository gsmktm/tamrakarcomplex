
-- Seed subscriptions for existing stores to make the directory look active
-- We will assign 5 Diamond, 10 Gold, and 15 Silver subscriptions to random stores.

DO $$
DECLARE
  v_diamond_id uuid;
  v_gold_id    uuid;
  v_silver_id  uuid;
  v_store_record RECORD;
  v_count int := 0;
BEGIN
  -- 1. Get package IDs
  SELECT id INTO v_diamond_id FROM public.packages WHERE slug = 'diamond' LIMIT 1;
  SELECT id INTO v_gold_id    FROM public.packages WHERE slug = 'gold' LIMIT 1;
  SELECT id INTO v_silver_id  FROM public.packages WHERE slug = 'silver' LIMIT 1;

  -- 2. Clear existing demo subscriptions to avoid conflicts (optional, but safer for seeding)
  -- DELETE FROM public.store_subscriptions WHERE status = 'active';

  -- 3. Assign Diamond (Top 5)
  FOR v_store_record IN (SELECT id FROM public.stores ORDER BY random() LIMIT 5)
  LOOP
    INSERT INTO public.store_subscriptions (store_id, package_id, status, is_enabled, start_date, end_date)
    VALUES (v_store_record.id, v_diamond_id, 'active', true, now(), now() + interval '1 year')
    ON CONFLICT (store_id) DO UPDATE SET package_id = EXCLUDED.package_id, status = 'active', end_date = now() + interval '1 year';
  END LOOP;

  -- 4. Assign Gold (Next 10)
  FOR v_store_record IN (SELECT id FROM public.stores WHERE id NOT IN (SELECT store_id FROM public.store_subscriptions) ORDER BY random() LIMIT 10)
  LOOP
    INSERT INTO public.store_subscriptions (store_id, package_id, status, is_enabled, start_date, end_date)
    VALUES (v_store_record.id, v_gold_id, 'active', true, now(), now() + interval '1 year')
    ON CONFLICT (store_id) DO UPDATE SET package_id = EXCLUDED.package_id, status = 'active', end_date = now() + interval '1 year';
  END LOOP;

  -- 5. Assign Silver (Next 15)
  FOR v_store_record IN (SELECT id FROM public.stores WHERE id NOT IN (SELECT store_id FROM public.store_subscriptions) ORDER BY random() LIMIT 15)
  LOOP
    INSERT INTO public.store_subscriptions (store_id, package_id, status, is_enabled, start_date, end_date)
    VALUES (v_store_record.id, v_silver_id, 'active', true, now(), now() + interval '1 year')
    ON CONFLICT (store_id) DO UPDATE SET package_id = EXCLUDED.package_id, status = 'active', end_date = now() + interval '1 year';
  END LOOP;

  -- 6. Sync the 'subscription_status' and other denormalized fields if they exist in public.stores
  -- Some parts of the app might rely on public.stores.subscription_status
  UPDATE public.stores s
  SET 
    subscription_status = ss.status,
    plan_slug = p.slug,
    plan_name = p.name,
    subscription_end_date = ss.end_date
  FROM public.store_subscriptions ss
  JOIN public.packages p ON p.id = ss.package_id
  WHERE s.id = ss.store_id;

END $$;
