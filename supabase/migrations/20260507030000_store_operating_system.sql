-- Store Operating System: tenant-style public profiles, package controls, and backfill.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.store_os_slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(input, 'store')), '[^a-z0-9]+', '-', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.store_os_is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF to_regprocedure('public.has_role(uuid,text)') IS NOT NULL THEN
    EXECUTE 'SELECT coalesce(public.has_role(auth.uid(), ''suadmin''), false) OR coalesce(public.has_role(auth.uid(), ''admin''), false)'
    INTO allowed;
    IF allowed THEN
      RETURN true;
    END IF;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN (''suadmin'', ''admin''))'
    INTO allowed;
    IF allowed THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

CREATE TABLE IF NOT EXISTS public.store_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  product_limit integer NOT NULL DEFAULT 0,
  accessory_limit integer NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS public.store_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff',
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  product_type text NOT NULL DEFAULT 'new_phone',
  brand_id uuid,
  model_id uuid,
  title text NOT NULL,
  slug text,
  condition text,
  storage text,
  color text,
  price numeric,
  discount_price numeric,
  stock_quantity integer NOT NULL DEFAULT 0,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.store_packages (
  name, price, billing_cycle, product_limit, accessory_limit, staff_limit,
  exchange_enabled, repair_enabled, custom_seo_enabled, analytics_level,
  featured_enabled, verified_badge_enabled, homepage_promotion_enabled
)
VALUES
  ('Free', 0, 'monthly', 5, 5, 0, true, true, false, 'none', false, false, false),
  ('Silver', 0, 'monthly', 25, 25, 2, true, true, true, 'basic', false, false, false),
  ('Gold', 0, 'monthly', 100, 100, 5, true, true, true, 'advanced', true, false, false),
  ('Diamond', 0, 'monthly', -1, -1, -1, true, true, true, 'advanced', true, true, true)
ON CONFLICT (name) DO UPDATE SET
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

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS seo_slug text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS meta_keywords text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS canonical_url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS public_status text NOT NULL DEFAULT 'draft';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.store_packages(id);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS floor text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS block text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS shop_number text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS public_services text[] NOT NULL DEFAULT ARRAY['New Phones', 'Used Phones', 'Accessories', 'Repair', 'Exchange'];
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS services_json jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS social_links_json jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS package_slug text NOT NULL DEFAULT 'free';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS complex_zone text NOT NULL DEFAULT 'inside';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS theme_slug text NOT NULL DEFAULT 'basic';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

