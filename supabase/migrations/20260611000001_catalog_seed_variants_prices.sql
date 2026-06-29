-- =============================================
-- VARIANTS + PRICES SEED — 2026-06-11
-- Uses temp table for bulk insert
-- col: model_slug, ram, storage, price (current), old_price (MRP if discounted)
-- regular_price = old_price ?? price; sale_price = price when old_price set
-- =============================================

CREATE TEMP TABLE _sv (
  model_slug TEXT,
  ram        TEXT,      -- NULL for iPhone (no RAM on label)
  storage    TEXT,
  price      INTEGER,   -- current effective price
  old_price  INTEGER    -- original MRP; NULL = no discount
) ON COMMIT DROP;

INSERT INTO _sv (model_slug, ram, storage, price, old_price) VALUES
-- ── Samsung ──────────────────────────────────────────────────────
('samsung-galaxy-a07',       '4GB',  '64GB',  18999, NULL),
('samsung-galaxy-a07',       '4GB',  '128GB', 22499, NULL),
('samsung-galaxy-a07',       '6GB',  '128GB', 26499, NULL),
('samsung-galaxy-m17',       '6GB',  '128GB', 32999, NULL),
('samsung-galaxy-a17',       '6GB',  '128GB', 33999, NULL),
('samsung-galaxy-a17',       '8GB',  '128GB', 36999, NULL),
('samsung-galaxy-a17',       '8GB',  '256GB', 44999, NULL),
('samsung-galaxy-a37',       '8GB',  '128GB', 59999, NULL),
('samsung-galaxy-a37',       '8GB',  '256GB', 67999, NULL),
('samsung-galaxy-a37',       '12GB', '256GB', 74999, NULL),
('samsung-galaxy-a57',       '8GB',  '256GB', 79999,  84999),
('samsung-galaxy-a57',       '12GB', '256GB', 84999,  89999),
('samsung-galaxy-s25-fe',    '8GB',  '256GB', 107999, NULL),
('samsung-galaxy-s25-ultra', '12GB', '256GB', 184999, NULL),
('samsung-galaxy-s26',       '12GB', '256GB', 123999, NULL),
('samsung-galaxy-s26-plus',  '12GB', '256GB', 159999, 182999),
('samsung-galaxy-s26-ultra', '12GB', '256GB', 202999, 212999),
('samsung-galaxy-s26-ultra', '12GB', '512GB', 232999, NULL),  -- price increase, no sale
('samsung-galaxy-s26-ultra', '16GB', '1TB',   283999, 293999),
('samsung-galaxy-z-flip-7',  '12GB', '256GB', 154999, NULL),
('samsung-galaxy-z-fold-7',  '12GB', '256GB', 244999, NULL),
('samsung-galaxy-z-fold-7',  '12GB', '512GB', 259999, NULL),

-- ── Apple (no RAM label) ─────────────────────────────────────────
('apple-iphone-15',          NULL,   '128GB', 119499, 127499),
('apple-iphone-16e',         NULL,   '128GB', 105999, NULL),
('apple-iphone-16',          NULL,   '128GB', 146599, NULL),
('apple-iphone-17e',         NULL,   '256GB', 132499, NULL),
('apple-iphone-17e',         NULL,   '512GB', 175099, NULL),
('apple-iphone-17',          NULL,   '256GB', 165499, 173499),
('apple-iphone-17',          NULL,   '512GB', 215699, NULL),
('apple-iphone-air',         NULL,   '256GB', 190699, NULL),
('apple-iphone-air',         NULL,   '512GB', 232899, NULL),
('apple-iphone-air',         NULL,   '1TB',   275099, NULL),
('apple-iphone-17-pro',      NULL,   '256GB', 236899, NULL),
('apple-iphone-17-pro',      NULL,   '512GB', 279099, NULL),
('apple-iphone-17-pro',      NULL,   '1TB',   321299, NULL),
('apple-iphone-17-pro-max',  NULL,   '256GB', 247999, 257999),
('apple-iphone-17-pro-max',  NULL,   '512GB', 300199, NULL),
('apple-iphone-17-pro-max',  NULL,   '1TB',   342499, NULL),
('apple-iphone-17-pro-max',  NULL,   '2TB',   426999, NULL),

