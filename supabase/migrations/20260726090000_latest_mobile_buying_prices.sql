-- Latest Nepal mobile buying-price catalog supplied 2026-07-26.
-- Idempotently adds newly listed models/variants and corrects changed prices.

CREATE TEMP TABLE _latest_mobile_prices (
  brand_slug TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_slug TEXT NOT NULL,
  ram TEXT,
  storage TEXT NOT NULL,
  price INTEGER NOT NULL,
  old_price INTEGER
) ON COMMIT DROP;

INSERT INTO _latest_mobile_prices
  (brand_slug, model_name, model_slug, ram, storage, price, old_price)
VALUES
-- Samsung: new A27 plus corrected/current promotional pricing.
('samsung', 'Galaxy A27', 'samsung-galaxy-a27', '6GB', '128GB', 51999, 55999),
('samsung', 'Galaxy A27', 'samsung-galaxy-a27', '8GB', '256GB', 65999, 69999),
('samsung', 'Galaxy A37', 'samsung-galaxy-a37', '8GB', '128GB', 61999, NULL),
('samsung', 'Galaxy A37', 'samsung-galaxy-a37', '8GB', '256GB', 69999, NULL),
('samsung', 'Galaxy A37', 'samsung-galaxy-a37', '12GB', '256GB', 77999, NULL),
('samsung', 'Galaxy S26', 'samsung-galaxy-s26', '12GB', '256GB', 123999, 133999),
('samsung', 'Galaxy Z Fold 7', 'samsung-galaxy-z-fold-7', '12GB', '256GB', 279999, NULL),

-- Apple.
('apple', 'iPhone 15', 'apple-iphone-15', NULL, '128GB', 127499, NULL),
('apple', 'iPhone 17', 'apple-iphone-17', NULL, '256GB', 173499, NULL),
('apple', 'iPhone 17 Pro Max', 'apple-iphone-17-pro-max', NULL, '256GB', 257999, NULL),

-- Xiaomi / Redmi.
('xiaomi', 'Redmi A7', 'xiaomi-redmi-a7', '3GB', '64GB', 16999, NULL),
('xiaomi', 'Redmi A7 Pro', 'xiaomi-redmi-a7-pro', '4GB', '128GB', 22999, NULL),

-- POCO.
('poco', 'POCO M8s', 'poco-m8s', '6GB', '128GB', 37999, NULL),
('poco', 'POCO M8s', 'poco-m8s', '8GB', '256GB', 44999, NULL),
('poco', 'POCO M8 Pro', 'poco-m8-pro', '8GB', '256GB', 56999, NULL),

-- Vivo.
('vivo', 'Vivo Y500', 'vivo-y500', '8GB', '128GB', 54999, NULL),
('vivo', 'Vivo Y500', 'vivo-y500', '8GB', '256GB', 61999, NULL),
('vivo', 'Vivo V70 5G', 'vivo-v70-5g', '8GB', '256GB', 84999, NULL),

-- Nothing.
('nothing', 'Nothing Phone (4b)', 'nothing-phone-4b', '8GB', '128GB', 59999, NULL),
('nothing', 'Nothing Phone (4a)', 'nothing-phone-4a', '8GB', '128GB', 64999, NULL),
('nothing', 'Nothing Phone (4a)', 'nothing-phone-4a', '8GB', '256GB', 71999, NULL),
('nothing', 'Nothing Phone (4a)', 'nothing-phone-4a', '12GB', '256GB', 78999, NULL),
('nothing', 'Nothing Phone (4a) Pro', 'nothing-phone-4a-pro', '12GB', '256GB', 93999, NULL),
('nothing', 'Nothing Phone (3)', 'nothing-phone-3', '12GB', '256GB', 89999, 104999),
('nothing', 'Nothing Phone (3)', 'nothing-phone-3', '16GB', '512GB', 99999, 119999),

-- OnePlus.
('oneplus', 'OnePlus Nord 6', 'oneplus-nord-6', '8GB', '256GB', 89999, NULL),
('oneplus', 'OnePlus Nord 6', 'oneplus-nord-6', '12GB', '256GB', 100999, NULL),

-- Infinix.
('infinix', 'Infinix Smart 20', 'infinix-smart-20', '4GB', '64GB', 19999, NULL),
('infinix', 'Infinix Smart 20', 'infinix-smart-20', '4GB', '128GB', 21999, NULL),
('infinix', 'Infinix Hot 70', 'infinix-hot-70', '6GB', '128GB', 31999, NULL),
('infinix', 'Infinix Hot 70', 'infinix-hot-70', '8GB', '128GB', 34999, NULL),
('infinix', 'Infinix GT 30 Pro', 'infinix-gt-30-pro', '8GB', '256GB', 55999, NULL),
('infinix', 'Infinix GT 30 Pro', 'infinix-gt-30-pro', '12GB', '256GB', 59999, NULL),