WITH seed_stores (
  slug,
  name,
  shop_no,
  complex_zone,
  location,
  address,
  description,
  phone,
  whatsapp,
  email,
  logo_url,
  cover_image_url,
  package_slug,
  services_json,
  social_links_json,
  theme_slug
) AS (
  VALUES
    (
      'apple-iphone-repair-newroad-sankata',
      'Apple iPhone Repair',
      NULL,
      'outside',
      'Newroad, Sankata',
      'Newroad Sankata, Kathmandu',
      'Specialist iPhone and Mac repair partner for parts replacement, diagnostics, unlock support, and service enquiries.',
      '9851349522',
      '9851349522',
      NULL,
      NULL,
      NULL,
      'gold',
      '["iPhone Parts Replacement", "Mac Parts Replacement", "Repair", "Unlock", "Apple Service"]'::jsonb,
      '{}'::jsonb,
      'premium'
    ),
    (
      'i-fix-nepal-shop-25',
      'i-fix Nepal',
      '25',
      'inside',
      'Tamrakar Complex, Pakosadak, Newroad',
      'Shop No. 25, Tamrakar Complex, Pakosadak, Newroad, Kathmandu',
      'Apple-focused repair desk at Tamrakar Complex for iPhone, iPad, and Mac diagnostics, service, and parts replacement.',
      '9840051802',
      '9840051802',
      'nirollasantosh@gmail.com',
      '/store-assets/i-fix-nepal.jpeg',
      '/store-assets/i-fix-nepal.jpeg',
      'diamond',
      '["iPhone Repair", "Mac Repair", "Parts Replacement", "Apple Service", "Diagnostics"]'::jsonb,
      '{"phone_alt": "9823225200"}'::jsonb,
      'premium'
    ),
    (
      'walk-and-talk-traders',
      'Walk & Talk Traders',
      NULL,
      'outside',
      'Newroad, Kathmandu',
      'Newroad, Kathmandu',
      'Repair and unlock specialist for mobile service, device support, and customer repair enquiries.',
      '9845097441',
      '9845097441',
      NULL,
      '/store-assets/walk-and-talk-traders.jpeg',
      '/store-assets/walk-and-talk-traders.jpeg',
      'gold',
      '["Repair", "Unlock", "Mobile Service", "Parts Support"]'::jsonb,
      '{"phone_alt": "9823289671"}'::jsonb,
      'premium'
    )
),
updated_seed_stores AS (
  UPDATE public.stores s
  SET
    name = seed.name,
    slug = seed.slug,
    seo_slug = seed.slug,
    seo_title = seed.name || ' | Tamrakar Complex',
    seo_description = seed.description,
    meta_keywords = seed.name || ', Tamrakar Complex, Apple repair, phone repair, mobile service',
    canonical_url = 'https://tamrakarcomplex.com/stores/' || seed.slug,
    public_status = 'published',
    shop_no = seed.shop_no,
    shop_number = seed.shop_no,
    complex_zone = seed.complex_zone,
    location = seed.location,
    address = seed.address,
    description = seed.description,
    phone = seed.phone,
    whatsapp = seed.whatsapp,
    email = seed.email,
    logo_url = seed.logo_url,
    cover_image_url = seed.cover_image_url,
    banner_url = seed.cover_image_url,
    is_verified = true,
    is_featured = true,
    package_slug = seed.package_slug,
    subscription_status = 'active',
    subscription_end_date = NULL,
    public_services = ARRAY(SELECT jsonb_array_elements_text(seed.services_json)),
    services_json = seed.services_json,
    social_links_json = seed.social_links_json,
    theme_slug = seed.theme_slug,
    status = 'active',
    updated_at = now()
  FROM seed_stores seed
  WHERE s.slug = seed.slug
     OR s.seo_slug = seed.slug
     OR (lower(s.name) = lower(seed.name) AND coalesce(s.shop_no, '') = coalesce(seed.shop_no, ''))
  RETURNING seed.slug
)
INSERT INTO public.stores (
  name,
  slug,
  seo_slug,
  seo_title,
  seo_description,
  meta_keywords,
  canonical_url,
  public_status,
  shop_no,
  shop_number,
  complex_zone,
  location,
  address,
  description,
  phone,
  whatsapp,
  email,
  logo_url,
  cover_image_url,
  banner_url,
  is_verified,
  is_featured,
  package_slug,
  subscription_status,
  public_services,
  services_json,
  social_links_json,
  theme_slug,
  status,
  created_at,
  updated_at
)
SELECT
  seed.name,
  seed.slug,
  seed.slug,
  seed.name || ' | Tamrakar Complex',
  seed.description,
  seed.name || ', Tamrakar Complex, Apple repair, phone repair, mobile service',
  'https://tamrakarcomplex.com/stores/' || seed.slug,
  'published',
  seed.shop_no,
  seed.shop_no,
  seed.complex_zone,
  seed.location,
  seed.address,
  seed.description,
  seed.phone,
  seed.whatsapp,
  seed.email,
  seed.logo_url,
  seed.cover_image_url,
  seed.cover_image_url,
  true,
  true,
  seed.package_slug,
  'active',
  ARRAY(SELECT jsonb_array_elements_text(seed.services_json)),
  seed.services_json,
  seed.social_links_json,
  seed.theme_slug,
  'active',
  now(),
  now()
FROM seed_stores seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.stores existing
  WHERE existing.slug = seed.slug
     OR existing.seo_slug = seed.slug
     OR (lower(existing.name) = lower(seed.name) AND coalesce(existing.shop_no, '') = coalesce(seed.shop_no, ''))
);