-- ── Xiaomi / Redmi ───────────────────────────────────────────────
('xiaomi-redmi-a5',                '3GB',  '64GB',  14999, NULL),
('xiaomi-redmi-a5',                '4GB',  '128GB', 16999, NULL),
('xiaomi-redmi-a7',                '3GB',  '64GB',  15999, NULL),
('xiaomi-redmi-a7-pro',            '4GB',  '64GB',  17999, NULL),
('xiaomi-redmi-15c',               '4GB',  '128GB', 19999, NULL),
('xiaomi-redmi-15c',               '6GB',  '128GB', 21999, NULL),
('xiaomi-redmi-15c',               '8GB',  '256GB', 24999, NULL),
('xiaomi-redmi-15',                '6GB',  '128GB', 24999, NULL),
('xiaomi-redmi-15',                '8GB',  '256GB', 27999, NULL),
('xiaomi-redmi-note-15-4g',        '6GB',  '128GB', 33999, NULL),
('xiaomi-redmi-note-15-4g',        '8GB',  '256GB', 39999, NULL),
('xiaomi-redmi-note-15-5g',        '8GB',  '256GB', 43999, NULL),
('xiaomi-redmi-note-15-5g',        '12GB', '512GB', 49999, NULL),
('xiaomi-redmi-note-15-pro-5g',    '8GB',  '256GB', 53999, NULL),
('xiaomi-redmi-note-15-pro-5g',    '12GB', '512GB', 59999, NULL),
('xiaomi-redmi-note-15-pro-plus',  '8GB',  '256GB', 63999, NULL),
('xiaomi-redmi-note-15-pro-plus',  '12GB', '512GB', 69999, NULL),
('xiaomi-17t',                     '12GB', '512GB', 89999, NULL),
('xiaomi-17-ultra',                '16GB', '512GB', 199999,NULL),

-- ── POCO ─────────────────────────────────────────────────────────
('poco-x7-pro',     '12GB', '512GB', 59999, NULL),
('poco-x8-pro',     '8GB',  '256GB', 63999, NULL),
('poco-x8-pro',     '12GB', '256GB', 73999, NULL),
('poco-f7',         '12GB', '512GB', 69999, NULL),
('poco-x8-pro-max', '12GB', '256GB', 79999, NULL),
('poco-x8-pro-max', '12GB', '512GB', 89999, NULL),
('poco-f8-pro',     '12GB', '512GB', 99999, NULL),

-- ── Honor ────────────────────────────────────────────────────────
('honor-play10',     '3GB',  '64GB',  17499, NULL),
('honor-play10',     '4GB',  '128GB', 19999, NULL),
('honor-x5c',        '4GB',  '64GB',  20499, NULL),
('honor-x5c-plus',   '4GB',  '128GB', 22499, NULL),
('honor-x6c',        '6GB',  '128GB', 23499, NULL),
('honor-x6c',        '6GB',  '256GB', 25499, NULL),
('honor-x7d',        '8GB',  '256GB', 33999, NULL),
('honor-x7d',        '8GB',  '512GB', 37999, NULL),
('honor-x8d',        '8GB',  '128GB', 39999, NULL),
('honor-x8d',        '8GB',  '256GB', 43999, NULL),
('honor-x9d',        '8GB',  '256GB', 54999, NULL),
('honor-x9d',        '12GB', '256GB', 59999, NULL),
('honor-600-lite',   '8GB',  '256GB', 59999, NULL),
('honor-600',        '8GB',  '256GB', 84999, NULL),
('honor-600',        '12GB', '256GB', 89999, NULL),
('honor-600-pro',    '12GB', '256GB', 129999,NULL),
('honor-magic-8-pro','12GB', '512GB', 199999,NULL),
('honor-magic-v5',   '16GB', '512GB', 266999,NULL),

-- ── Vivo ─────────────────────────────────────────────────────────
('vivo-y05',         '4GB',  '64GB',  21999, NULL),
('vivo-y05',         '4GB',  '128GB', 24999, NULL),
('vivo-y11d',        '4GB',  '128GB', 27999, NULL),
('vivo-y11d',        '6GB',  '128GB', 33999, NULL),
('vivo-y31d',        '6GB',  '128GB', 37999, NULL),
('vivo-y31d',        '8GB',  '128GB', 43999, NULL),
('vivo-y31d',        '8GB',  '256GB', 51999, NULL),
('vivo-y21-5g',      '6GB',  '128GB', 40999, NULL),
('vivo-v60-lite-4g', '8GB',  '256GB', 43499, NULL),
('vivo-v60-lite-5g', '12GB', '256GB', 51999, NULL),
('vivo-v70-fe',      '8GB',  '256GB', 62999, NULL),
('vivo-v70-fe',      '12GB', '256GB', 72999, NULL),
('vivo-v60-5g',      '12GB', '256GB', 74999, NULL),
('vivo-v60-5g',      '12GB', '512GB', 79999, NULL),
('vivo-v70-5g',      '12GB', '256GB', 102999,NULL),
('vivo-v70-5g',      '12GB', '512GB', 122999,NULL),
('vivo-x300-pro',    '16GB', '512GB', 179999,NULL),