-- Realme.
('realme', 'Realme Note 60x', 'realme-note-60x', '4GB', '128GB', 22999, NULL),
('realme', 'Realme Note 80', 'realme-note-80', '4GB', '64GB', 21999, NULL),
('realme', 'Realme C100i', 'realme-c100i', '4GB', '128GB', 28999, NULL),
('realme', 'Realme P3', 'realme-p3', '8GB', '256GB', 44999, NULL),
('realme', 'Realme P3 Ultra', 'realme-p3-ultra', '12GB', '256GB', 65999, NULL),

-- OPPO.
('oppo', 'OPPO A6c', 'oppo-a6c', '4GB', '64GB', 22999, NULL),
('oppo', 'OPPO A6c', 'oppo-a6c', '4GB', '128GB', 30999, NULL),
('oppo', 'OPPO A6X', 'oppo-a6x-4g', '6GB', '128GB', 32499, NULL),
('oppo', 'OPPO A6', 'oppo-a6', '8GB', '256GB', 43999, NULL),
('oppo', 'OPPO A6s Pro', 'oppo-a6s-pro', '8GB', '256GB', 56999, NULL),
('oppo', 'OPPO Reno 15F', 'oppo-reno-15f', '8GB', '256GB', 63999, NULL),

-- Motorola.
('motorola', 'Moto G05', 'motorola-moto-g05', '4GB', '64GB', 14499, NULL),

-- ZTE / Nubia.
('zte', 'Nubia Neo 5', 'zte-nubia-neo-5', '8GB', '256GB', 55999, NULL),
('zte', 'Nubia Neo 5 GT', 'zte-nubia-neo-5-gt', '12GB', '256GB', 77999, NULL),

-- Ai+.
('aiplus', 'Ai+ Pulse 2', 'aiplus-pulse-2', '4GB', '64GB', 16999, NULL),

-- Tecno.
('tecno', 'Spark 50', 'tecno-spark-50', '4GB', '128GB', 24999, NULL),
('tecno', 'Spark 40 Pro', 'tecno-spark-40-pro', '8GB', '256GB', 33999, NULL);

-- Ensure every referenced brand exists (normally created by the base catalog seed).
INSERT INTO public.brands (name, slug, status)
SELECT DISTINCT
  CASE brand_slug
    WHEN 'aiplus' THEN 'Ai+'
    WHEN 'oppo' THEN 'OPPO'
    WHEN 'poco' THEN 'POCO'
    ELSE initcap(brand_slug)
  END,
  brand_slug,
  'active'
FROM _latest_mobile_prices
ON CONFLICT (slug) DO UPDATE SET status = 'active';

-- Add missing canonical models while retaining existing model IDs and content.
INSERT INTO public.phone_models
  (brand_id, name, slug, release_year, status, market_status, search_keywords)
SELECT DISTINCT
  b.id,
  p.model_name,
  p.model_slug,
  2026,
  'active',
  'available',
  concat_ws(', ', p.model_name, b.name, 'mobile price Nepal', 'best buying price')
FROM _latest_mobile_prices p
JOIN public.brands b ON b.slug = p.brand_slug
ON CONFLICT (slug) DO UPDATE SET
  brand_id = EXCLUDED.brand_id,
  name = EXCLUDED.name,
  status = 'active',
  market_status = 'available',
  updated_at = now();

-- Add missing RAM/storage variants.
INSERT INTO public.phone_variants
  (model_id, ram, storage, condition_type, status)
SELECT pm.id, p.ram, p.storage, 'new', 'active'
FROM _latest_mobile_prices p
JOIN public.phone_models pm ON pm.slug = p.model_slug
ON CONFLICT (model_id, ram, storage, condition_type) DO UPDATE SET
  status = 'active',
  updated_at = now();

-- Correct an existing default price in-place. Discounts use old_price as MRP.
UPDATE public.phone_variant_prices current_price
SET
  regular_price = COALESCE(p.old_price, p.price),
  sale_price = CASE WHEN p.old_price IS NOT NULL THEN p.price ELSE NULL END,
  currency = 'NPR',
  stock_status = 'in_stock',
  updated_at = now()
FROM _latest_mobile_prices p
JOIN public.phone_models pm ON pm.slug = p.model_slug
JOIN public.phone_variants pv
  ON pv.model_id = pm.id
 AND pv.ram IS NOT DISTINCT FROM p.ram
 AND pv.storage = p.storage
 AND pv.condition_type = 'new'
WHERE current_price.variant_id = pv.id
  AND current_price.is_default = true;

-- Add a default price when the model/variant is new.
INSERT INTO public.phone_variant_prices
  (model_id, variant_id, regular_price, sale_price, currency, stock_status, is_default, sort_order)
SELECT
  pm.id,
  pv.id,
  COALESCE(p.old_price, p.price),
  CASE WHEN p.old_price IS NOT NULL THEN p.price ELSE NULL END,
  'NPR',
  'in_stock',
  true,
  0
FROM _latest_mobile_prices p
JOIN public.phone_models pm ON pm.slug = p.model_slug
JOIN public.phone_variants pv
  ON pv.model_id = pm.id
 AND pv.ram IS NOT DISTINCT FROM p.ram
 AND pv.storage = p.storage
 AND pv.condition_type = 'new'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.phone_variant_prices existing
  WHERE existing.variant_id = pv.id
    AND existing.is_default = true
);
