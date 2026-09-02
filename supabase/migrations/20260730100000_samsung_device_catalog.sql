-- Samsung device catalog supplied from GSMArena on 2026-07-30.
-- Adds sourced models/specifications without inventing retail or valuation prices.

CREATE TABLE IF NOT EXISTS public.device_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('phone', 'tablet', 'laptop', 'watch', 'accessory')),
  launch_year integer,
  source_url text,
  source_site text,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  popularity_score integer DEFAULT 0,
  search_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.device_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES public.device_models(id) ON DELETE CASCADE,
  storage text,
  ram text,
  color text,
  region text DEFAULT 'NP',
  sku text UNIQUE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  model_id uuid REFERENCES public.device_models(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.device_variants(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  image_url text,
  release_year integer,
  specs_json jsonb DEFAULT '{}'::jsonb,
  price_npr numeric(12,2),
  price_text text,
  source_url text,
  source_site text,
  verified boolean DEFAULT false,
  is_price_list_item boolean DEFAULT false,
  is_active boolean DEFAULT true,
  admin_pinned boolean DEFAULT false,
  popularity_score numeric(8,2) DEFAULT 0,
  search_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_models_brand_id ON public.device_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_device_models_category ON public.device_models(category);
CREATE INDEX IF NOT EXISTS idx_device_variants_model_id ON public.device_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_brand_id ON public.catalog_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_model_id ON public.catalog_products(model_id);

ALTER TABLE public.device_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active device models" ON public.device_models;
CREATE POLICY "Public read active device models" ON public.device_models
  FOR SELECT TO anon, authenticated USING (status = 'active');
DROP POLICY IF EXISTS "Public read active device variants" ON public.device_variants;
CREATE POLICY "Public read active device variants" ON public.device_variants
  FOR SELECT TO anon, authenticated USING (status = 'active');
DROP POLICY IF EXISTS "Public read active catalog products" ON public.catalog_products;
CREATE POLICY "Public read active catalog products" ON public.catalog_products
  FOR SELECT TO anon, authenticated USING (is_active = true);

GRANT SELECT ON public.device_models, public.device_variants, public.catalog_products TO anon, authenticated;

ALTER TABLE public.device_models ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.device_models ADD COLUMN IF NOT EXISTS source_site text;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS specs_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS source_site text;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS is_price_list_item boolean DEFAULT false;

CREATE TEMP TABLE _samsung_devices_20260730 (
  model_name text NOT NULL,
  model_slug text NOT NULL,
  category text NOT NULL,
  launch_year integer NOT NULL,
  display_inches numeric NOT NULL,
  chipset text NOT NULL,
  battery_mah integer NOT NULL,
  storage_gb integer NOT NULL,
  ram_gb numeric NOT NULL,
  source_url text NOT NULL
) ON COMMIT DROP;

INSERT INTO _samsung_devices_20260730
  (model_name, model_slug, category, launch_year, display_inches, chipset, battery_mah, storage_gb, ram_gb, source_url)
VALUES
('Galaxy F06 5G', 'samsung-galaxy-f06-5g', 'phone', 2025, 6.7, 'Dimensity 6300', 5000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_f06_5g-13663.php'),
('Galaxy S25 Ultra', 'samsung-galaxy-s25-ultra', 'phone', 2025, 6.9, 'Snapdragon 8 Elite', 5000, 1024, 16, 'https://www.gsmarena.com/samsung_galaxy_s25_ultra-13322.php'),
('Galaxy S25+', 'samsung-galaxy-s25-plus', 'phone', 2025, 6.7, 'Snapdragon 8 Elite', 4900, 512, 12, 'https://www.gsmarena.com/samsung_galaxy_s25+-13609.php'),
('Galaxy S25', 'samsung-galaxy-s25', 'phone', 2025, 6.2, 'Snapdragon 8 Elite', 4000, 512, 12, 'https://www.gsmarena.com/samsung_galaxy_s25-13610.php'),
('Galaxy Z Fold Special', 'samsung-galaxy-z-fold-special', 'phone', 2024, 8, 'Snapdragon 8 Gen 3', 4400, 512, 16, 'https://www.gsmarena.com/samsung_galaxy_z_fold_special-13452.php'),
('Galaxy A16', 'samsung-galaxy-a16', 'phone', 2024, 6.7, 'Helio G99', 5000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_a16-13383.php'),
('Galaxy A16 5G', 'samsung-galaxy-a16-5g', 'phone', 2024, 6.7, 'Exynos 1330 / Dimensity 6300', 5000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_a16_5g-13346.php'),
('Galaxy S24 FE', 'samsung-galaxy-s24-fe', 'phone', 2024, 6.7, 'Exynos 2400e', 4700, 512, 8, 'https://www.gsmarena.com/samsung_galaxy_s24_fe-13262.php'),
('Galaxy Tab S10 Ultra', 'samsung-galaxy-tab-s10-ultra', 'tablet', 2024, 14.6, 'Dimensity 9300+', 11200, 1024, 16, 'https://www.gsmarena.com/samsung_galaxy_tab_s10_ultra-13362.php'),
('Galaxy Tab S10+', 'samsung-galaxy-tab-s10-plus', 'tablet', 2024, 12.4, 'Dimensity 9300+', 10090, 512, 12, 'https://www.gsmarena.com/samsung_galaxy_tab_s10+-13363.php'),
('Galaxy M55s', 'samsung-galaxy-m55s', 'phone', 2024, 6.7, 'Snapdragon 7 Gen 1', 5000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_m55s-13354.php'),
('Galaxy F05', 'samsung-galaxy-f05', 'phone', 2024, 6.7, 'Helio G85', 5000, 64, 4, 'https://www.gsmarena.com/samsung_galaxy_f05-13345.php'),
('Galaxy M05', 'samsung-galaxy-m05', 'phone', 2024, 6.7, 'Helio G85', 5000, 64, 4, 'https://www.gsmarena.com/samsung_galaxy_m05-13327.php'),
('Galaxy A06', 'samsung-galaxy-a06', 'phone', 2024, 6.7, 'Helio G85', 5000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_a06-13265.php'),
('Galaxy F14 4G', 'samsung-galaxy-f14-4g', 'phone', 2024, 6.7, 'Snapdragon 680 4G', 5000, 64, 4, 'https://www.gsmarena.com/samsung_galaxy_f14_4g-13247.php'),
('Galaxy Z Fold6', 'samsung-galaxy-z-fold6', 'phone', 2024, 7.6, 'Snapdragon 8 Gen 3', 4400, 1024, 12, 'https://www.gsmarena.com/samsung_galaxy_z_fold6-13147.php'),
('Galaxy Z Flip6', 'samsung-galaxy-z-flip6', 'phone', 2024, 6.7, 'Snapdragon 8 Gen 3', 4000, 512, 12, 'https://www.gsmarena.com/samsung_galaxy_z_flip6-13192.php'),
('Galaxy Watch Ultra', 'samsung-galaxy-watch-ultra', 'watch', 2024, 1.5, 'Exynos W1000', 590, 64, 2, 'https://www.gsmarena.com/samsung_galaxy_watch_ultra-13127.php'),
('Galaxy Watch7', 'samsung-galaxy-watch7', 'watch', 2024, 1.5, 'Exynos W1000', 425, 32, 2, 'https://www.gsmarena.com/samsung_galaxy_watch7-13128.php'),
('Galaxy Watch FE', 'samsung-galaxy-watch-fe', 'watch', 2024, 1.2, 'Exynos W920', 247, 16, 1.5, 'https://www.gsmarena.com/samsung_galaxy_watch_fe-13112.php'),
('Galaxy M35', 'samsung-galaxy-m35', 'phone', 2024, 6.6, 'Exynos 1380', 6000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_m35-13006.php'),
('Galaxy F55', 'samsung-galaxy-f55', 'phone', 2024, 6.7, 'Snapdragon 7 Gen 1', 5000, 256, 12, 'https://www.gsmarena.com/samsung_galaxy_f55-12885.php'),
('Galaxy C55', 'samsung-galaxy-c55', 'phone', 2024, 6.7, 'Snapdragon 7 Gen 1', 5000, 256, 12, 'https://www.gsmarena.com/samsung_galaxy_c55-12945.php'),
('Galaxy M55', 'samsung-galaxy-m55', 'phone', 2024, 6.7, 'Snapdragon 7 Gen 1', 5000, 256, 12, 'https://www.gsmarena.com/samsung_galaxy_m55-12896.php'),
('Galaxy Tab S6 Lite (2024)', 'samsung-galaxy-tab-s6-lite-2024', 'tablet', 2024, 10.4, 'Exynos 1280', 7040, 128, 4, 'https://www.gsmarena.com/samsung_galaxy_tab_s6_lite_(2024)-12897.php'),
('Galaxy A55', 'samsung-galaxy-a55', 'phone', 2024, 6.6, 'Exynos 1480', 5000, 256, 12, 'https://www.gsmarena.com/samsung_galaxy_a55-12824.php'),
('Galaxy A35', 'samsung-galaxy-a35', 'phone', 2024, 6.6, 'Exynos 1380', 5000, 256, 12, 'https://www.gsmarena.com/samsung_galaxy_a35-12705.php'),
('Galaxy M15', 'samsung-galaxy-m15', 'phone', 2024, 6.5, 'Dimensity 6100+', 6000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_m15-12833.php'),
('Galaxy M14 4G', 'samsung-galaxy-m14-4g', 'phone', 2024, 6.7, 'Snapdragon 680 4G', 5000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_m14_4g-12862.php'),
('Galaxy F15', 'samsung-galaxy-f15', 'phone', 2024, 6.6, 'Dimensity 6100+', 6000, 128, 8, 'https://www.gsmarena.com/samsung_galaxy_f15-12831.php'),
('Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'phone', 2024, 6.8, 'Snapdragon 8 Gen 3', 5000, 1024, 12, 'https://www.gsmarena.com/samsung_galaxy_s24_ultra-12771.php'),
('Galaxy S24+', 'samsung-galaxy-s24-plus', 'phone', 2024, 6.7, 'Snapdragon 8 Gen 3', 4900, 512, 12, 'https://www.gsmarena.com/samsung_galaxy_s24+-12772.php'),
('Galaxy S24', 'samsung-galaxy-s24', 'phone', 2024, 6.2, 'Snapdragon 8 Gen 3', 4000, 512, 12, 'https://www.gsmarena.com/samsung_galaxy_s24-12773.php'),
('Galaxy XCover7', 'samsung-galaxy-xcover7', 'phone', 2024, 6.6, 'Dimensity 6100+', 4050, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_xcover7-12784.php'),
('Galaxy Tab Active5', 'samsung-galaxy-tab-active5', 'tablet', 2024, 8, 'Exynos 1380', 5050, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_tab_active5-12785.php'),
('Galaxy A25', 'samsung-galaxy-a25', 'phone', 2023, 6.5, 'Exynos 1280', 5000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_a25-12555.php'),
('Galaxy A15 5G', 'samsung-galaxy-a15-5g', 'phone', 2023, 6.5, 'Dimensity 6100+', 5000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_a15_5g-12638.php'),
('Galaxy A15', 'samsung-galaxy-a15', 'phone', 2023, 6.5, 'Helio G99', 5000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_a15-12637.php'),
('Galaxy Tab A9+', 'samsung-galaxy-tab-a9-plus', 'tablet', 2023, 11, 'Snapdragon 695 5G', 7040, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_tab_a9+-12617.php'),
('Galaxy Tab A9', 'samsung-galaxy-tab-a9', 'tablet', 2023, 8.7, 'Helio G99', 5100, 128, 8, 'https://www.gsmarena.com/samsung_galaxy_tab_a9-12616.php'),
('Galaxy S23 FE', 'samsung-galaxy-s23-fe', 'phone', 2023, 6.4, 'Exynos 2200', 4500, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_s23_fe-12520.php'),
('Galaxy Tab S9 FE+', 'samsung-galaxy-tab-s9-fe-plus', 'tablet', 2023, 12.4, 'Exynos 1380', 10090, 256, 12, 'https://www.gsmarena.com/samsung_galaxy_tab_s9_fe+-12609.php'),
('Galaxy Tab S9 FE', 'samsung-galaxy-tab-s9-fe', 'tablet', 2023, 10.9, 'Exynos 1380', 8000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_tab_s9_fe-12517.php'),
('Galaxy A05s', 'samsung-galaxy-a05s', 'phone', 2023, 6.7, 'Snapdragon 680 4G', 5000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_a05s-12584.php'),
('Galaxy A05', 'samsung-galaxy-a05', 'phone', 2023, 6.7, 'Helio G85', 5000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_a05-12583.php'),
('Galaxy F34', 'samsung-galaxy-f34', 'phone', 2023, 6.5, 'Exynos 1280', 6000, 128, 8, 'https://www.gsmarena.com/samsung_galaxy_f34-12453.php'),
('Galaxy Z Fold5', 'samsung-galaxy-z-fold5', 'phone', 2023, 7.6, 'Snapdragon 8 Gen 2', 4400, 1024, 12, 'https://www.gsmarena.com/samsung_galaxy_z_fold5-12418.php'),
('Galaxy Z Flip5', 'samsung-galaxy-z-flip5', 'phone', 2023, 6.7, 'Snapdragon 8 Gen 2', 3700, 512, 8, 'https://www.gsmarena.com/samsung_galaxy_z_flip5-12252.php'),
('Galaxy Tab S9 Ultra', 'samsung-galaxy-tab-s9-ultra', 'tablet', 2023, 14.6, 'Snapdragon 8 Gen 2', 11200, 1024, 16, 'https://www.gsmarena.com/samsung_galaxy_tab_s9_ultra-12217.php'),
('Galaxy Tab S9+', 'samsung-galaxy-tab-s9-plus', 'tablet', 2023, 12.4, 'Snapdragon 8 Gen 2', 10090, 512, 12, 'https://www.gsmarena.com/samsung_galaxy_tab_s9+-12440.php');

INSERT INTO public.device_models
  (brand_id, name, slug, category, launch_year, source_url, source_site, verified, verified_at, status)
SELECT
  brands.id,
  devices.model_name,
  devices.model_slug,
  devices.category,
  devices.launch_year,
  devices.source_url,
  'GSMArena',
  true,
  now(),
  'active'
FROM _samsung_devices_20260730 devices
JOIN public.brands brands ON brands.slug = 'samsung'
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  launch_year = EXCLUDED.launch_year,
  source_url = EXCLUDED.source_url,
  source_site = EXCLUDED.source_site,
  verified = true,
  verified_at = now(),
  status = 'active',
  updated_at = now();

INSERT INTO public.device_variants (model_id, storage, ram, region, status)
SELECT
  models.id,
  concat(devices.storage_gb, 'GB'),
  concat(devices.ram_gb, 'GB'),
  'NP',
  'active'
FROM _samsung_devices_20260730 devices
JOIN public.device_models models ON models.slug = devices.model_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.device_variants existing
  WHERE existing.model_id = models.id
    AND existing.storage = concat(devices.storage_gb, 'GB')
    AND existing.ram = concat(devices.ram_gb, 'GB')
);

INSERT INTO public.catalog_products
  (brand_id, model_id, variant_id, name, slug, release_year, specs_json, source_url, source_site, verified, is_price_list_item, is_active)
SELECT
  brands.id,
  models.id,
  variants.id,
  concat('Samsung ', devices.model_name),
  devices.model_slug,
  devices.launch_year,
  jsonb_build_object(
    'category', devices.category,
    'display_inches', devices.display_inches,
    'chipset', devices.chipset,
    'battery_mah', devices.battery_mah,
    'storage_gb', devices.storage_gb,
    'ram_gb', devices.ram_gb,
    'launch_year', devices.launch_year
  ),
  devices.source_url,
  'GSMArena',
  true,
  false,
  true
FROM _samsung_devices_20260730 devices
JOIN public.brands brands ON brands.slug = 'samsung'
JOIN public.device_models models ON models.slug = devices.model_slug
JOIN public.device_variants variants
  ON variants.model_id = models.id
 AND variants.storage = concat(devices.storage_gb, 'GB')
 AND variants.ram = concat(devices.ram_gb, 'GB')
ON CONFLICT (slug) DO UPDATE SET
  model_id = EXCLUDED.model_id,
  variant_id = EXCLUDED.variant_id,
  release_year = EXCLUDED.release_year,
  specs_json = EXCLUDED.specs_json,
  source_url = EXCLUDED.source_url,
  source_site = EXCLUDED.source_site,
  verified = true,
  is_active = true,
  updated_at = now();