-- ── Nothing / CMF ────────────────────────────────────────────────
('nothing-cmf-phone-2-pro', '8GB',  '128GB', 38999, NULL),
('nothing-cmf-phone-2-pro', '8GB',  '256GB', 44999, NULL),
('nothing-phone-3a-lite',   '8GB',  '128GB', 40999, NULL),
('nothing-phone-3a-lite',   '8GB',  '256GB', 45999, NULL),
('nothing-phone-2a-plus',   '8GB',  '256GB', 49999, NULL),
('nothing-phone-2a-plus',   '12GB', '256GB', 57499, NULL),
('nothing-phone-4a',         '8GB',  '128GB', 59999, NULL),
('nothing-phone-4a',         '8GB',  '256GB', 65499, NULL),
('nothing-phone-4a',         '12GB', '256GB', 70999, NULL),
('nothing-phone-4a-pro',     '12GB', '256GB', 86999, NULL),
('nothing-phone-3',          '12GB', '256GB', 99999, NULL),
('nothing-phone-3',          '16GB', '512GB', 114999,NULL),

-- ── OnePlus ──────────────────────────────────────────────────────
('oneplus-nord-ce-5', '8GB',  '256GB', 53999, NULL),
('oneplus-nord-5',    '8GB',  '256GB', 73999, NULL),
('oneplus-nord-5',    '12GB', '512GB', 79999, NULL),
('oneplus-13r',       '12GB', '256GB', 83999, NULL),
('oneplus-15r',       '12GB', '256GB', 98499, NULL),
('oneplus-15r',       '12GB', '512GB', 106999,NULL),
('oneplus-15',        '16GB', '512GB', 169999,NULL),

-- ── Realme ───────────────────────────────────────────────────────
('realme-note-60x',            '3GB',  '64GB',  15999, NULL),
('realme-note-60x',            '4GB',  '64GB',  16999, NULL),
('realme-note-60x',            '4GB',  '128GB', 19999, NULL),
('realme-note-70',             '4GB',  '64GB',  15499, NULL),
('realme-note-70',             '4GB',  '128GB', 20999, NULL),
('realme-note-70',             '6GB',  '128GB', 23999, NULL),
('realme-c71',                 '4GB',  '128GB', 20999, NULL),
('realme-c71',                 '6GB',  '128GB', 25999, NULL),
('realme-c75',                 '8GB',  '128GB', 24999, NULL),
('realme-c75',                 '8GB',  '256GB', 26999, NULL),
('realme-c85',                 '8GB',  '256GB', 39999, NULL),
('realme-c85-pro',             '8GB',  '128GB', 36999, NULL),
('realme-14t',                 '8GB',  '256GB', 36999, NULL),
('realme-15t',                 '8GB',  '256GB', 39999, NULL),
('realme-15t',                 '12GB', '512GB', 49999, NULL),
('realme-14',                  '12GB', '256GB', 49999, NULL),
('realme-15-pro',              '12GB', '256GB', 66999, NULL),
('realme-15-pro',              '12GB', '512GB', 71999, NULL),
('realme-gt8-pro',             '16GB', '512GB', 149999,NULL),
('realme-gt8-pro-aston-martin','16GB', '512GB', 159999,NULL),

-- ── OPPO ─────────────────────────────────────────────────────────
('oppo-a5x-4g',    '4GB',  '64GB',  16999, NULL),
('oppo-a5x-4g',    '4GB',  '128GB', 19499, NULL),
('oppo-a5x-4g',    '6GB',  '128GB', 21999, NULL),
('oppo-a6c',       '4GB',  '64GB',  20999, NULL),
('oppo-a5-4g',     '6GB',  '128GB', 22999, NULL),
('oppo-a5-4g',     '8GB',  '128GB', 24999, NULL),
('oppo-a5-pro-4g', '8GB',  '256GB', 32999, NULL),
('oppo-a6x-4g',    '6GB',  '128GB', 32499, NULL),
('oppo-a6',        '8GB',  '128GB', 40999, NULL),
('oppo-a6',        '8GB',  '256GB', 42499, NULL),
('oppo-a6-pro-4g', '8GB',  '256GB', 48999, NULL),
('oppo-reno-14f',  '12GB', '512GB', 57999, NULL),
('oppo-reno-15f',  '12GB', '512GB', 69999, NULL),
('oppo-reno-15',   '12GB', '512GB', 89999, NULL),
('oppo-find-n5',   '16GB', '512GB', 249999,NULL),