WITH basic_store_names(name) AS (
  VALUES
    ('A.H.'),
    ('Apple Asia Nepal'),
    ('Apple Store ExcuseMe'),
    ('Apple Trade Hub'),
    ('AT Stores NPL'),
    ('Best Tech Center'),
    ('BIG Smart Phone World'),
    ('Cell Phone'),
    ('Cell Phonix (Kalpana)'),
    ('Computronics Vision'),
    ('DD Mobile Hub'),
    ('Demand Mobile'),
    ('Digi Mobile'),
    ('Doctor Mobile'),
    ('E-Zone Mobile'),
    ('E-Zone Mobile'),
    ('E-Zone Mobile (Ground Floor)'),
    ('Easy Mobile Care'),
    ('Emmanuel Mobile Care Pvt. Ltd.'),
    ('ETSX Nepal'),
    ('ExcuseMe Electronics Pvt. Ltd.'),
    ('ExcuseMe Laptop Zone'),
    ('Fourteen G Mobile'),
    ('Future Tech Trade Pvt. Ltd.'),
    ('Gadget Nepal'),
    ('Gidgets'),
    ('Gizma Store'),
    ('Global Phone Arena'),
    ('Icefall Hub (Sagar)'),
    ('Infinity Gadgets & Tech'),
    ('IZONE'),
    ('Jio Laptop Zone'),
    ('Jio Mobiles World'),
    ('Joy Store'),
    ('JS Mobile'),
    ('JU Mobile'),
    ('K & K Mobile Hub'),
    ('Kamal Mobile'),
    ('Laptop Zone'),
    ('MERINA Mobile Center'),
    ('Mi Service Center'),
    ('Micro Mobile House Pvt. Ltd.'),
    ('MK 2'),
    ('MLC Mobile Store'),
    ('MOBITECH Mobile Store'),
    ('Mr. Mobi Pvt. Ltd.'),
    ('Newroad Show Nepal'),
    ('Ocean Mobile Zone'),
    ('One Store'),
    ('OnTech Store Pvt. Ltd.'),
    ('PEAK Mobile'),
    ('Pixel Plus LTD'),
    ('Prince Electronics Pvt. Ltd.'),
    ('Quick Mobile'),
    ('R.K. Mobile Repairing'),
    ('Relief Mobile Store Pvt. Ltd.'),
    ('Samsung Mobile & Electronics Pvt. Ltd.'),
    ('Smart Phone Gallery'),
    ('Smart Watch Gallery'),
    ('Smart Zone'),
    ('Subha Central Mobile'),
    ('Talk & Me'),
    ('Tamrakar Laptop Zone'),
    ('Tamrakar Mobile'),
    ('Tamrakar Mobile Hub'),
    ('Tamrakar Official Store'),
    ('TATHAASTU'),
    ('Tele World'),
    ('The Cellular Point'),
    ('The Cloud Store'),
    ('The Mobile Repair'),
    ('Tirupati Mobile Center'),
    ('TMF Enterprises'),
    ('TRENDZ'),
    ('Two Four Six'),
    ('WAVE Store'),
    ('Yantra Mobile Hub'),
    ('Zenith Mobile Hub Pvt. Ltd.'),
    ('Zokia G2'),
    ('EvoStore Tamrakar'),
    ('Shop (Raju Ji)')
),
basic_seed_stores AS (
  SELECT
    CASE
      WHEN duplicate_no = 1 THEN base_slug
      ELSE base_slug || '-' || duplicate_no::text
    END AS slug,
    name
  FROM (
    SELECT
      name,
      coalesce(nullif(public.store_os_slugify(name), ''), 'tamrakar-store') AS base_slug,
      row_number() OVER (PARTITION BY coalesce(nullif(public.store_os_slugify(name), ''), 'tamrakar-store') ORDER BY name) AS duplicate_no
    FROM basic_store_names
  ) ranked
),
updated_basic_stores AS (
  UPDATE public.stores s
  SET
    slug = seed.slug,
    seo_slug = seed.slug,
    seo_title = seed.name || ' | Tamrakar Complex',
    seo_description = 'Tamrakar Complex store. Full profile details are pending update.',
    meta_keywords = seed.name || ', Tamrakar Complex, mobile store, electronics store',
    canonical_url = 'https://tamrakarcomplex.com/stores/' || seed.slug,
    public_status = 'published',
    complex_zone = coalesce(nullif(s.complex_zone, ''), 'inside'),
    location = coalesce(nullif(s.location, ''), 'Tamrakar Complex, New Road'),
    address = coalesce(nullif(s.address, ''), 'Tamrakar Complex, New Road, Kathmandu'),
    description = coalesce(nullif(s.description, ''), 'Tamrakar Complex store. Full profile details are pending update.'),
    is_verified = coalesce(s.is_verified, false),
    is_featured = false,
    package_slug = 'free',
    subscription_status = 'inactive',
    subscription_end_date = NULL,
    public_services = ARRAY['Mobile Sales', 'Accessories', 'Repair', 'Exchange'],
    services_json = '["Mobile Sales", "Accessories", "Repair", "Exchange"]'::jsonb,
    social_links_json = coalesce(s.social_links_json, '{}'::jsonb),
    theme_slug = 'basic',
    status = 'active',
    updated_at = now()
  FROM basic_seed_stores seed
  WHERE s.slug = seed.slug
     OR s.seo_slug = seed.slug
  RETURNING seed.slug
)
INSERT INTO public.stores (
  name,
  slug,
  seo_slug,
  seo_title,
  seo_description,
  meta_keywords,
  canonical_url,
  public_status,
  complex_zone,
  location,
  address,
  description,
  is_verified,
  is_featured,
  package_slug,
  subscription_status,
  public_services,
  services_json,
  social_links_json,
  theme_slug,
  status,
  created_at,
  updated_at
)
SELECT
  seed.name,
  seed.slug,
  seed.slug,
  seed.name || ' | Tamrakar Complex',
  'Tamrakar Complex store. Full profile details are pending update.',
  seed.name || ', Tamrakar Complex, mobile store, electronics store',
  'https://tamrakarcomplex.com/stores/' || seed.slug,
  'published',
  'inside',
  'Tamrakar Complex, New Road',
  'Tamrakar Complex, New Road, Kathmandu',
  'Tamrakar Complex store. Full profile details are pending update.',
  false,
  false,
  'free',
  'inactive',
  ARRAY['Mobile Sales', 'Accessories', 'Repair', 'Exchange'],
  '["Mobile Sales", "Accessories", "Repair", "Exchange"]'::jsonb,
  '{}'::jsonb,
  'basic',
  'active',
  now(),
  now()
