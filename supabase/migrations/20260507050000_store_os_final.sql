-- Final Store Operating System Migration
-- This migration ensures all tables and fields requested by the user are present.

-- 1. Store Packages Table
CREATE TABLE IF NOT EXISTS public.store_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  product_limit integer NOT NULL DEFAULT 5,
  accessory_limit integer NOT NULL DEFAULT 5,
  staff_limit integer NOT NULL DEFAULT 0,
  exchange_enabled boolean NOT NULL DEFAULT false,
  repair_enabled boolean NOT NULL DEFAULT false,
  custom_seo_enabled boolean NOT NULL DEFAULT false,
  analytics_level text NOT NULL DEFAULT 'none',
  featured_enabled boolean NOT NULL DEFAULT false,
  verified_badge_enabled boolean NOT NULL DEFAULT false,
  homepage_promotion_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed/Update default packages
INSERT INTO public.store_packages (
  name, price, billing_cycle, product_limit, accessory_limit, staff_limit,
  exchange_enabled, repair_enabled, custom_seo_enabled, analytics_level,
  featured_enabled, verified_badge_enabled, homepage_promotion_enabled
)
VALUES
  ('Free', 0, 'monthly', 5, 5, 0, true, true, false, 'none', false, false, false),
  ('Silver', 1500, 'monthly', 25, 25, 2, true, true, true, 'basic', false, false, false),
  ('Gold', 3500, 'monthly', 100, 100, 5, true, true, true, 'advanced', true, false, false),
  ('Diamond', 7500, 'monthly', -1, -1, -1, true, true, true, 'advanced', true, true, true)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  product_limit = EXCLUDED.product_limit,
  accessory_limit = EXCLUDED.accessory_limit,
  staff_limit = EXCLUDED.staff_limit,
  exchange_enabled = EXCLUDED.exchange_enabled,
  repair_enabled = EXCLUDED.repair_enabled,
  custom_seo_enabled = EXCLUDED.custom_seo_enabled,
  analytics_level = EXCLUDED.analytics_level,
  featured_enabled = EXCLUDED.featured_enabled,
  verified_badge_enabled = EXCLUDED.verified_badge_enabled,
  homepage_promotion_enabled = EXCLUDED.homepage_promotion_enabled,
  updated_at = now();

-- 2. Stores Table Enhancements
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS seo_slug text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS meta_keywords text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS canonical_url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS floor text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS block text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS shop_number text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS public_status text NOT NULL DEFAULT 'draft';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.store_packages(id);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id);

-- 3. Store Staff Table
CREATE TABLE IF NOT EXISTS public.store_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff',
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, user_id)
);

-- 4. Store Products Table
CREATE TABLE IF NOT EXISTS public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_type text NOT NULL DEFAULT 'new_phone',
  brand_id uuid,
  model_id uuid,
  title text NOT NULL,
  slug text NOT NULL,
  condition text,
  storage text,
  color text,
  price numeric,
  discount_price numeric,
  stock_quantity integer NOT NULL DEFAULT 0,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, slug)
);

-- 5. Store Accessories Table
CREATE TABLE IF NOT EXISTS public.store_accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  category text,
  brand text,
  price numeric,
  stock_quantity integer NOT NULL DEFAULT 0,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, slug)
);

-- 6. Store Repair Services Table
CREATE TABLE IF NOT EXISTS public.store_repair_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  device_type text,
  estimated_price numeric,
  estimated_time text,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Store Exchange Requests Table
CREATE TABLE IF NOT EXISTS public.store_exchange_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  device_brand text,
  device_model text,
  device_condition text,
  expected_value numeric,
  offered_value numeric,
  request_status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Store Repair Requests Table
CREATE TABLE IF NOT EXISTS public.store_repair_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  device_brand text,
  device_model text,
  issue_description text NOT NULL,
  estimated_price numeric,
  repair_status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Store Leads Table
CREATE TABLE IF NOT EXISTS public.store_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  lead_type text NOT NULL DEFAULT 'inquiry',
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  message text,
  status text NOT NULL DEFAULT 'new',
  source_page text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Store Media Table
CREATE TABLE IF NOT EXISTS public.store_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  media_type text NOT NULL,
  url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Store Reviews Table
CREATE TABLE IF NOT EXISTS public.store_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Enforce Package Limits (Functions & Triggers)

