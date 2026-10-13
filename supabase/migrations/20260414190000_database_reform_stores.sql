
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

-- 4. Do not silently assign paid subscriptions during schema installation.
-- Subscription upgrades must be explicitly purchased and approved. Existing
-- values will be kept synchronized by the trigger above.

-- 5. Finalize get_stores_directory RPC to include these fields
-- Its RETURNS TABLE shape changed from an earlier historical migration, so
-- CREATE OR REPLACE cannot update it in place. No CASCADE: surface dependencies.
DROP FUNCTION IF EXISTS public.get_stores_directory();
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
    s.id, s.name, s.slug, s.logo_url,
    CASE WHEN s.owner_id = auth.uid() OR public.is_admin()
      OR (s.subscription_status = 'active' AND s.subscription_end_date > now())
      THEN s.description ELSE NULL END,
    s.location, s.shop_no, s.address, s.is_verified,
    CASE WHEN s.owner_id = auth.uid() OR public.is_admin()
      OR (s.subscription_status = 'active' AND s.subscription_end_date > now())
      THEN s.services ELSE NULL END,
    CASE WHEN s.owner_id = auth.uid() OR public.is_admin()
      OR (s.subscription_status = 'active' AND s.subscription_end_date > now())
      THEN s.phone ELSE NULL END,
    CASE WHEN s.owner_id = auth.uid() OR public.is_admin()
      OR (s.subscription_status = 'active' AND s.subscription_end_date > now())
      THEN s.email ELSE NULL END,
    CASE WHEN s.owner_id = auth.uid() OR public.is_admin()
      OR (s.subscription_status = 'active' AND s.subscription_end_date > now())
      THEN s.website ELSE NULL END,
    CASE WHEN s.owner_id = auth.uid() OR public.is_admin()
      OR (s.subscription_status = 'active' AND s.subscription_end_date > now())
      THEN s.map_url ELSE NULL END,
    CASE WHEN s.owner_id = auth.uid() OR public.is_admin()
      THEN s.owner_id ELSE NULL END,
    s.plan_slug, s.plan_name, s.subscription_status, s.subscription_end_date
  FROM public.stores AS s
  ORDER BY
    CASE WHEN s.subscription_status = 'active' AND s.subscription_end_date > now()
      AND s.plan_slug = 'diamond' THEN 1
         WHEN s.subscription_status = 'active' AND s.subscription_end_date > now()
           AND s.plan_slug = 'gold' THEN 2
         WHEN s.subscription_status = 'active' AND s.subscription_end_date > now()
           AND s.plan_slug = 'silver' THEN 3
         ELSE 4 END ASC,
    s.name ASC;
$$;
REVOKE ALL ON FUNCTION public.get_stores_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stores_directory() TO anon, authenticated;