FROM basic_seed_stores seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.stores existing
  WHERE existing.slug = seed.slug
     OR existing.seo_slug = seed.slug
);

UPDATE public.stores
SET owner_user_id = coalesce(owner_user_id, owner_id),
    shop_number = coalesce(shop_number, shop_no),
    banner_url = coalesce(banner_url, cover_image_url),
    package_slug = coalesce(nullif(package_slug, ''), 'free'),
    public_status = CASE WHEN coalesce(status, 'active') = 'active' THEN 'published' ELSE public_status END
WHERE owner_user_id IS NULL
   OR shop_number IS NULL
   OR banner_url IS NULL
   OR package_slug IS NULL
   OR public_status = 'draft';

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
  UNIQUE (store_id, slug)
);

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

ALTER TABLE public.store_staff ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'staff';
ALTER TABLE public.store_staff ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS store_staff_store_user_unique ON public.store_staff(store_id, user_id);

ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'new_phone';
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS brand_id uuid;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS model_id uuid;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS variant text;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS storage text;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS discount_price numeric;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS stock_quantity integer;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS price_mrp numeric;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS price_sale numeric;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS stock integer;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS attributes jsonb;

UPDATE public.store_products
SET slug = coalesce(slug, public.store_os_slugify(title) || '-' || left(id::text, 8)),
    price = coalesce(price, price_sale, price_mrp),
    discount_price = coalesce(discount_price, price_sale),
    stock_quantity = coalesce(stock_quantity, stock, 0)
