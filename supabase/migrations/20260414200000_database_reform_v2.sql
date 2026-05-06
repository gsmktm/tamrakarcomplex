
-- 1. Align naming convention with 20260425 migrations (package_slug, subscription_status)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS package_slug text DEFAULT 'free';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_name text; -- For display
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;

-- 2. Update the sync function to use the correct column names
CREATE OR REPLACE FUNCTION public.sync_store_plan_info()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.stores
    SET 
      package_slug = 'free',
      plan_name = 'Basic',
      subscription_status = 'inactive',
      subscription_end_date = NULL
    WHERE id = OLD.store_id;
    RETURN OLD;
  ELSE
    UPDATE public.stores s
    SET 
      package_slug = p.slug,
      plan_name = p.name,
      subscription_status = NEW.status,
      subscription_end_date = NEW.end_date
    FROM public.packages p
    WHERE s.id = NEW.store_id
    AND p.id = NEW.package_id;
    RETURN NEW;
  END IF;
END;
$$;

-- 3. Seed some data for the directory
DO $$
DECLARE
  v_diamond_id uuid;
  v_gold_id    uuid;
  v_silver_id  uuid;
  v_store_record RECORD;
BEGIN
  SELECT id INTO v_diamond_id FROM public.packages WHERE slug = 'diamond' LIMIT 1;
  SELECT id INTO v_gold_id    FROM public.packages WHERE slug = 'gold' LIMIT 1;
  SELECT id INTO v_silver_id  FROM public.packages WHERE slug = 'silver' LIMIT 1;

  -- Assign Diamond (8 stores)
  FOR v_store_record IN (SELECT id FROM public.stores ORDER BY random() LIMIT 8)
  LOOP
    INSERT INTO public.store_subscriptions (store_id, package_id, status, is_enabled, start_date, end_date)
    VALUES (v_store_record.id, v_diamond_id, 'active', true, now(), now() + interval '1 year')
    ON CONFLICT (store_id) DO UPDATE SET package_id = EXCLUDED.package_id, status = 'active', end_date = now() + interval '1 year';
  END LOOP;

  -- Assign Gold (15 stores)
  FOR v_store_record IN (SELECT id FROM public.stores WHERE id NOT IN (SELECT store_id FROM public.store_subscriptions) ORDER BY random() LIMIT 15)
  LOOP
    INSERT INTO public.store_subscriptions (store_id, package_id, status, is_enabled, start_date, end_date)
    VALUES (v_store_record.id, v_gold_id, 'active', true, now(), now() + interval '1 year')
    ON CONFLICT (store_id) DO UPDATE SET package_id = EXCLUDED.package_id, status = 'active', end_date = now() + interval '1 year';
  END LOOP;

  -- Assign Silver (20 stores)
  FOR v_store_record IN (SELECT id FROM public.stores WHERE id NOT IN (SELECT store_id FROM public.store_subscriptions) ORDER BY random() LIMIT 20)
  LOOP
    INSERT INTO public.store_subscriptions (store_id, package_id, status, is_enabled, start_date, end_date)
    VALUES (v_store_record.id, v_silver_id, 'active', true, now(), now() + interval '1 year')
    ON CONFLICT (store_id) DO UPDATE SET package_id = EXCLUDED.package_id, status = 'active', end_date = now() + interval '1 year';
  END LOOP;

  -- Force initial sync
  UPDATE public.stores s
  SET 
    subscription_status = COALESCE(ss.status, 'inactive'),
    package_slug = COALESCE(p.slug, 'free'),
    plan_name = COALESCE(p.name, 'Basic'),
    subscription_end_date = ss.end_date
  FROM public.store_subscriptions ss
  JOIN public.packages p ON p.id = ss.package_id
  WHERE s.id = ss.store_id;

END $$;

-- 4. Update the RPC to use the standardized column names
CREATE OR REPLACE FUNCTION public.get_stores_directory()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  description text,
  location text,
  shop_no text,
  address text,
  is_verified boolean,
  services text[],
  phone text,
  email text,
  website text,
  map_url text,
  owner_id uuid,
  subscription_tier text, -- mapped from package_slug for frontend
  subscription_tier_name text, -- mapped from plan_name
  has_active_subscription boolean,
  subscription_end_date timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    id, name, slug, logo_url, description, location, shop_no, address,
    is_verified, services, phone, email, website, map_url, owner_id,
    package_slug as subscription_tier,
    plan_name as subscription_tier_name,
    (subscription_status = 'active') as has_active_subscription,
    subscription_end_date
  FROM public.stores
  ORDER BY 
    CASE WHEN subscription_status = 'active' AND package_slug = 'diamond' THEN 1
         WHEN subscription_status = 'active' AND package_slug = 'gold' THEN 2
         WHEN subscription_status = 'active' AND package_slug = 'silver' THEN 3
         ELSE 4 END ASC,
    name ASC;
$$;
