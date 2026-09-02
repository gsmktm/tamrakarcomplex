-- Samsung GSMArena catalog continuation (2022-2023), supplied 2026-07-30.
-- Specifications are sourced; retail and valuation prices intentionally remain unset.

CREATE TEMP TABLE _samsung_devices_2022_2023 (
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

INSERT INTO _samsung_devices_2022_2023
  (model_name, model_slug, category, launch_year, display_inches, chipset, battery_mah, storage_gb, ram_gb, source_url)
VALUES
('Galaxy Tab S9', 'samsung-galaxy-tab-s9', 'tablet', 2023, 11, 'Snapdragon 8 Gen 2', 8400, 256, 12, 'https://www.gsmarena.com/samsung_galaxy_tab_s9-12439.php'),
('Galaxy Watch6 Classic', 'samsung-galaxy-watch6-classic', 'watch', 2023, 1.5, 'Exynos W930', 425, 16, 2, 'https://www.gsmarena.com/samsung_galaxy_watch6_classic-12438.php'),
('Galaxy Watch6', 'samsung-galaxy-watch6', 'watch', 2023, 1.5, 'Exynos W930', 425, 16, 2, 'https://www.gsmarena.com/samsung_galaxy_watch6-12437.php'),
('Galaxy M34 5G', 'samsung-galaxy-m34-5g', 'phone', 2023, 6.5, 'Exynos 1280', 6000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_m34_5g-11290.php'),
('Galaxy F54', 'samsung-galaxy-f54', 'phone', 2023, 6.7, 'Exynos 1380', 6000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_f54-12239.php'),
('Galaxy A24 4G', 'samsung-galaxy-a24-4g', 'phone', 2023, 6.5, 'Helio G99', 5000, 128, 8, 'https://www.gsmarena.com/samsung_galaxy_a24_4g-12176.php'),
('Galaxy F14', 'samsung-galaxy-f14', 'phone', 2023, 6.6, 'Exynos 1330', 6000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_f14-12175.php'),
('Galaxy M54', 'samsung-galaxy-m54', 'phone', 2023, 6.7, 'Exynos 1380', 6000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_m54-12189.php'),
('Galaxy A54', 'samsung-galaxy-a54', 'phone', 2023, 6.4, 'Exynos 1380', 5000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_a54-12070.php'),
('Galaxy A34', 'samsung-galaxy-a34', 'phone', 2023, 6.6, 'Dimensity 1080', 5000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_a34-12074.php'),
('Galaxy M14', 'samsung-galaxy-m14', 'phone', 2023, 6.6, 'Exynos 1330', 6000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_m14-12160.php'),
('Galaxy S23 Ultra', 'samsung-galaxy-s23-ultra', 'phone', 2023, 6.8, 'Snapdragon 8 Gen 2', 5000, 1024, 12, 'https://www.gsmarena.com/samsung_galaxy_s23_ultra-12024.php'),
('Galaxy S23+', 'samsung-galaxy-s23-plus', 'phone', 2023, 6.6, 'Snapdragon 8 Gen 2', 4700, 512, 8, 'https://www.gsmarena.com/samsung_galaxy_s23+-12083.php'),
('Galaxy S23', 'samsung-galaxy-s23', 'phone', 2023, 6.1, 'Snapdragon 8 Gen 2', 3900, 512, 8, 'https://www.gsmarena.com/samsung_galaxy_s23-12082.php'),
('Galaxy A14', 'samsung-galaxy-a14', 'phone', 2023, 6.6, 'MT6769 Helio G80', 5000, 128, 8, 'https://www.gsmarena.com/samsung_galaxy_a14-12151.php'),
('Galaxy A14 5G', 'samsung-galaxy-a14-5g', 'phone', 2023, 6.6, 'Exynos 1330', 5000, 128, 8, 'https://www.gsmarena.com/samsung_galaxy_a14_5g-12004.php'),
('Galaxy F04', 'samsung-galaxy-f04', 'phone', 2023, 6.5, 'MT6765 Helio P35', 5000, 64, 4, 'https://www.gsmarena.com/samsung_galaxy_f04-12054.php'),
('Galaxy M04', 'samsung-galaxy-m04', 'phone', 2022, 6.5, 'MT6765 Helio P35', 5000, 128, 4, 'https://www.gsmarena.com/samsung_galaxy_m04-12022.php'),
('Galaxy Tab A7 10.4 (2022)', 'samsung-galaxy-tab-a7-10-4-2022', 'tablet', 2022, 10.4, 'Unisoc UMS512 T618', 7040, 64, 4, 'https://www.gsmarena.com/samsung_galaxy_tab_a7_10_4_(2022)-11988.php'),
('Galaxy A04e', 'samsung-galaxy-a04e', 'phone', 2022, 6.5, 'MT6765 Helio P35', 5000, 128, 4, 'https://www.gsmarena.com/samsung_galaxy_a04e-11945.php'),
('Galaxy Tab Active4 Pro', 'samsung-galaxy-tab-active4-pro', 'tablet', 2022, 10.1, 'Snapdragon 778G 5G', 7600, 128, 4, 'https://www.gsmarena.com/samsung_galaxy_tab_active4_pro-11840.php'),
('Galaxy A04s', 'samsung-galaxy-a04s', 'phone', 2022, 6.5, 'Exynos 850', 5000, 128, 4, 'https://www.gsmarena.com/samsung_galaxy_a04s-11803.php'),
('Galaxy A04', 'samsung-galaxy-a04', 'phone', 2022, 6.5, 'MT6765 Helio P35', 5000, 128, 8, 'https://www.gsmarena.com/samsung_galaxy_a04-11817.php'),
('Galaxy Z Fold4', 'samsung-galaxy-z-fold4', 'phone', 2022, 7.6, 'Snapdragon 8+ Gen 1', 4400, 1024, 12, 'https://www.gsmarena.com/samsung_galaxy_z_fold4-11737.php'),
('Galaxy Z Flip4', 'samsung-galaxy-z-flip4', 'phone', 2022, 6.7, 'Snapdragon 8+ Gen 1', 3700, 512, 8, 'https://www.gsmarena.com/samsung_galaxy_z_flip4-11538.php'),
('Galaxy Watch5 Pro', 'samsung-galaxy-watch5-pro', 'watch', 2022, 1.4, 'Exynos W920', 590, 16, 1.5, 'https://www.gsmarena.com/samsung_galaxy_watch5_pro-11749.php'),
('Galaxy Watch5', 'samsung-galaxy-watch5', 'watch', 2022, 1.4, 'Exynos W920', 410, 16, 1.5, 'https://www.gsmarena.com/samsung_galaxy_watch5-11748.php'),
('Galaxy A23 5G', 'samsung-galaxy-a23-5g', 'phone', 2022, 6.6, 'Snapdragon 695 5G', 5000, 128, 8, 'https://www.gsmarena.com/samsung_galaxy_a23_5g-11736.php'),
('Galaxy M13 5G', 'samsung-galaxy-m13-5g', 'phone', 2022, 6.5, 'Dimensity 700', 5000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_m13_5g-11633.php'),
('Galaxy M13 (India)', 'samsung-galaxy-m13-india', 'phone', 2022, 6.6, 'Exynos 850', 6000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_m13_(india)-11654.php'),
('Galaxy A13 (SM-A137)', 'samsung-galaxy-a13-sm-a137', 'phone', 2022, 6.6, 'MT6769V', 5000, 128, 4, 'https://www.gsmarena.com/samsung_galaxy_a13_(sm_a137)-11665.php'),
('Galaxy XCover6 Pro', 'samsung-galaxy-xcover6-pro', 'phone', 2022, 6.6, 'Snapdragon 778G 5G', 4050, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_xcover6_pro-11600.php'),
('Galaxy F13', 'samsung-galaxy-f13', 'phone', 2022, 6.6, 'Exynos 850', 6000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_f13-11624.php'),
('Galaxy M13', 'samsung-galaxy-m13', 'phone', 2022, 6.6, 'Exynos 850', 5000, 128, 4, 'https://www.gsmarena.com/samsung_galaxy_m13-11564.php'),
('Galaxy Tab S6 Lite (2022)', 'samsung-galaxy-tab-s6-lite-2022', 'tablet', 2022, 10.4, 'Snapdragon 732G', 7040, 128, 4, 'https://www.gsmarena.com/samsung_galaxy_tab_s6_lite_(2022)-11524.php'),
('Galaxy M53', 'samsung-galaxy-m53', 'phone', 2022, 6.7, 'Dimensity 900', 5000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_m53-11439.php'),
('Galaxy S20 FE 2022', 'samsung-galaxy-s20-fe-2022', 'phone', 2022, 6.5, 'Snapdragon 865 5G', 4500, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_s20_fe_2022-11459.php'),
('Galaxy A73 5G', 'samsung-galaxy-a73-5g', 'phone', 2022, 6.7, 'Snapdragon 778G 5G', 5000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_a73_5g-11257.php'),
('Galaxy A53 5G', 'samsung-galaxy-a53-5g', 'phone', 2022, 6.5, 'Exynos 1280', 5000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_a53_5g-11268.php'),
('Galaxy A33 5G', 'samsung-galaxy-a33-5g', 'phone', 2022, 6.4, 'Exynos 1280', 5000, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_a33_5g-11429.php'),
('Galaxy F23', 'samsung-galaxy-f23', 'phone', 2022, 6.6, 'Snapdragon 750G 5G', 5000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_f23-11406.php'),
('Galaxy M33', 'samsung-galaxy-m33', 'phone', 2022, 6.6, 'Exynos 1280', 6000, 128, 8, 'https://www.gsmarena.com/samsung_galaxy_m33-11404.php'),
('Galaxy M23', 'samsung-galaxy-m23', 'phone', 2022, 6.6, 'Snapdragon 750G 5G', 5000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_m23-11403.php'),
('Galaxy A23', 'samsung-galaxy-a23', 'phone', 2022, 6.6, 'Snapdragon 680 4G', 5000, 128, 8, 'https://www.gsmarena.com/samsung_galaxy_a23-11373.php'),
('Galaxy A13', 'samsung-galaxy-a13', 'phone', 2022, 6.6, 'Exynos 850', 5000, 128, 6, 'https://www.gsmarena.com/samsung_galaxy_a13-11402.php'),
('Galaxy S22 Ultra 5G', 'samsung-galaxy-s22-ultra-5g', 'phone', 2022, 6.8, 'Exynos 2200', 5000, 1024, 12, 'https://www.gsmarena.com/samsung_galaxy_s22_ultra_5g-11251.php'),
('Galaxy S22+ 5G', 'samsung-galaxy-s22-plus-5g', 'phone', 2022, 6.6, 'Exynos 2200', 4500, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_s22+_5g-11252.php'),
('Galaxy S22 5G', 'samsung-galaxy-s22-5g', 'phone', 2022, 6.1, 'Exynos 2200', 3700, 256, 8, 'https://www.gsmarena.com/samsung_galaxy_s22_5g-11253.php'),
('Galaxy Tab S8 Ultra', 'samsung-galaxy-tab-s8-ultra', 'tablet', 2022, 14.6, 'Snapdragon 8 Gen 1', 11200, 512, 16, 'https://www.gsmarena.com/samsung_galaxy_tab_s8_ultra-11274.php'),
('Galaxy Tab S8+', 'samsung-galaxy-tab-s8-plus', 'tablet', 2022, 12.4, 'Snapdragon 8 Gen 1', 10090, 512, 16, 'https://www.gsmarena.com/samsung_galaxy_tab_s8+-11342.php');

INSERT INTO public.device_models
  (brand_id, name, slug, category, launch_year, source_url, source_site, verified, verified_at, status)
SELECT
  brands.id, devices.model_name, devices.model_slug, devices.category,
  devices.launch_year, devices.source_url, 'GSMArena', true, now(), 'active'
FROM _samsung_devices_2022_2023 devices
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
SELECT models.id, concat(devices.storage_gb, 'GB'), concat(devices.ram_gb, 'GB'), 'NP', 'active'
FROM _samsung_devices_2022_2023 devices
JOIN public.device_models models ON models.slug = devices.model_slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.device_variants existing
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
FROM _samsung_devices_2022_2023 devices
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