WHERE slug IS NULL OR price IS NULL OR stock_quantity IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS store_products_store_slug_unique ON public.store_products(store_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS stores_seo_slug_unique ON public.stores(seo_slug) WHERE seo_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS stores_public_status_idx ON public.stores(public_status, status);
CREATE INDEX IF NOT EXISTS stores_package_id_idx ON public.stores(package_id);

CREATE OR REPLACE FUNCTION public.upgrade_existing_stores_to_profiles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_package_id uuid;
  upgraded_count integer;
BEGIN
  SELECT id INTO free_package_id FROM public.store_packages WHERE lower(name) = 'free' LIMIT 1;

  WITH bases AS (
    SELECT
      id,
      coalesce(nullif(seo_slug, ''), nullif(slug, ''), public.store_os_slugify(name), 'store') AS base_slug,
      row_number() OVER (
        PARTITION BY coalesce(nullif(seo_slug, ''), nullif(slug, ''), public.store_os_slugify(name), 'store')
        ORDER BY created_at NULLS LAST, id
      ) AS duplicate_no
    FROM public.stores
  ),
  patched AS (
    UPDATE public.stores s
    SET
      seo_slug = CASE WHEN b.duplicate_no = 1 THEN b.base_slug ELSE b.base_slug || '-' || b.duplicate_no::text END,
      slug = coalesce(nullif(s.slug, ''), CASE WHEN b.duplicate_no = 1 THEN b.base_slug ELSE b.base_slug || '-' || b.duplicate_no::text END),
      seo_title = coalesce(nullif(s.seo_title, ''), s.name || ' - Mobile Phones, Repair, Exchange & Accessories in Tamrakar Complex'),
      seo_description = coalesce(nullif(s.seo_description, ''), 'Visit ' || s.name || ' at Tamrakar Complex for mobile phones, accessories, repair service, and phone exchange offers.'),
      meta_keywords = coalesce(nullif(s.meta_keywords, ''), s.name || ', Tamrakar Complex, mobile phones, accessories, repair, exchange'),
      canonical_url = 'https://tamrakarcomplex.com/stores/' || CASE WHEN b.duplicate_no = 1 THEN b.base_slug ELSE b.base_slug || '-' || b.duplicate_no::text END,
      public_status = coalesce(nullif(s.public_status, ''), CASE WHEN coalesce(s.status, 'active') = 'active' THEN 'published' ELSE 'draft' END),
      package_id = coalesce(
        s.package_id,
        (SELECT sp.id FROM public.store_packages sp WHERE lower(sp.name) = lower(coalesce(nullif(s.package_slug, ''), 'free')) LIMIT 1),
        free_package_id
      ),
      package_slug = coalesce(nullif(s.package_slug, ''), 'free'),
      owner_user_id = coalesce(s.owner_user_id, s.owner_id),
      shop_number = coalesce(s.shop_number, s.shop_no),
      banner_url = coalesce(s.banner_url, s.cover_image_url),
      updated_at = now()
    FROM bases b
    WHERE s.id = b.id
    RETURNING s.id
  )
  SELECT count(*) INTO upgraded_count FROM patched;

  RETURN jsonb_build_object('success', true, 'upgraded_stores', upgraded_count);
END;
$$;

SELECT public.upgrade_existing_stores_to_profiles();

CREATE OR REPLACE FUNCTION public.store_os_package_for_store(input_store_id uuid)
RETURNS public.store_packages
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.*
  FROM public.stores s
  JOIN public.store_packages sp ON sp.id = s.package_id
  WHERE s.id = input_store_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.enforcePackageLimit(store_id uuid, featureName text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pkg public.store_packages%rowtype;
  usage_count integer := 0;
  feature text := lower(featureName);
BEGIN
  SELECT * INTO pkg FROM public.store_os_package_for_store(store_id);
  IF pkg.id IS NULL THEN
    SELECT * INTO pkg FROM public.store_packages WHERE lower(name) = 'free' LIMIT 1;
  END IF;

  IF feature IN ('product', 'products') THEN
    IF pkg.product_limit < 0 THEN RETURN true; END IF;
    SELECT count(*) INTO usage_count FROM public.store_products WHERE store_products.store_id = enforcePackageLimit.store_id AND status <> 'archived';
    RETURN usage_count < pkg.product_limit;
  ELSIF feature IN ('accessory', 'accessories') THEN
    IF pkg.accessory_limit < 0 THEN RETURN true; END IF;
    SELECT count(*) INTO usage_count FROM public.store_accessories WHERE store_accessories.store_id = enforcePackageLimit.store_id AND status <> 'archived';
    RETURN usage_count < pkg.accessory_limit;
  ELSIF feature IN ('staff', 'staff_users') THEN
    IF pkg.staff_limit < 0 THEN RETURN true; END IF;
    SELECT count(*) INTO usage_count FROM public.store_staff WHERE store_staff.store_id = enforcePackageLimit.store_id AND status = 'active';
    RETURN usage_count < pkg.staff_limit;
  ELSIF feature IN ('exchange', 'exchange_requests') THEN
    RETURN pkg.exchange_enabled;
  ELSIF feature IN ('repair', 'repair_services', 'repair_requests') THEN
    RETURN pkg.repair_enabled;
  ELSIF feature IN ('seo', 'custom_seo') THEN
    RETURN pkg.custom_seo_enabled;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_os_enforce_insert_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  feature text;
BEGIN
  IF public.store_os_is_super_admin() THEN
    RETURN NEW;
  END IF;

  feature := TG_ARGV[0];
  IF NOT public.enforcePackageLimit(NEW.store_id, feature) THEN
    RAISE EXCEPTION 'Package limit reached or feature disabled for %', feature USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_products_package_limit_trigger ON public.store_products;
CREATE TRIGGER store_products_package_limit_trigger
BEFORE INSERT ON public.store_products
FOR EACH ROW EXECUTE FUNCTION public.store_os_enforce_insert_limit('products');

DROP TRIGGER IF EXISTS store_accessories_package_limit_trigger ON public.store_accessories;
CREATE TRIGGER store_accessories_package_limit_trigger
BEFORE INSERT ON public.store_accessories
FOR EACH ROW EXECUTE FUNCTION public.store_os_enforce_insert_limit('accessories');

DROP TRIGGER IF EXISTS store_staff_package_limit_trigger ON public.store_staff;
CREATE TRIGGER store_staff_package_limit_trigger
BEFORE INSERT ON public.store_staff
FOR EACH ROW EXECUTE FUNCTION public.store_os_enforce_insert_limit('staff');

DROP TRIGGER IF EXISTS store_exchange_package_limit_trigger ON public.store_exchange_requests;
CREATE TRIGGER store_exchange_package_limit_trigger
BEFORE INSERT ON public.store_exchange_requests
FOR EACH ROW EXECUTE FUNCTION public.store_os_enforce_insert_limit('exchange');

DROP TRIGGER IF EXISTS store_repair_request_package_limit_trigger ON public.store_repair_requests;
CREATE TRIGGER store_repair_request_package_limit_trigger
BEFORE INSERT ON public.store_repair_requests
FOR EACH ROW EXECUTE FUNCTION public.store_os_enforce_insert_limit('repair');

CREATE OR REPLACE FUNCTION public.store_os_can_manage_store(input_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.store_os_is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = input_store_id
        AND (s.owner_user_id = auth.uid() OR s.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.store_admins sa
      WHERE sa.store_id = input_store_id
        AND sa.user_id = auth.uid()
        AND coalesce(sa.status, 'active') = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.store_staff ss
      WHERE ss.store_id = input_store_id
        AND ss.user_id = auth.uid()
        AND ss.status = 'active'
    );
$$;

ALTER TABLE public.store_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_repair_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_repair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stores are viewable by everyone." ON public.stores;
DROP POLICY IF EXISTS store_os_public_store_read ON public.stores;
CREATE POLICY store_os_public_store_read ON public.stores
FOR SELECT USING (public_status = 'published' AND coalesce(status, 'active') = 'active');

DROP POLICY IF EXISTS store_os_store_manage ON public.stores;
CREATE POLICY store_os_store_manage ON public.stores
FOR ALL USING (public.store_os_can_manage_store(id))
WITH CHECK (public.store_os_can_manage_store(id));

DROP POLICY IF EXISTS store_os_packages_read ON public.store_packages;
CREATE POLICY store_os_packages_read ON public.store_packages FOR SELECT USING (true);

DROP POLICY IF EXISTS store_os_packages_super_admin ON public.store_packages;
CREATE POLICY store_os_packages_super_admin ON public.store_packages
FOR ALL USING (public.store_os_is_super_admin())
WITH CHECK (public.store_os_is_super_admin());

DROP POLICY IF EXISTS store_os_public_products ON public.store_products;
CREATE POLICY store_os_public_products ON public.store_products
FOR SELECT USING (status = 'active' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.public_status = 'published' AND s.status = 'active'));

DROP POLICY IF EXISTS store_os_manage_products ON public.store_products;
CREATE POLICY store_os_manage_products ON public.store_products
FOR ALL USING (public.store_os_can_manage_store(store_id))
WITH CHECK (public.store_os_can_manage_store(store_id));

DROP POLICY IF EXISTS store_os_manage_staff ON public.store_staff;
CREATE POLICY store_os_manage_staff ON public.store_staff
FOR ALL USING (public.store_os_can_manage_store(store_id))
WITH CHECK (public.store_os_can_manage_store(store_id));

DROP POLICY IF EXISTS store_os_public_accessories ON public.store_accessories;
CREATE POLICY store_os_public_accessories ON public.store_accessories
FOR SELECT USING (status = 'active' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.public_status = 'published' AND s.status = 'active'));

DROP POLICY IF EXISTS store_os_manage_accessories ON public.store_accessories;
CREATE POLICY store_os_manage_accessories ON public.store_accessories
FOR ALL USING (public.store_os_can_manage_store(store_id))
WITH CHECK (public.store_os_can_manage_store(store_id));

DROP POLICY IF EXISTS store_os_public_repair_services ON public.store_repair_services;
CREATE POLICY store_os_public_repair_services ON public.store_repair_services
FOR SELECT USING (status = 'active' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.public_status = 'published' AND s.status = 'active'));

