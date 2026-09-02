-- =============================================
-- CATALOG SEED — ALL BRANDS / MODELS / VARIANTS / PRICES / EXCHANGE
-- 2026-06-11
-- Source: Nepal retail price list (June 2026)
-- =============================================

-- ── 1. Idempotent unique constraints ─────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'uq_pv_model_ram_storage_cond'
    AND conrelid = 'phone_variants'::regclass
  ) THEN
    ALTER TABLE phone_variants
    ADD CONSTRAINT uq_pv_model_ram_storage_cond
    UNIQUE (model_id, ram, storage, condition_type);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'uq_exchange_model_variant_grade'
    AND conrelid = 'exchange_values'::regclass
  ) THEN
    ALTER TABLE exchange_values
    ADD CONSTRAINT uq_exchange_model_variant_grade
    UNIQUE (model_id, variant_id, condition_grade);
  END IF;
END $$;

-- ── 2. Brands ────────────────────────────────────────────────────

INSERT INTO brands (name, slug, status, country) VALUES
  ('Samsung',  'samsung',  'active', 'South Korea'),
  ('Apple',    'apple',    'active', 'United States'),
  ('Xiaomi',   'xiaomi',   'active', 'China'),
  ('POCO',     'poco',     'active', 'China'),
  ('Honor',    'honor',    'active', 'China'),
  ('Vivo',     'vivo',     'active', 'China'),
  ('Nothing',  'nothing',  'active', 'United Kingdom'),
  ('OnePlus',  'oneplus',  'active', 'China'),
  ('Realme',   'realme',   'active', 'China'),
  ('OPPO',     'oppo',     'active', 'China'),
  ('Infinix',  'infinix',  'active', 'Hong Kong'),
  ('Motorola', 'motorola', 'active', 'United States'),
  ('ZTE',      'zte',      'active', 'China'),
  ('Tecno',    'tecno',    'active', 'Hong Kong'),
  ('Google',   'google',   'active', 'United States'),
  ('Nokia',    'nokia',    'active', 'Finland'),
  ('Huawei',   'huawei',   'active', 'China'),
  ('Sony',     'sony',     'active', 'Japan'),
  ('Asus',     'asus',     'active', 'Taiwan'),
  ('Lenovo',   'lenovo',   'active', 'China'),
  ('Dell',     'dell',     'active', 'United States')
ON CONFLICT (slug) DO NOTHING;

-- ── 3. Models ────────────────────────────────────────────────────

-- Samsung
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Galaxy A07',       'samsung-galaxy-a07'),
  ('Galaxy M17',       'samsung-galaxy-m17'),
  ('Galaxy A17',       'samsung-galaxy-a17'),
  ('Galaxy A37',       'samsung-galaxy-a37'),
  ('Galaxy A57',       'samsung-galaxy-a57'),
  ('Galaxy S25 FE',    'samsung-galaxy-s25-fe'),
  ('Galaxy S25 Ultra', 'samsung-galaxy-s25-ultra'),
  ('Galaxy S26',       'samsung-galaxy-s26'),
  ('Galaxy S26+',      'samsung-galaxy-s26-plus'),
  ('Galaxy S26 Ultra', 'samsung-galaxy-s26-ultra'),
  ('Galaxy Z Flip 7',  'samsung-galaxy-z-flip-7'),
  ('Galaxy Z Fold 7',  'samsung-galaxy-z-fold-7')
) AS m(name, slug)
WHERE b.slug = 'samsung'
ON CONFLICT (slug) DO NOTHING;

-- Apple
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('iPhone 15',         'apple-iphone-15'),
  ('iPhone 16e',        'apple-iphone-16e'),
  ('iPhone 16',         'apple-iphone-16'),
  ('iPhone 17e',        'apple-iphone-17e'),
  ('iPhone 17',         'apple-iphone-17'),
  ('iPhone Air',        'apple-iphone-air'),
  ('iPhone 17 Pro',     'apple-iphone-17-pro'),
  ('iPhone 17 Pro Max', 'apple-iphone-17-pro-max')
) AS m(name, slug)
WHERE b.slug = 'apple'
ON CONFLICT (slug) DO NOTHING;