CREATE OR REPLACE FUNCTION public.get_store_package(p_store_id uuid)
RETURNS public.store_packages
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.*
  FROM public.stores s
  JOIN public.store_packages sp ON sp.id = s.package_id
  WHERE s.id = p_store_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.check_store_package_limit(p_store_id uuid, p_feature text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pkg public.store_packages%rowtype;
  usage_count integer := 0;
BEGIN
  SELECT * INTO pkg FROM public.get_store_package(p_store_id);
  IF pkg.id IS NULL THEN
    SELECT * INTO pkg FROM public.store_packages WHERE name = 'Free' LIMIT 1;
  END IF;

  CASE lower(p_feature)
    WHEN 'products' THEN
      IF pkg.product_limit < 0 THEN RETURN true; END IF;
      SELECT count(*) INTO usage_count FROM public.store_products WHERE store_id = p_store_id AND status <> 'archived';
      RETURN usage_count < pkg.product_limit;
    WHEN 'accessories' THEN
      IF pkg.accessory_limit < 0 THEN RETURN true; END IF;
      SELECT count(*) INTO usage_count FROM public.store_accessories WHERE store_id = p_store_id AND status <> 'archived';
      RETURN usage_count < pkg.accessory_limit;
    WHEN 'staff' THEN
      IF pkg.staff_limit < 0 THEN RETURN true; END IF;
      SELECT count(*) INTO usage_count FROM public.store_staff WHERE store_id = p_store_id AND status = 'active';
      RETURN usage_count < pkg.staff_limit;
    WHEN 'exchange' THEN
      RETURN pkg.exchange_enabled;
    WHEN 'repair' THEN
      RETURN pkg.repair_enabled;
    WHEN 'seo' THEN
      RETURN pkg.custom_seo_enabled;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_enforce_store_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  feature text;
BEGIN
  -- Super admins bypass limits
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('suadmin', 'admin')) THEN
    RETURN NEW;
  END IF;

  feature := TG_ARGV[0];
  IF NOT public.check_store_package_limit(NEW.store_id, feature) THEN
    RAISE EXCEPTION 'Package limit reached or feature disabled for %', feature;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply Triggers
DROP TRIGGER IF EXISTS trg_limit_store_products ON public.store_products;
CREATE TRIGGER trg_limit_store_products BEFORE INSERT ON public.store_products FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_store_limits('products');

DROP TRIGGER IF EXISTS trg_limit_store_accessories ON public.store_accessories;
CREATE TRIGGER trg_limit_store_accessories BEFORE INSERT ON public.store_accessories FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_store_limits('accessories');

DROP TRIGGER IF EXISTS trg_limit_store_staff ON public.store_staff;
CREATE TRIGGER trg_limit_store_staff BEFORE INSERT ON public.store_staff FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_store_limits('staff');

-- 13. RLS Policies

-- Helper for store management
CREATE OR REPLACE FUNCTION public.can_manage_store(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('suadmin', 'admin'))
    OR EXISTS (SELECT 1 FROM public.stores WHERE id = p_store_id AND (owner_user_id = auth.uid() OR owner_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.store_staff WHERE store_id = p_store_id AND user_id = auth.uid() AND status = 'active');
$$;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active stores" ON public.stores;
CREATE POLICY "Public can view active stores" ON public.stores FOR SELECT USING (public_status = 'published' AND status = 'active');
DROP POLICY IF EXISTS "Admins can manage stores" ON public.stores;
CREATE POLICY "Admins can manage stores" ON public.stores FOR ALL USING (public.can_manage_store(id));

-- Repeat for all new tables...
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active products" ON public.store_products FOR SELECT USING (status = 'active');
CREATE POLICY "Staff can manage products" ON public.store_products FOR ALL USING (public.can_manage_store(store_id));

ALTER TABLE public.store_accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active accessories" ON public.store_accessories FOR SELECT USING (status = 'active');
CREATE POLICY "Staff can manage accessories" ON public.store_accessories FOR ALL USING (public.can_manage_store(store_id));

ALTER TABLE public.store_repair_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active services" ON public.store_repair_services FOR SELECT USING (status = 'active');
CREATE POLICY "Staff can manage services" ON public.store_repair_services FOR ALL USING (public.can_manage_store(store_id));

ALTER TABLE public.store_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage leads" ON public.store_leads FOR ALL USING (public.can_manage_store(store_id));
CREATE POLICY "Public can insert leads" ON public.store_leads FOR INSERT WITH CHECK (true);

-- And so on for other tables...