-- ── Infinix ──────────────────────────────────────────────────────
('infinix-smart-10',      '4GB',  '64GB',  14999, NULL),
('infinix-smart-10-plus', '4GB',  '128GB', 15999, NULL),
('infinix-hot-60i',       '4GB',  '128GB', 16999, NULL),
('infinix-hot-60i',       '6GB',  '128GB', 18999, NULL),
('infinix-smart-20',      '4GB',  '64GB',  17999, NULL),
('infinix-smart-20',      '4GB',  '128GB', 19999, NULL),
('infinix-hot-70',        '6GB',  '128GB', 29999, NULL),
('infinix-hot-70',        '8GB',  '128GB', 32999, NULL),
('infinix-gt-30-pro',     '8GB',  '256GB', 47999, NULL),
('infinix-gt-30-pro',     '12GB', '256GB', 55999, NULL),
('infinix-note-edge',     '8GB',  '128GB', 41999, NULL),
('infinix-note-edge',     '8GB',  '256GB', 47999, NULL),
('infinix-note-60',       '8GB',  '128GB', 45999, NULL),
('infinix-note-60',       '8GB',  '256GB', 51999, NULL),
('infinix-note-60-pro',   '8GB',  '256GB', 59999, NULL),
('infinix-note-60-pro',   '12GB', '256GB', 66999, NULL),

-- ── Motorola ─────────────────────────────────────────────────────
('motorola-moto-g04s',          '4GB',  '64GB',  12599, NULL),
('motorola-moto-g05',           '4GB',  '64GB',  12499, NULL),
('motorola-moto-g06-power',     '4GB',  '64GB',  18999, NULL),
('motorola-moto-g35',           '4GB',  '128GB', 19999, NULL),
('motorola-moto-g45',           '8GB',  '128GB', 24999, NULL),
('motorola-moto-g64',           '8GB',  '128GB', 27499, NULL),
('motorola-moto-g64',           '12GB', '256GB', 30999, NULL),
('motorola-moto-g57-power',     '8GB',  '128GB', 37499, NULL),
('motorola-moto-g85',           '8GB',  '128GB', 34499, NULL),
('motorola-moto-g85',           '12GB', '256GB', 37499, NULL),
('motorola-moto-g96',           '8GB',  '256GB', 44999, NULL),
('motorola-moto-edge-50-fusion','12GB', '256GB', 46999, NULL),

-- ── ZTE / Nubia / RedMagic ───────────────────────────────────────
('zte-blade-a35e',       '2GB',  '64GB',  10499, NULL),
('zte-blade-a55',        '4GB',  '64GB',  11999, NULL),
('zte-blade-a55',        '4GB',  '128GB', 12999, NULL),
('zte-blade-a75',        '4GB',  '256GB', 13999, NULL),
('zte-nubia-a36',        '4GB',  '64GB',  15999, NULL),
('zte-nubia-a56',        '4GB',  '128GB', 16999, NULL),
('zte-nubia-v70-max',    '6GB',  '128GB', 15999, NULL),
('zte-nubia-v70',        '8GB',  '128GB', 16999, NULL),
('zte-nubia-v70',        '8GB',  '256GB', 18999, NULL),
('zte-nubia-v80-max',    '8GB',  '128GB', 23999, NULL),
('zte-nubia-v80-max',    '8GB',  '256GB', 26999, NULL),
('zte-nubia-v80-design', '8GB',  '128GB', 24999, NULL),
('zte-nubia-v80-design', '8GB',  '256GB', 27999, NULL),
('zte-nubia-air',        '8GB',  '256GB', 33999, NULL),
('zte-nubia-neo-3-gt',   '12GB', '256GB', 36999, NULL),
('zte-redmagic-11-pro',  '16GB', '512GB', 164999,NULL),

-- ── Ai+ ──────────────────────────────────────────────────────────
('aiplus-pulse',    '4GB', '64GB',  14999, NULL),
('aiplus-pulse',    '6GB', '128GB', 16499, NULL),
('aiplus-nova-5g',  '6GB', '128GB', 18499, NULL),
('aiplus-nova-5g',  '8GB', '128GB', 21999, NULL),

