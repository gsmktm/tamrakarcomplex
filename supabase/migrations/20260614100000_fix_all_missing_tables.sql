-- ============================================================
-- CONSOLIDATED FIX: All missing tables + columns + view
-- Apply in Supabase Dashboard SQL Editor for tvgmnjuexdgtgtqhrjok
-- ============================================================

-- 1. STORES: Add missing columns (safe - IF NOT EXISTS)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS package_slug text DEFAULT 'free';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS seo_slug text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS shop_no text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS public_status text DEFAULT 'published';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id);

-- 2. STORE_PACKAGES table
CREATE TABLE IF NOT EXISTS public.store_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text UNIQUE,
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

INSERT INTO public.store_packages (name, slug, price, billing_cycle, product_limit, staff_limit, featured_enabled, verified_badge_enabled, homepage_promotion_enabled)
VALUES
  ('Free',    'free',    0,    'monthly', 5,   0,  false, false, false),
  ('Silver',  'silver',  1500, 'monthly', 25,  2,  false, false, false),
  ('Gold',    'gold',    3500, 'monthly', 100, 5,  true,  false, false),
  ('Diamond', 'diamond', 7500, 'monthly', -1,  -1, true,  true,  true)
ON CONFLICT (name) DO UPDATE SET
  slug = EXCLUDED.slug,
  price = EXCLUDED.price,
  updated_at = now();

-- 3. STORE_PRODUCTS table
CREATE TABLE IF NOT EXISTS public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  catalog_product_id uuid,
  product_type text NOT NULL DEFAULT 'new_phone',
  brand_id uuid,
  model_id uuid,
  title text NOT NULL,
  slug text,
  brand text,
  model text,
  condition text,
  storage text,
  color text,
  description text,
  price numeric,
  price_mrp numeric,
  price_sale numeric,
  discount_price numeric,
  stock_quantity integer NOT NULL DEFAULT 0,
  stock integer,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_products_store_id ON public.store_products(store_id);
CREATE INDEX IF NOT EXISTS idx_store_products_status ON public.store_products(status);

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active store products" ON public.store_products;
CREATE POLICY "Public can view active store products"
  ON public.store_products FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Store owners manage products" ON public.store_products;
CREATE POLICY "Store owners manage products"
  ON public.store_products FOR ALL
  TO authenticated
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.store_staff WHERE store_id = store_products.store_id AND user_id = auth.uid() AND status = 'active')
  );

-- 4. SEO_PAGES table
CREATE TABLE IF NOT EXISTS public.seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_key text NOT NULL,
  path text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  keywords text[] DEFAULT '{}',
  og_image text,
  noindex boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_pages_path ON public.seo_pages(path);

ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read seo pages" ON public.seo_pages;
CREATE POLICY "Public read seo pages"
  ON public.seo_pages FOR SELECT
  USING (is_active = true);

-- 5. HOMEPAGE_SETTINGS table
CREATE TABLE IF NOT EXISTS public.homepage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read homepage settings" ON public.homepage_settings;
CREATE POLICY "Public read homepage settings"
  ON public.homepage_settings FOR SELECT USING (true);

-- 6. PRODUCTS table missing columns (price_value, view_count)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_value numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subtitle text;

-- 7. SELL_LISTINGS: add missing columns + fix RLS
ALTER TABLE public.sell_listings ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.sell_listings ADD COLUMN IF NOT EXISTS catalog_product_id uuid;
ALTER TABLE public.sell_listings ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.sell_listings ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE public.sell_listings ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
ALTER TABLE public.sell_listings ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

DROP POLICY IF EXISTS "Public can read active listings" ON public.sell_listings;
CREATE POLICY "Public can read active listings"
  ON public.sell_listings FOR SELECT
  USING (status = 'active');

-- 8. Rebuild public_marketplace_items view
DROP VIEW IF EXISTS public.public_marketplace_items;

CREATE VIEW public.public_marketplace_items AS
SELECT
  'store_product'::text                             AS source_type,
  sp.id,
  sp.store_id,
  s.name                                            AS store_name,
  s.slug                                            AS store_slug,
  s.seo_slug                                        AS store_seo_slug,
  s.logo_url                                        AS store_logo_url,
  s.is_verified                                     AS store_is_verified,
  s.is_featured                                     AS store_is_featured,
  COALESCE(s.package_slug, 'free')                  AS store_package_slug,
  sp.catalog_product_id,
  COALESCE(sp.discount_price, sp.price_sale, sp.price)::numeric AS price,
  COALESCE(sp.stock_quantity, sp.stock, 0)::integer AS stock,
  sp.status,
  sp.created_by,
  sp.created_at,
  sp.updated_at,
  sp.title,
  sp.brand,
  sp.model,
  sp.description,
  s.location,
  CASE
    WHEN sp.product_type IN ('new_phone','used_phone','phone') THEN 'mobile'
    ELSE sp.product_type
  END                                               AS category,
  sp.condition,
  sp.images,
  CASE COALESCE(s.package_slug,'free')
    WHEN 'diamond' THEN 4 WHEN 'gold' THEN 3 WHEN 'silver' THEN 2 ELSE 1
  END + CASE WHEN s.is_featured THEN 1 ELSE 0 END  AS tier_weight
FROM public.store_products sp
LEFT JOIN public.stores s ON s.id = sp.store_id
WHERE sp.status = 'active'
  AND COALESCE(sp.stock_quantity, sp.stock, 0) > 0

UNION ALL

SELECT
  'user_listing'::text                              AS source_type,
  sl.id,
  sl.store_id,
  s.name                                            AS store_name,
  s.slug                                            AS store_slug,
  s.seo_slug                                        AS store_seo_slug,
  s.logo_url                                        AS store_logo_url,
  s.is_verified                                     AS store_is_verified,
  s.is_featured                                     AS store_is_featured,
  COALESCE(s.package_slug, 'free')                  AS store_package_slug,
  sl.catalog_product_id,
  sl.price::numeric                                 AS price,
  1::integer                                        AS stock,
  sl.status,
  sl.user_id                                        AS created_by,
  sl.created_at,
  sl.updated_at,
  sl.title,
  sl.brand,
  sl.model,
  sl.description,
  sl.location,
  sl.listing_type                                   AS category,
  sl.condition,
  to_jsonb(sl.images)                               AS images,
  CASE COALESCE(s.package_slug,'free')
    WHEN 'diamond' THEN 4 WHEN 'gold' THEN 3 WHEN 'silver' THEN 2 ELSE 1
  END + CASE WHEN s.is_featured THEN 1 ELSE 0 END  AS tier_weight
FROM public.sell_listings sl
LEFT JOIN public.stores s ON s.id = sl.store_id
WHERE sl.status = 'active';

GRANT SELECT ON public.public_marketplace_items TO anon, authenticated;

-- 9. Grant anon access to new tables
GRANT SELECT ON public.store_products TO anon, authenticated;
GRANT SELECT ON public.store_packages TO anon, authenticated;
GRANT SELECT ON public.seo_pages TO anon, authenticated;
GRANT SELECT ON public.homepage_settings TO anon, authenticated;