DROP POLICY IF EXISTS store_os_manage_repair_services ON public.store_repair_services;
CREATE POLICY store_os_manage_repair_services ON public.store_repair_services
FOR ALL USING (public.store_os_can_manage_store(store_id))
WITH CHECK (public.store_os_can_manage_store(store_id));

DROP POLICY IF EXISTS store_os_manage_exchange_requests ON public.store_exchange_requests;
CREATE POLICY store_os_manage_exchange_requests ON public.store_exchange_requests
FOR SELECT USING (public.store_os_can_manage_store(store_id));
DROP POLICY IF EXISTS store_os_public_create_exchange_requests ON public.store_exchange_requests;
CREATE POLICY store_os_public_create_exchange_requests ON public.store_exchange_requests
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.public_status = 'published' AND s.status = 'active'));

DROP POLICY IF EXISTS store_os_manage_repair_requests ON public.store_repair_requests;
CREATE POLICY store_os_manage_repair_requests ON public.store_repair_requests
FOR SELECT USING (public.store_os_can_manage_store(store_id));
DROP POLICY IF EXISTS store_os_public_create_repair_requests ON public.store_repair_requests;
CREATE POLICY store_os_public_create_repair_requests ON public.store_repair_requests
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.public_status = 'published' AND s.status = 'active'));