-- Xiaomi / Redmi
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Redmi A5',                 'xiaomi-redmi-a5'),
  ('Redmi A7',                 'xiaomi-redmi-a7'),
  ('Redmi A7 Pro',             'xiaomi-redmi-a7-pro'),
  ('Redmi 15C',                'xiaomi-redmi-15c'),
  ('Redmi 15',                 'xiaomi-redmi-15'),
  ('Redmi Note 15 4G',         'xiaomi-redmi-note-15-4g'),
  ('Redmi Note 15 5G',         'xiaomi-redmi-note-15-5g'),
  ('Redmi Note 15 Pro 5G',     'xiaomi-redmi-note-15-pro-5g'),
  ('Redmi Note 15 Pro+',       'xiaomi-redmi-note-15-pro-plus'),
  ('Xiaomi 17T',               'xiaomi-17t'),
  ('Xiaomi 17 Ultra',          'xiaomi-17-ultra')
) AS m(name, slug)
WHERE b.slug = 'xiaomi'
ON CONFLICT (slug) DO NOTHING;

-- POCO
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('POCO X7 Pro',    'poco-x7-pro'),
  ('POCO X8 Pro',    'poco-x8-pro'),
  ('POCO F7',        'poco-f7'),
  ('POCO X8 Pro Max','poco-x8-pro-max'),
  ('POCO F8 Pro',    'poco-f8-pro')
) AS m(name, slug)
WHERE b.slug = 'poco'
ON CONFLICT (slug) DO NOTHING;

-- Honor
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Honor Play10',    'honor-play10'),
  ('Honor X5c',       'honor-x5c'),
  ('Honor X5c Plus',  'honor-x5c-plus'),
  ('Honor X6c',       'honor-x6c'),
  ('Honor X7d',       'honor-x7d'),
  ('Honor X8d',       'honor-x8d'),
  ('Honor X9d',       'honor-x9d'),
  ('Honor 600 Lite',  'honor-600-lite'),
  ('Honor 600',       'honor-600'),
  ('Honor 600 Pro',   'honor-600-pro'),
  ('Honor Magic 8 Pro','honor-magic-8-pro'),
  ('Honor Magic V5',  'honor-magic-v5')
) AS m(name, slug)
WHERE b.slug = 'honor'
ON CONFLICT (slug) DO NOTHING;

-- Vivo
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Vivo Y05',         'vivo-y05'),
  ('Vivo Y11d',        'vivo-y11d'),
  ('Vivo Y31d',        'vivo-y31d'),
  ('Vivo Y21 5G',      'vivo-y21-5g'),
  ('Vivo V60 Lite 4G', 'vivo-v60-lite-4g'),
  ('Vivo V60 Lite 5G', 'vivo-v60-lite-5g'),
  ('Vivo V70 FE',      'vivo-v70-fe'),
  ('Vivo V60 5G',      'vivo-v60-5g'),
  ('Vivo V70 5G',      'vivo-v70-5g'),
  ('Vivo X300 Pro',    'vivo-x300-pro')
) AS m(name, slug)
WHERE b.slug = 'vivo'
ON CONFLICT (slug) DO NOTHING;

-- Nothing / CMF
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('CMF Phone 2 Pro',  'nothing-cmf-phone-2-pro'),
  ('Phone (3a) Lite',  'nothing-phone-3a-lite'),
  ('Phone (2a) Plus',  'nothing-phone-2a-plus'),
  ('Phone (4a)',        'nothing-phone-4a'),
  ('Phone (4a) Pro',   'nothing-phone-4a-pro'),
  ('Phone (3)',         'nothing-phone-3')
) AS m(name, slug)
WHERE b.slug = 'nothing'
ON CONFLICT (slug) DO NOTHING;

-- OnePlus
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Nord CE 5',   'oneplus-nord-ce-5'),
  ('Nord 5',      'oneplus-nord-5'),
  ('OnePlus 13R', 'oneplus-13r'),
  ('OnePlus 15R', 'oneplus-15r'),
  ('OnePlus 15',  'oneplus-15')
) AS m(name, slug)
WHERE b.slug = 'oneplus'
ON CONFLICT (slug) DO NOTHING;

