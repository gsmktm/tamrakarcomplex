
-- 1. Ensure public.stores has denormalized fields for fast directory rendering
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_slug text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_name text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;

-- 2. Create a function to sync store plan info from subscriptions
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
      plan_slug = NULL,
      plan_name = NULL,
      subscription_status = 'inactive',
      subscription_end_date = NULL
    WHERE id = OLD.store_id;
    RETURN OLD;
  ELSE
    UPDATE public.stores s
    SET 
      plan_slug = p.slug,
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

-- 3. Create trigger for sync
DROP TRIGGER IF EXISTS tr_sync_store_plan ON public.store_subscriptions;
CREATE TRIGGER tr_sync_store_plan
AFTER INSERT OR UPDATE OR DELETE ON public.store_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_store_plan_info();

-- 4. Seed Subscriptions for the 81 existing stores to make directory alive
DO $$
DECLARE
  v_diamond_id uuid;
  v_gold_id    uuid;
  v_silver_id  uuid;
  v_store_record RECORD;
BEGIN
  -- Get package IDs
  SELECT id INTO v_diamond_id FROM public.packages WHERE slug = 'diamond' LIMIT 1;
  SELECT id INTO v_gold_id    FROM public.packages WHERE slug = 'gold' LIMIT 1;
  SELECT id INTO v_silver_id  FROM public.packages WHERE slug = 'silver' LIMIT 1;

  -- A. Assign Diamond (5 random stores)
  FOR v_store_record IN (SELECT id FROM public.stores ORDER BY random() LIMIT 5)
  LOOP
    INSERT INTO public.store_subscriptions (store_id, package_id, status, is_enabled, start_date, end_date)
    VALUES (v_store_record.id, v_diamond_id, 'active', true, now(), now() + interval '1 year')
    ON CONFLICT (store_id) DO UPDATE SET package_id = EXCLUDED.package_id, status = 'active', end_date = now() + interval '1 year';
  END LOOP;

  -- B. Assign Gold (10 random stores)
  FOR v_store_record IN (SELECT id FROM public.stores WHERE id NOT IN (SELECT store_id FROM public.store_subscriptions) ORDER BY random() LIMIT 10)
  LOOP
    INSERT INTO public.store_subscriptions (store_id, package_id, status, is_enabled, start_date, end_date)
    VALUES (v_store_record.id, v_gold_id, 'active', true, now(), now() + interval '1 year')
    ON CONFLICT (store_id) DO UPDATE SET package_id = EXCLUDED.package_id, status = 'active', end_date = now() + interval '1 year';
  END LOOP;

  -- C. Assign Silver (15 random stores)
  FOR v_store_record IN (SELECT id FROM public.stores WHERE id NOT IN (SELECT store_id FROM public.store_subscriptions) ORDER BY random() LIMIT 15)
  LOOP
    INSERT INTO public.store_subscriptions (store_id, package_id, status, is_enabled, start_date, end_date)
    VALUES (v_store_record.id, v_silver_id, 'active', true, now(), now() + interval '1 year')
    ON CONFLICT (store_id) DO UPDATE SET package_id = EXCLUDED.package_id, status = 'active', end_date = now() + interval '1 year';
  END LOOP;

  -- D. Force initial sync for all stores
  UPDATE public.stores s
  SET 
    subscription_status = COALESCE(ss.status, 'inactive'),
    plan_slug = p.slug,
    plan_name = p.name,
    subscription_end_date = ss.end_date
  FROM public.store_subscriptions ss
  JOIN public.packages p ON p.id = ss.package_id
  WHERE s.id = ss.store_id;

END $$;

-- 5. Finalize get_stores_directory RPC to include these fields
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
  plan_slug text,
  plan_name text,
  subscription_status text,
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
    plan_slug, plan_name, subscription_status, subscription_end_date
  FROM public.stores
  ORDER BY 
    CASE WHEN subscription_status = 'active' AND plan_slug = 'diamond' THEN 1
         WHEN subscription_status = 'active' AND plan_slug = 'gold' THEN 2
         WHEN subscription_status = 'active' AND plan_slug = 'silver' THEN 3
         ELSE 4 END ASC,
    name ASC;
$$;