-- ── Tecno ────────────────────────────────────────────────────────
('tecno-spark-go-2',      '3GB',  '64GB',  11499, NULL),
('tecno-spark-go-2',      '4GB',  '64GB',  13499, NULL),
('tecno-spark-go-2',      '4GB',  '128GB', 14499, NULL),
('tecno-spark-go-3',      '4GB',  '64GB',  18999, NULL),
('tecno-spark-go-3',      '4GB',  '128GB', 19999, NULL),
('tecno-spark-30c',       '6GB',  '128GB', 16490, NULL),
('tecno-spark-30c',       '8GB',  '256GB', 19990, NULL),
('tecno-spark-30',        '8GB',  '256GB', 22490, NULL),
('tecno-spark-40',        '6GB',  '128GB', 18999, NULL),
('tecno-spark-40',        '8GB',  '256GB', 24999, NULL),
('tecno-spark-50',        '6GB',  '128GB', 26999, NULL),
('tecno-spark-40-pro',    '8GB',  '256GB', 31799, NULL),
('tecno-pova-6',          '12GB', '256GB', 34990, NULL),
('tecno-pova-curve-2-5g', '8GB',  '256GB', 52999, NULL),

-- ── Itel ─────────────────────────────────────────────────────────
('itel-a05s', '2GB', '32GB',  9790,  NULL),
('itel-a50c', '2GB', '32GB',  9890,  NULL),
('itel-a50',  '3GB', '64GB',  10990, NULL),
('itel-a50',  '4GB', '64GB',  11790, NULL),
('itel-a70',  '4GB', '64GB',  11810, NULL),
('itel-a80',  '4GB', '128GB', 12990, NULL),
('itel-p55',  '4GB', '128GB', 12490, NULL),
('itel-p55',  '8GB', '128GB', 14490, NULL),

-- ── Coolpad ──────────────────────────────────────────────────────
('coolpad-12-neo-plus', '3GB', '64GB',  13999, NULL),
('coolpad-12-neo-plus', '3GB', '128GB', 14499, NULL),
('coolpad-12-neo',      '4GB', '64GB',  10999, NULL),
('coolpad-12-neo',      '4GB', '128GB', 11999, NULL),
('coolpad-c16',         '4GB', '128GB', 13999, NULL),
('coolpad-c15',         '6GB', '256GB', 16999, NULL),
('coolpad-x100',        '8GB', '256GB', 23999, NULL),

-- ── Benco ────────────────────────────────────────────────────────
('benco-v90i-se',  '3GB', '64GB',  10499, NULL),
('benco-v90-plus', '4GB', '64GB',  11299, NULL),
('benco-v90-plus', '4GB', '128GB', 11599, NULL),
('benco-v91c',     '4GB', '128GB', 12999, NULL),
('benco-v91',      '4GB', '128GB', 13599, NULL),
('benco-v91',      '8GB', '128GB', 14399, NULL),
('benco-v91-plus', '6GB', '128GB', 14999, NULL),
('benco-v91-plus', '8GB', '256GB', 17999, NULL),
('benco-v92',      '6GB', '256GB', 16999, NULL),
('benco-s1',       '6GB', '128GB', 13999, NULL),
('benco-s1',       '8GB', '128GB', 14999, NULL),
('benco-s1-pro',   '8GB', '128GB', 18999, NULL),
('benco-s1-pro',   '8GB', '256GB', 19999, NULL),
('benco-s1-plus',  '8GB', '256GB', 19999, NULL);

-- ── Bulk insert phone_variants ────────────────────────────────────
INSERT INTO phone_variants (model_id, ram, storage, condition_type, status)
SELECT pm.id, sv.ram, sv.storage, 'new', 'active'
FROM _sv sv
JOIN phone_models pm ON pm.slug = sv.model_slug
ON CONFLICT (model_id, ram, storage, condition_type) DO NOTHING;

-- ── Bulk insert phone_variant_prices ─────────────────────────────
-- regular_price = old_price if discounted, else price
-- sale_price    = price     if discounted, else NULL
INSERT INTO phone_variant_prices
  (model_id, variant_id, regular_price, sale_price, currency, stock_status, is_default, sort_order)
SELECT
  pm.id,
  pv.id,
  COALESCE(sv.old_price, sv.price)                                          AS regular_price,
  CASE WHEN sv.old_price IS NOT NULL THEN sv.price ELSE NULL END            AS sale_price,
  'NPR',
  'in_stock',
  true,
  0
FROM _sv sv
JOIN phone_models pm  ON pm.slug     = sv.model_slug
JOIN phone_variants pv ON pv.model_id = pm.id
  AND pv.ram           IS NOT DISTINCT FROM sv.ram
  AND pv.storage       = sv.storage
  AND pv.condition_type = 'new'
WHERE NOT EXISTS (
  SELECT 1 FROM phone_variant_prices pvp
  WHERE pvp.variant_id = pv.id AND pvp.is_default = true
);