-- Realme
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Note 60x',                      'realme-note-60x'),
  ('Note 70',                       'realme-note-70'),
  ('Realme C71',                    'realme-c71'),
  ('Realme C75',                    'realme-c75'),
  ('Realme C85',                    'realme-c85'),
  ('Realme C85 Pro',                'realme-c85-pro'),
  ('Realme 14T',                    'realme-14t'),
  ('Realme 15T',                    'realme-15t'),
  ('Realme 14',                     'realme-14'),
  ('Realme 15 Pro',                 'realme-15-pro'),
  ('Realme GT8 Pro',                'realme-gt8-pro'),
  ('Realme GT8 Pro Aston Martin',   'realme-gt8-pro-aston-martin')
) AS m(name, slug)
WHERE b.slug = 'realme'
ON CONFLICT (slug) DO NOTHING;

-- OPPO
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('OPPO A5x 4G',   'oppo-a5x-4g'),
  ('OPPO A6c',      'oppo-a6c'),
  ('OPPO A5 4G',    'oppo-a5-4g'),
  ('OPPO A5 Pro 4G','oppo-a5-pro-4g'),
  ('OPPO A6X 4G',   'oppo-a6x-4g'),
  ('OPPO A6',       'oppo-a6'),
  ('OPPO A6 Pro 4G','oppo-a6-pro-4g'),
  ('OPPO Reno 14F', 'oppo-reno-14f'),
  ('OPPO Reno 15 F','oppo-reno-15f'),
  ('OPPO Reno 15',  'oppo-reno-15'),
  ('OPPO Find N5',  'oppo-find-n5')
) AS m(name, slug)
WHERE b.slug = 'oppo'
ON CONFLICT (slug) DO NOTHING;

-- Infinix
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Infinix Smart 10',      'infinix-smart-10'),
  ('Infinix Smart 10 Plus', 'infinix-smart-10-plus'),
  ('Infinix Hot 60i',       'infinix-hot-60i'),
  ('Infinix Smart 20',      'infinix-smart-20'),
  ('Infinix Hot 70',        'infinix-hot-70'),
  ('Infinix GT 30 Pro',     'infinix-gt-30-pro'),
  ('Infinix Note Edge',     'infinix-note-edge'),
  ('Infinix Note 60',       'infinix-note-60'),
  ('Infinix Note 60 Pro',   'infinix-note-60-pro')
) AS m(name, slug)
WHERE b.slug = 'infinix'
ON CONFLICT (slug) DO NOTHING;

-- Motorola
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Moto G04s',         'motorola-moto-g04s'),
  ('Moto G05',          'motorola-moto-g05'),
  ('Moto G06 Power',    'motorola-moto-g06-power'),
  ('Moto G35',          'motorola-moto-g35'),
  ('Moto G45',          'motorola-moto-g45'),
  ('Moto G64',          'motorola-moto-g64'),
  ('Moto G57 Power',    'motorola-moto-g57-power'),
  ('Moto G85',          'motorola-moto-g85'),
  ('Moto G96',          'motorola-moto-g96'),
  ('Moto Edge 50 Fusion','motorola-moto-edge-50-fusion')
) AS m(name, slug)
WHERE b.slug = 'motorola'
ON CONFLICT (slug) DO NOTHING;

-- ZTE / Nubia / RedMagic
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Blade A35e',      'zte-blade-a35e'),
  ('Blade A55',       'zte-blade-a55'),
  ('Blade A75',       'zte-blade-a75'),
  ('Nubia A36',       'zte-nubia-a36'),
  ('Nubia A56',       'zte-nubia-a56'),
  ('Nubia V70 Max',   'zte-nubia-v70-max'),
  ('Nubia V70',       'zte-nubia-v70'),
  ('Nubia V80 Max',   'zte-nubia-v80-max'),
  ('Nubia V80 Design','zte-nubia-v80-design'),
  ('Nubia Air',       'zte-nubia-air'),
  ('Nubia Neo 3 GT',  'zte-nubia-neo-3-gt'),
  ('RedMagic 11 Pro', 'zte-redmagic-11-pro')
) AS m(name, slug)
WHERE b.slug = 'zte'
ON CONFLICT (slug) DO NOTHING;