DROP POLICY IF EXISTS store_os_manage_leads ON public.store_leads;
CREATE POLICY store_os_manage_leads ON public.store_leads
FOR SELECT USING (public.store_os_can_manage_store(store_id));
DROP POLICY IF EXISTS store_os_public_create_leads ON public.store_leads;
CREATE POLICY store_os_public_create_leads ON public.store_leads
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.public_status = 'published' AND s.status = 'active'));

DROP POLICY IF EXISTS store_os_public_media ON public.store_media;
CREATE POLICY store_os_public_media ON public.store_media
FOR SELECT USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.public_status = 'published' AND s.status = 'active'));
DROP POLICY IF EXISTS store_os_manage_media ON public.store_media;
CREATE POLICY store_os_manage_media ON public.store_media
FOR ALL USING (public.store_os_can_manage_store(store_id))
WITH CHECK (public.store_os_can_manage_store(store_id));

DROP POLICY IF EXISTS store_os_public_reviews ON public.store_reviews;
CREATE POLICY store_os_public_reviews ON public.store_reviews
FOR SELECT USING (status = 'approved' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.public_status = 'published' AND s.status = 'active'));
DROP POLICY IF EXISTS store_os_public_create_reviews ON public.store_reviews;
CREATE POLICY store_os_public_create_reviews ON public.store_reviews
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.public_status = 'published' AND s.status = 'active'));
DROP POLICY IF EXISTS store_os_manage_reviews ON public.store_reviews;
CREATE POLICY store_os_manage_reviews ON public.store_reviews
FOR UPDATE USING (public.store_os_can_manage_store(store_id))
WITH CHECK (public.store_os_can_manage_store(store_id));
