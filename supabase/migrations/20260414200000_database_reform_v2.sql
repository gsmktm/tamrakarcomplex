
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

-- 3. Subscription purchases are not test fixtures. Historical schema
-- migrations must not randomly assign paid plans or overwrite entitlements.

-- 4. Recreate the changed RETURNS TABLE signature (without CASCADE),
-- preserving public listing while masking private unsubscribed contact info.
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
    s.package_slug, s.plan_name,
    (s.subscription_status = 'active' AND s.subscription_end_date > now()),
    s.subscription_end_date
  FROM public.stores AS s
  ORDER BY
    CASE WHEN s.subscription_status = 'active' AND s.subscription_end_date > now()
      AND s.package_slug = 'diamond' THEN 1
         WHEN s.subscription_status = 'active' AND s.subscription_end_date > now()
           AND s.package_slug = 'gold' THEN 2
         WHEN s.subscription_status = 'active' AND s.subscription_end_date > now()
           AND s.package_slug = 'silver' THEN 3
         ELSE 4 END ASC,
    s.name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_stores_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stores_directory() TO anon, authenticated;