-- Tecno
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Spark Go 2',       'tecno-spark-go-2'),
  ('Spark Go 3',       'tecno-spark-go-3'),
  ('Spark 30C',        'tecno-spark-30c'),
  ('Spark 30',         'tecno-spark-30'),
  ('Spark 40',         'tecno-spark-40'),
  ('Spark 50',         'tecno-spark-50'),
  ('Spark 40 Pro',     'tecno-spark-40-pro'),
  ('Pova 6',           'tecno-pova-6'),
  ('Pova Curve 2 5G',  'tecno-pova-curve-2-5g')
) AS m(name, slug)
WHERE b.slug = 'tecno'
ON CONFLICT (slug) DO NOTHING;

-- Google
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Pixel 8a',         'google-pixel-8a'),
  ('Pixel 9',          'google-pixel-9'),
  ('Pixel 9 Pro',      'google-pixel-9-pro'),
  ('Pixel 9 Pro XL',   'google-pixel-9-pro-xl'),
  ('Pixel 9 Pro Fold', 'google-pixel-9-pro-fold')
) AS m(name, slug)
WHERE b.slug = 'google'
ON CONFLICT (slug) DO NOTHING;

-- Nokia
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Nokia C12',         'nokia-c12'),
  ('Nokia C32',         'nokia-c32'),
  ('Nokia G22',         'nokia-g22'),
  ('Nokia G42 5G',      'nokia-g42-5g'),
  ('Nokia X30 5G',      'nokia-x30-5g'),
  ('Nokia XR21',        'nokia-xr21'),
  ('Nokia G400 5G',     'nokia-g400-5g')
) AS m(name, slug)
WHERE b.slug = 'nokia'
ON CONFLICT (slug) DO NOTHING;

-- Huawei
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Huawei Nova 12',          'huawei-nova-12'),
  ('Huawei Nova 12 Pro',      'huawei-nova-12-pro'),
  ('Huawei P60 Pro',          'huawei-p60-pro'),
  ('Huawei Pura 70 Ultra',    'huawei-pura-70-ultra'),
  ('Huawei Mate 60 Pro',      'huawei-mate-60-pro'),
  ('Huawei Mate X5',          'huawei-mate-x5'),
  ('Huawei Pocket 2',         'huawei-pocket-2')
) AS m(name, slug)
WHERE b.slug = 'huawei'
ON CONFLICT (slug) DO NOTHING;

-- Sony
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Xperia 10 VI',     'sony-xperia-10-vi'),
  ('Xperia 5 V',       'sony-xperia-5-v'),
  ('Xperia 1 VI',      'sony-xperia-1-vi'),
  ('Xperia Pro-I',     'sony-xperia-pro-i')
) AS m(name, slug)
WHERE b.slug = 'sony'
ON CONFLICT (slug) DO NOTHING;

-- Asus
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('Zenfone 11 Ultra',   'asus-zenfone-11-ultra'),
  ('ROG Phone 8',        'asus-rog-phone-8'),
  ('ROG Phone 8 Pro',    'asus-rog-phone-8-pro')
) AS m(name, slug)
WHERE b.slug = 'asus'
ON CONFLICT (slug) DO NOTHING;

-- Lenovo
INSERT INTO phone_models (brand_id, name, slug, status)
SELECT b.id, m.name, m.slug, 'active'
FROM brands b, (VALUES
  ('ThinkPhone',           'lenovo-thinkphone'),
  ('Legion Y70',           'lenovo-legion-y70'),
  ('Legion Phone Duel 2',  'lenovo-legion-phone-duel-2')
) AS m(name, slug)
WHERE b.slug = 'lenovo'
ON CONFLICT (slug) DO NOTHING;
