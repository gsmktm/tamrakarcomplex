-- ============================================================
-- Nepal Mobile Price Seed Data 2025-2026
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to re-run: ON CONFLICT updates prices in place
-- ============================================================

-- Step 1: Upsert brands
INSERT INTO public.brands (name, slug, logo_url, active, sort_order) VALUES
  ('Samsung',  'samsung',  'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg',        true, 1),
  ('Apple',    'apple',    'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',    true, 2),
  ('Xiaomi',   'xiaomi',   'https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg',    true, 3),
  ('POCO',     'poco',     'https://upload.wikimedia.org/wikipedia/commons/b/b5/POCO_Logo.svg',           true, 4),
  ('Honor',    'honor',    'https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg',          true, 5),
  ('Vivo',     'vivo',     'https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png',   true, 6),
  ('Nothing',  'nothing',  'https://upload.wikimedia.org/wikipedia/commons/e/e6/Nothing_Technology_logo.svg', true, 7),
  ('OnePlus',  'oneplus',  'https://upload.wikimedia.org/wikipedia/commons/f/f8/OnePlus_logo.svg',        true, 8),
  ('Realme',   'realme',   'https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg',         true, 9),
  ('OPPO',     'oppo',     'https://upload.wikimedia.org/wikipedia/commons/b/b8/OPPO_Logo.svg',           true, 10),
  ('Infinix',  'infinix',  'https://upload.wikimedia.org/wikipedia/commons/c/c2/Infinix_logo.svg',        true, 11),
  ('Motorola', 'motorola', 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg',  true, 12),
  ('ZTE',      'zte',      'https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg',       true, 13),
  ('Ai+',      'ai-plus',  null,                                                                           true, 14),
  ('Tecno',    'tecno',    'https://upload.wikimedia.org/wikipedia/commons/3/36/Tecno_Mobile_logo.svg',  true, 15),
  ('Itel',     'itel',     null,                                                                           true, 16),
  ('Coolpad',  'coolpad',  null,                                                                           true, 17),
  ('Benco',    'benco',    null,                                                                           true, 18)
ON CONFLICT (slug) DO UPDATE SET
  name     = EXCLUDED.name,
  logo_url = COALESCE(EXCLUDED.logo_url, brands.logo_url),
  active   = true,
  updated_at = now();

-- Step 2: Upsert catalog_products via JOIN on brand slug
-- Columns: name, slug, brand_id (joined), specs_json, price_npr, price_text
INSERT INTO public.catalog_products
  (name, slug, brand_id, specs_json, price_npr, price_text, verified, is_active, is_price_list_item, admin_pinned, popularity_score, created_at, updated_at)
SELECT
  v.name,
  v.slug,
  b.id,
  v.specs_json::jsonb,
  v.price_npr,
  v.price_text,
  true, true, true,
  false,
  0,
  now(), now()
FROM (VALUES
  -- ── SAMSUNG ────────────────────────────────────────────
  ('Samsung Galaxy A07 (4+64GB)',           'samsung-galaxy-a07-4-64gb',            'samsung', '{"ram":"4","storage":"64"}',    18999,  'Rs. 18,999'),
  ('Samsung Galaxy A07 (4+128GB)',          'samsung-galaxy-a07-4-128gb',           'samsung', '{"ram":"4","storage":"128"}',   22499,  'Rs. 22,499'),
  ('Samsung Galaxy A07 (6+128GB)',          'samsung-galaxy-a07-6-128gb',           'samsung', '{"ram":"6","storage":"128"}',   26499,  'Rs. 26,499'),
  ('Samsung Galaxy M17 5G (6+128GB)',       'samsung-galaxy-m17-5g-6-128gb',        'samsung', '{"ram":"6","storage":"128"}',   32999,  'Rs. 32,999'),
  ('Samsung Galaxy A17 5G (6+128GB)',       'samsung-galaxy-a17-5g-6-128gb',        'samsung', '{"ram":"6","storage":"128"}',   33999,  'Rs. 33,999'),
  ('Samsung Galaxy A17 5G (8+128GB)',       'samsung-galaxy-a17-5g-8-128gb',        'samsung', '{"ram":"8","storage":"128"}',   36999,  'Rs. 36,999'),
  ('Samsung Galaxy A17 5G (8+256GB)',       'samsung-galaxy-a17-5g-8-256gb',        'samsung', '{"ram":"8","storage":"256"}',   44999,  'Rs. 44,999'),
  ('Samsung Galaxy M36 5G (8+128GB)',       'samsung-galaxy-m36-5g-8-128gb',        'samsung', '{"ram":"8","storage":"128"}',   41999,  'Rs. 41,999'),
  ('Samsung Galaxy M36 5G (8+256GB)',       'samsung-galaxy-m36-5g-8-256gb',        'samsung', '{"ram":"8","storage":"256"}',   47999,  'Rs. 47,999'),
  ('Samsung Galaxy A36 5G (8+128GB)',       'samsung-galaxy-a36-5g-8-128gb',        'samsung', '{"ram":"8","storage":"128"}',   53999,  'Rs. 53,999'),
  ('Samsung Galaxy A36 5G (8+256GB)',       'samsung-galaxy-a36-5g-8-256gb',        'samsung', '{"ram":"8","storage":"256"}',   59999,  'Rs. 59,999'),
  ('Samsung Galaxy A36 5G (12+256GB)',      'samsung-galaxy-a36-5g-12-256gb',       'samsung', '{"ram":"12","storage":"256"}',  65999,  'Rs. 65,999'),
  ('Samsung Galaxy A37 5G (8+128GB)',       'samsung-galaxy-a37-5g-8-128gb',        'samsung', '{"ram":"8","storage":"128"}',   64999,  'Rs. 64,999'),
  ('Samsung Galaxy A37 5G (8+256GB)',       'samsung-galaxy-a37-5g-8-256gb',        'samsung', '{"ram":"8","storage":"256"}',   72999,  'Rs. 72,999'),
  ('Samsung Galaxy A37 5G (12+256GB)',      'samsung-galaxy-a37-5g-12-256gb',       'samsung', '{"ram":"12","storage":"256"}',  79999,  'Rs. 79,999'),
  ('Samsung Galaxy A56 5G (8+256GB)',       'samsung-galaxy-a56-5g-8-256gb',        'samsung', '{"ram":"8","storage":"256"}',   71999,  'Rs. 71,999'),
  ('Samsung Galaxy A56 5G (12+256GB)',      'samsung-galaxy-a56-5g-12-256gb',       'samsung', '{"ram":"12","storage":"256"}',  77999,  'Rs. 77,999'),
  ('Samsung Galaxy A57 5G (8+256GB)',       'samsung-galaxy-a57-5g-8-256gb',        'samsung', '{"ram":"8","storage":"256"}',   84999,  'Rs. 84,999'),
  ('Samsung Galaxy A57 5G (12+256GB)',      'samsung-galaxy-a57-5g-12-256gb',       'samsung', '{"ram":"12","storage":"256"}',  89999,  'Rs. 89,999'),
  ('Samsung Galaxy S25 FE (8+256GB)',       'samsung-galaxy-s25-fe-8-256gb',        'samsung', '{"ram":"8","storage":"256"}',   107999, 'Rs. 1,07,999'),
  ('Samsung Galaxy S25 Ultra (12+256GB)',   'samsung-galaxy-s25-ultra-12-256gb',    'samsung', '{"ram":"12","storage":"256"}',  184999, 'Rs. 1,84,999'),
  ('Samsung Galaxy S25 Ultra (12+512GB)',   'samsung-galaxy-s25-ultra-12-512gb',    'samsung', '{"ram":"12","storage":"512"}',  199999, 'Rs. 1,99,999'),
  ('Samsung Galaxy S25 Ultra (12GB+1TB)',   'samsung-galaxy-s25-ultra-12-1tb',      'samsung', '{"ram":"12","storage":"1000"}', 234999, 'Rs. 2,34,999'),
  ('Samsung Galaxy S26 (12+256GB)',         'samsung-galaxy-s26-12-256gb',          'samsung', '{"ram":"12","storage":"256"}',  133999, 'Rs. 1,33,999'),
  ('Samsung Galaxy S26+ (12+256GB)',        'samsung-galaxy-s26-plus-12-256gb',     'samsung', '{"ram":"12","storage":"256"}',  182999, 'Rs. 1,82,999'),
  ('Samsung Galaxy S26 Ultra (12+256GB)',   'samsung-galaxy-s26-ultra-12-256gb',    'samsung', '{"ram":"12","storage":"256"}',  212999, 'Rs. 2,12,999'),
  ('Samsung Galaxy S26 Ultra (12+512GB)',   'samsung-galaxy-s26-ultra-12-512gb',    'samsung', '{"ram":"12","storage":"512"}',  242999, 'Rs. 2,42,999'),
  ('Samsung Galaxy S26 Ultra (16+1TB)',     'samsung-galaxy-s26-ultra-16-1tb',      'samsung', '{"ram":"16","storage":"1000"}', 292999, 'Rs. 2,92,999'),
  ('Samsung Galaxy Z Flip 7 (12+256GB)',    'samsung-galaxy-z-flip7-12-256gb',      'samsung', '{"ram":"12","storage":"256"}',  154999, 'Rs. 1,54,999'),
  ('Samsung Galaxy Z Fold 7 (12+256GB)',    'samsung-galaxy-z-fold7-12-256gb',      'samsung', '{"ram":"12","storage":"256"}',  244999, 'Rs. 2,44,999'),
  ('Samsung Galaxy Z Fold 7 (12+512GB)',    'samsung-galaxy-z-fold7-12-512gb',      'samsung', '{"ram":"12","storage":"512"}',  259999, 'Rs. 2,59,999'),

  -- ── APPLE ────────────────────────────────────────────
  ('Apple iPhone 13 (128GB)',               'apple-iphone-13-128gb',                'apple',   '{"storage":"128"}',             80399,  'Rs. 80,399'),
  ('Apple iPhone 14 (128GB)',               'apple-iphone-14-128gb',                'apple',   '{"storage":"128"}',             93499,  'Rs. 93,499'),
  ('Apple iPhone 15 (128GB)',               'apple-iphone-15-128gb',                'apple',   '{"storage":"128"}',             110999, 'Rs. 1,10,999'),
  ('Apple iPhone 16e (128GB)',              'apple-iphone-16e-128gb',               'apple',   '{"storage":"128"}',             102299, 'Rs. 1,02,299'),
  ('Apple iPhone 16 (128GB)',               'apple-iphone-16-128gb',                'apple',   '{"storage":"128"}',             141499, 'Rs. 1,41,499'),
  ('Apple iPhone 17e (256GB)',              'apple-iphone-17e-256gb',               'apple',   '{"storage":"256"}',             127799, 'Rs. 1,27,799'),
  ('Apple iPhone 17e (512GB)',              'apple-iphone-17e-512gb',               'apple',   '{"storage":"512"}',             168999, 'Rs. 1,68,999'),
  ('Apple iPhone 17 (256GB)',               'apple-iphone-17-256gb',                'apple',   '{"storage":"256"}',             167999, 'Rs. 1,67,999'),
  ('Apple iPhone 17 (512GB)',               'apple-iphone-17-512gb',                'apple',   '{"storage":"512"}',             208999, 'Rs. 2,08,999'),
  ('Apple iPhone Air (256GB)',              'apple-iphone-air-256gb',               'apple',   '{"storage":"256"}',             183999, 'Rs. 1,83,999'),
  ('Apple iPhone Air (512GB)',              'apple-iphone-air-512gb',               'apple',   '{"storage":"512"}',             224999, 'Rs. 2,24,999'),
  ('Apple iPhone Air (1TB)',                'apple-iphone-air-1tb',                 'apple',   '{"storage":"1000"}',            265999, 'Rs. 2,65,999'),
  ('Apple iPhone 17 Pro (256GB)',           'apple-iphone-17-pro-256gb',            'apple',   '{"storage":"256"}',             228999, 'Rs. 2,28,999'),
  ('Apple iPhone 17 Pro (512GB)',           'apple-iphone-17-pro-512gb',            'apple',   '{"storage":"512"}',             269999, 'Rs. 2,69,999'),
  ('Apple iPhone 17 Pro (1TB)',             'apple-iphone-17-pro-1tb',              'apple',   '{"storage":"1000"}',            309999, 'Rs. 3,09,999'),
  ('Apple iPhone 17 Pro Max (256GB)',       'apple-iphone-17-pro-max-256gb',        'apple',   '{"storage":"256"}',             248999, 'Rs. 2,48,999'),
  ('Apple iPhone 17 Pro Max (512GB)',       'apple-iphone-17-pro-max-512gb',        'apple',   '{"storage":"512"}',             289999, 'Rs. 2,89,999'),
  ('Apple iPhone 17 Pro Max (1TB)',         'apple-iphone-17-pro-max-1tb',          'apple',   '{"storage":"1000"}',            330999, 'Rs. 3,30,999'),
  ('Apple iPhone 17 Pro Max (2TB)',         'apple-iphone-17-pro-max-2tb',          'apple',   '{"storage":"2000"}',            411999, 'Rs. 4,11,999'),

  -- ── XIAOMI ────────────────────────────────────────────
  ('Xiaomi Redmi A5 (3+64GB)',              'xiaomi-redmi-a5-3-64gb',               'xiaomi',  '{"ram":"3","storage":"64"}',    14999,  'Rs. 14,999'),
  ('Xiaomi Redmi A5 (4+128GB)',             'xiaomi-redmi-a5-4-128gb',              'xiaomi',  '{"ram":"4","storage":"128"}',   16999,  'Rs. 16,999'),
  ('Xiaomi Redmi A7 (3+64GB)',              'xiaomi-redmi-a7-3-64gb',               'xiaomi',  '{"ram":"3","storage":"64"}',    15999,  'Rs. 15,999'),
  ('Xiaomi Redmi 15C (4+128GB)',            'xiaomi-redmi-15c-4-128gb',             'xiaomi',  '{"ram":"4","storage":"128"}',   19999,  'Rs. 19,999'),
  ('Xiaomi Redmi 15C (6+128GB)',            'xiaomi-redmi-15c-6-128gb',             'xiaomi',  '{"ram":"6","storage":"128"}',   21999,  'Rs. 21,999'),
  ('Xiaomi Redmi 15C (8+256GB)',            'xiaomi-redmi-15c-8-256gb',             'xiaomi',  '{"ram":"8","storage":"256"}',   24999,  'Rs. 24,999'),
  ('Xiaomi Redmi 15 (6+128GB)',             'xiaomi-redmi-15-6-128gb',              'xiaomi',  '{"ram":"6","storage":"128"}',   24999,  'Rs. 24,999'),
  ('Xiaomi Redmi 15 (8+256GB)',             'xiaomi-redmi-15-8-256gb',              'xiaomi',  '{"ram":"8","storage":"256"}',   27999,  'Rs. 27,999'),
  ('Xiaomi Redmi Note 15 4G (6+128GB)',     'xiaomi-redmi-note-15-4g-6-128gb',      'xiaomi',  '{"ram":"6","storage":"128"}',   29999,  'Rs. 29,999'),
  ('Xiaomi Redmi Note 15 4G (8+256GB)',     'xiaomi-redmi-note-15-4g-8-256gb',      'xiaomi',  '{"ram":"8","storage":"256"}',   35999,  'Rs. 35,999'),
  ('Xiaomi Redmi Note 15 5G (8+256GB)',     'xiaomi-redmi-note-15-5g-8-256gb',      'xiaomi',  '{"ram":"8","storage":"256"}',   39999,  'Rs. 39,999'),
  ('Xiaomi Redmi Note 15 5G (12+512GB)',    'xiaomi-redmi-note-15-5g-12-512gb',     'xiaomi',  '{"ram":"12","storage":"512"}',  46999,  'Rs. 46,999'),
  ('Xiaomi Redmi Note 15 Pro 5G (8+256GB)','xiaomi-redmi-note-15-pro-5g-8-256gb',  'xiaomi',  '{"ram":"8","storage":"256"}',   49999,  'Rs. 49,999'),
  ('Xiaomi Redmi Note 15 Pro 5G (12+512GB)','xiaomi-redmi-note-15-pro-5g-12-512gb','xiaomi',  '{"ram":"12","storage":"512"}',  56999,  'Rs. 56,999'),
  ('Xiaomi Redmi Note 15 Pro+ (8+256GB)',   'xiaomi-redmi-note-15-pro-plus-8-256gb','xiaomi',  '{"ram":"8","storage":"256"}',   59999,  'Rs. 59,999'),
  ('Xiaomi Redmi Note 15 Pro+ (12+512GB)',  'xiaomi-redmi-note-15-pro-plus-12-512gb','xiaomi', '{"ram":"12","storage":"512"}',  66999,  'Rs. 66,999'),
  ('Xiaomi 17 Ultra (16+512GB)',            'xiaomi-17-ultra-16-512gb',             'xiaomi',  '{"ram":"16","storage":"512"}',  199999, 'Rs. 1,99,999'),

  -- ── POCO ────────────────────────────────────────────
  ('POCO X7 Pro (12+512GB)',                'poco-x7-pro-12-512gb',                 'poco',    '{"ram":"12","storage":"512"}',  59999,  'Rs. 59,999'),
  ('POCO X8 Pro (8+256GB)',                 'poco-x8-pro-8-256gb',                  'poco',    '{"ram":"8","storage":"256"}',   63999,  'Rs. 63,999'),
  ('POCO X8 Pro (12+256GB)',                'poco-x8-pro-12-256gb',                 'poco',    '{"ram":"12","storage":"256"}',  73999,  'Rs. 73,999'),
  ('POCO F7 (12+512GB)',                    'poco-f7-12-512gb',                     'poco',    '{"ram":"12","storage":"512"}',  69999,  'Rs. 69,999'),
  ('POCO X8 Pro Max (12+256GB)',            'poco-x8-pro-max-12-256gb',             'poco',    '{"ram":"12","storage":"256"}',  79999,  'Rs. 79,999'),
  ('POCO X8 Pro Max (12+512GB)',            'poco-x8-pro-max-12-512gb',             'poco',    '{"ram":"12","storage":"512"}',  89999,  'Rs. 89,999'),
  ('POCO F8 Pro (12+512GB)',                'poco-f8-pro-12-512gb',                 'poco',    '{"ram":"12","storage":"512"}',  99999,  'Rs. 99,999'),

  -- ── HONOR ────────────────────────────────────────────
  ('Honor Play10 (3+64GB)',                 'honor-play10-3-64gb',                  'honor',   '{"ram":"3","storage":"64"}',    12499,  'Rs. 12,499'),
  ('Honor Play10 (4+128GB)',                'honor-play10-4-128gb',                 'honor',   '{"ram":"4","storage":"128"}',   14999,  'Rs. 14,999'),
  ('Honor X5c (4+64GB)',                    'honor-x5c-4-64gb',                     'honor',   '{"ram":"4","storage":"64"}',    15999,  'Rs. 15,999'),
  ('Honor X5c Plus (4+128GB)',              'honor-x5c-plus-4-128gb',               'honor',   '{"ram":"4","storage":"128"}',   17999,  'Rs. 17,999'),
  ('Honor X6c (6+128GB)',                   'honor-x6c-6-128gb',                    'honor',   '{"ram":"6","storage":"128"}',   19999,  'Rs. 19,999'),
  ('Honor X6c (6+256GB)',                   'honor-x6c-6-256gb',                    'honor',   '{"ram":"6","storage":"256"}',   21999,  'Rs. 21,999'),
  ('Honor X7d (8+256GB)',                   'honor-x7d-8-256gb',                    'honor',   '{"ram":"8","storage":"256"}',   30999,  'Rs. 30,999'),
  ('Honor X7d (8+512GB)',                   'honor-x7d-8-512gb',                    'honor',   '{"ram":"8","storage":"512"}',   32999,  'Rs. 32,999'),
  ('Honor X8c (8+512GB)',                   'honor-x8c-8-512gb',                    'honor',   '{"ram":"8","storage":"512"}',   34999,  'Rs. 34,999'),
  ('Honor X8d (8+128GB)',                   'honor-x8d-8-128gb',                    'honor',   '{"ram":"8","storage":"128"}',   39999,  'Rs. 39,999'),
  ('Honor X8d (8+256GB)',                   'honor-x8d-8-256gb',                    'honor',   '{"ram":"8","storage":"256"}',   43999,  'Rs. 43,999'),
  ('Honor X9d (8+256GB)',                   'honor-x9d-8-256gb',                    'honor',   '{"ram":"8","storage":"256"}',   54999,  'Rs. 54,999'),
  ('Honor X9d (12+256GB)',                  'honor-x9d-12-256gb',                   'honor',   '{"ram":"12","storage":"256"}',  59999,  'Rs. 59,999'),
  ('Honor 600 Lite (8+256GB)',              'honor-600-lite-8-256gb',               'honor',   '{"ram":"8","storage":"256"}',   59999,  'Rs. 59,999'),
  ('Honor 400 (12+512GB)',                  'honor-400-12-512gb',                   'honor',   '{"ram":"12","storage":"512"}',  67999,  'Rs. 67,999'),
  ('Honor 400 Pro (12+512GB)',              'honor-400-pro-12-512gb',               'honor',   '{"ram":"12","storage":"512"}',  88480,  'Rs. 88,480'),
  ('Honor Magic 8 Pro (12+512GB)',          'honor-magic-8-pro-12-512gb',           'honor',   '{"ram":"12","storage":"512"}',  199999, 'Rs. 1,99,999'),
  ('Honor Magic V5 (16+512GB)',             'honor-magic-v5-16-512gb',              'honor',   '{"ram":"16","storage":"512"}',  266999, 'Rs. 2,66,999'),

  -- ── VIVO ────────────────────────────────────────────
  ('Vivo Y04 (4+64GB)',                     'vivo-y04-4-64gb',                      'vivo',    '{"ram":"4","storage":"64"}',    13999,  'Rs. 13,999'),
  ('Vivo Y04 (4+128GB)',                    'vivo-y04-4-128gb',                     'vivo',    '{"ram":"4","storage":"128"}',   14999,  'Rs. 14,999'),
  ('Vivo Y05 (4+64GB)',                     'vivo-y05-4-64gb',                      'vivo',    '{"ram":"4","storage":"64"}',    16999,  'Rs. 16,999'),
  ('Vivo Y05 (4+128GB)',                    'vivo-y05-4-128gb',                     'vivo',    '{"ram":"4","storage":"128"}',   19499,  'Rs. 19,499'),
  ('Vivo Y19s (4+128GB)',                   'vivo-y19s-4-128gb',                    'vivo',    '{"ram":"4","storage":"128"}',   16499,  'Rs. 16,499'),
  ('Vivo Y19s (6+128GB)',                   'vivo-y19s-6-128gb',                    'vivo',    '{"ram":"6","storage":"128"}',   17499,  'Rs. 17,499'),
  ('Vivo Y19s Pro (8+128GB)',               'vivo-y19s-pro-8-128gb',                'vivo',    '{"ram":"8","storage":"128"}',   20999,  'Rs. 20,999'),
  ('Vivo Y11d (4+128GB)',                   'vivo-y11d-4-128gb',                    'vivo',    '{"ram":"4","storage":"128"}',   21499,  'Rs. 21,499'),
  ('Vivo Y11d (6+128GB)',                   'vivo-y11d-6-128gb',                    'vivo',    '{"ram":"6","storage":"128"}',   26999,  'Rs. 26,999'),
  ('Vivo Y21d (6+128GB)',                   'vivo-y21d-6-128gb',                    'vivo',    '{"ram":"6","storage":"128"}',   21499,  'Rs. 21,499'),
  ('Vivo Y21d (8+128GB)',                   'vivo-y21d-8-128gb',                    'vivo',    '{"ram":"8","storage":"128"}',   23499,  'Rs. 23,499'),
  ('Vivo Y29 (8+128GB)',                    'vivo-y29-8-128gb',                     'vivo',    '{"ram":"8","storage":"128"}',   24999,  'Rs. 24,999'),
  ('Vivo Y29 (8+256GB)',                    'vivo-y29-8-256gb',                     'vivo',    '{"ram":"8","storage":"256"}',   26999,  'Rs. 26,999'),
  ('Vivo Y31d (6+128GB)',                   'vivo-y31d-6-128gb',                    'vivo',    '{"ram":"6","storage":"128"}',   29499,  'Rs. 29,499'),
  ('Vivo Y31d (8+128GB)',                   'vivo-y31d-8-128gb',                    'vivo',    '{"ram":"8","storage":"128"}',   33999,  'Rs. 33,999'),
  ('Vivo Y31d (8+256GB)',                   'vivo-y31d-8-256gb',                    'vivo',    '{"ram":"8","storage":"256"}',   38999,  'Rs. 38,999'),
  ('Vivo Y400 (8+256GB)',                   'vivo-y400-8-256gb',                    'vivo',    '{"ram":"8","storage":"256"}',   39999,  'Rs. 39,999'),
  ('Vivo V50 Lite 4G (8+256GB)',            'vivo-v50-lite-4g-8-256gb',             'vivo',    '{"ram":"8","storage":"256"}',   37999,  'Rs. 37,999'),
  ('Vivo V60 Lite 4G (8+256GB)',            'vivo-v60-lite-4g-8-256gb',             'vivo',    '{"ram":"8","storage":"256"}',   43499,  'Rs. 43,499'),
  ('Vivo V50 Lite 5G (12+256GB)',           'vivo-v50-lite-5g-12-256gb',            'vivo',    '{"ram":"12","storage":"256"}',  45999,  'Rs. 45,999'),
  ('Vivo V60 Lite 5G (12+256GB)',           'vivo-v60-lite-5g-12-256gb',            'vivo',    '{"ram":"12","storage":"256"}',  51999,  'Rs. 51,999'),
  ('Vivo V50 5G (12+256GB)',                'vivo-v50-5g-12-256gb',                 'vivo',    '{"ram":"12","storage":"256"}',  67999,  'Rs. 67,999'),
  ('Vivo V60 5G (12+256GB)',                'vivo-v60-5g-12-256gb',                 'vivo',    '{"ram":"12","storage":"256"}',  74999,  'Rs. 74,999'),
  ('Vivo V60 5G (12+512GB)',                'vivo-v60-5g-12-512gb',                 'vivo',    '{"ram":"12","storage":"512"}',  79999,  'Rs. 79,999'),
  ('Vivo V70 5G (12+256GB)',                'vivo-v70-5g-12-256gb',                 'vivo',    '{"ram":"12","storage":"256"}',  83999,  'Rs. 83,999'),
  ('Vivo V70 5G (12+512GB)',                'vivo-v70-5g-12-512gb',                 'vivo',    '{"ram":"12","storage":"512"}',  94999,  'Rs. 94,999'),
  ('Vivo X200 Pro (16+512GB)',              'vivo-x200-pro-16-512gb',               'vivo',    '{"ram":"16","storage":"512"}',  184999, 'Rs. 1,84,999'),
  ('Vivo X300 Pro (16+512GB)',              'vivo-x300-pro-16-512gb',               'vivo',    '{"ram":"16","storage":"512"}',  179999, 'Rs. 1,79,999'),

  -- ── NOTHING ────────────────────────────────────────────
  ('CMF Phone 1 (8+128GB)',                 'cmf-phone-1-8-128gb',                  'nothing', '{"ram":"8","storage":"128"}',   31699,  'Rs. 31,699'),
  ('CMF Phone 1 (8+256GB)',                 'cmf-phone-1-8-256gb',                  'nothing', '{"ram":"8","storage":"256"}',   36299,  'Rs. 36,299'),
  ('CMF Phone 2 Pro (8+128GB)',             'cmf-phone-2-pro-8-128gb',              'nothing', '{"ram":"8","storage":"128"}',   38999,  'Rs. 38,999'),
  ('CMF Phone 2 Pro (8+256GB)',             'cmf-phone-2-pro-8-256gb',              'nothing', '{"ram":"8","storage":"256"}',   44999,  'Rs. 44,999'),
  ('Nothing Phone (3a) Lite (8+128GB)',     'nothing-phone-3a-lite-8-128gb',        'nothing', '{"ram":"8","storage":"128"}',   38999,  'Rs. 38,999'),
  ('Nothing Phone (3a) Lite (8+256GB)',     'nothing-phone-3a-lite-8-256gb',        'nothing', '{"ram":"8","storage":"256"}',   44499,  'Rs. 44,499'),
  ('Nothing Phone (2a) (8+128GB)',          'nothing-phone-2a-8-128gb',             'nothing', '{"ram":"8","storage":"128"}',   46999,  'Rs. 46,999'),
  ('Nothing Phone (2a) (8+256GB)',          'nothing-phone-2a-8-256gb',             'nothing', '{"ram":"8","storage":"256"}',   48999,  'Rs. 48,999'),
  ('Nothing Phone (2a) Plus (8+256GB)',     'nothing-phone-2a-plus-8-256gb',        'nothing', '{"ram":"8","storage":"256"}',   49999,  'Rs. 49,999'),
  ('Nothing Phone (2a) Plus (12+256GB)',    'nothing-phone-2a-plus-12-256gb',       'nothing', '{"ram":"12","storage":"256"}',  53999,  'Rs. 53,999'),
  ('Nothing Phone (3a) (8+128GB)',          'nothing-phone-3a-8-128gb',             'nothing', '{"ram":"8","storage":"128"}',   53999,  'Rs. 53,999'),
  ('Nothing Phone (3a) (8+256GB)',          'nothing-phone-3a-8-256gb',             'nothing', '{"ram":"8","storage":"256"}',   54499,  'Rs. 54,499'),
  ('Nothing Phone (3a) (12+256GB)',         'nothing-phone-3a-12-256gb',            'nothing', '{"ram":"12","storage":"256"}',  61999,  'Rs. 61,999'),
  ('Nothing Phone (4a) (8+128GB)',          'nothing-phone-4a-8-128gb',             'nothing', '{"ram":"8","storage":"128"}',   58499,  'Rs. 58,499'),
  ('Nothing Phone (4a) (8+256GB)',          'nothing-phone-4a-8-256gb',             'nothing', '{"ram":"8","storage":"256"}',   63999,  'Rs. 63,999'),
  ('Nothing Phone (4a) (12+256GB)',         'nothing-phone-4a-12-256gb',            'nothing', '{"ram":"12","storage":"256"}',  69999,  'Rs. 69,999'),
  ('Nothing Phone (3a) Pro (8+256GB)',      'nothing-phone-3a-pro-8-256gb',         'nothing', '{"ram":"8","storage":"256"}',   61999,  'Rs. 61,999'),
  ('Nothing Phone (3a) Pro (12+256GB)',     'nothing-phone-3a-pro-12-256gb',        'nothing', '{"ram":"12","storage":"256"}',  69999,  'Rs. 69,999'),
  ('Nothing Phone (4a) Pro (12+256GB)',     'nothing-phone-4a-pro-12-256gb',        'nothing', '{"ram":"12","storage":"256"}',  86999,  'Rs. 86,999'),
  ('Nothing Phone (3) (12+256GB)',          'nothing-phone-3-12-256gb',             'nothing', '{"ram":"12","storage":"256"}',  99999,  'Rs. 99,999'),
  ('Nothing Phone (3) (16+512GB)',          'nothing-phone-3-16-512gb',             'nothing', '{"ram":"16","storage":"512"}',  114999, 'Rs. 1,14,999'),

  -- ── ONEPLUS ────────────────────────────────────────────
  ('OnePlus Nord CE 5 (8+256GB)',           'oneplus-nord-ce-5-8-256gb',            'oneplus', '{"ram":"8","storage":"256"}',   53999,  'Rs. 53,999'),
  ('OnePlus Nord 5 (8+256GB)',              'oneplus-nord-5-8-256gb',               'oneplus', '{"ram":"8","storage":"256"}',   73999,  'Rs. 73,999'),
  ('OnePlus Nord 5 (12+512GB)',             'oneplus-nord-5-12-512gb',              'oneplus', '{"ram":"12","storage":"512"}',  79999,  'Rs. 79,999'),
  ('OnePlus 13R (12+256GB)',                'oneplus-13r-12-256gb',                 'oneplus', '{"ram":"12","storage":"256"}',  83999,  'Rs. 83,999'),
  ('OnePlus 15R (12+256GB)',                'oneplus-15r-12-256gb',                 'oneplus', '{"ram":"12","storage":"256"}',  98499,  'Rs. 98,499'),
  ('OnePlus 15R (12+512GB)',                'oneplus-15r-12-512gb',                 'oneplus', '{"ram":"12","storage":"512"}',  106999, 'Rs. 1,06,999'),
  ('OnePlus 12 (16+512GB)',                 'oneplus-12-16-512gb',                  'oneplus', '{"ram":"16","storage":"512"}',  139999, 'Rs. 1,39,999'),
  ('OnePlus 13 (16+512GB)',                 'oneplus-13-16-512gb',                  'oneplus', '{"ram":"16","storage":"512"}',  141999, 'Rs. 1,41,999'),
  ('OnePlus 15 (16+512GB)',                 'oneplus-15-16-512gb',                  'oneplus', '{"ram":"16","storage":"512"}',  169999, 'Rs. 1,69,999'),

  -- ── REALME ────────────────────────────────────────────
  ('Realme Note 60x (4+64GB)',              'realme-note-60x-4-64gb',               'realme',  '{"ram":"4","storage":"64"}',    13999,  'Rs. 13,999'),
  ('Realme Note 70 (4+64GB)',               'realme-note-70-4-64gb',                'realme',  '{"ram":"4","storage":"64"}',    15499,  'Rs. 15,499'),
  ('Realme Note 70 (4+128GB)',              'realme-note-70-4-128gb',               'realme',  '{"ram":"4","storage":"128"}',   20999,  'Rs. 20,999'),
  ('Realme C71 (4+128GB)',                  'realme-c71-4-128gb',                   'realme',  '{"ram":"4","storage":"128"}',   20999,  'Rs. 20,999'),
  ('Realme C71 (6+128GB)',                  'realme-c71-6-128gb',                   'realme',  '{"ram":"6","storage":"128"}',   25999,  'Rs. 25,999'),
  ('Realme C75 (8+128GB)',                  'realme-c75-8-128gb',                   'realme',  '{"ram":"8","storage":"128"}',   24999,  'Rs. 24,999'),
  ('Realme C75 (8+256GB)',                  'realme-c75-8-256gb',                   'realme',  '{"ram":"8","storage":"256"}',   26999,  'Rs. 26,999'),
  ('Realme 14T (8+256GB)',                  'realme-14t-8-256gb',                   'realme',  '{"ram":"8","storage":"256"}',   36999,  'Rs. 36,999'),
  ('Realme 15T (8+256GB)',                  'realme-15t-8-256gb',                   'realme',  '{"ram":"8","storage":"256"}',   39999,  'Rs. 39,999'),
  ('Realme 15T (12+512GB)',                 'realme-15t-12-512gb',                  'realme',  '{"ram":"12","storage":"512"}',  49999,  'Rs. 49,999'),
  ('Realme 14 (12+256GB)',                  'realme-14-12-256gb',                   'realme',  '{"ram":"12","storage":"256"}',  49999,  'Rs. 49,999'),
  ('Realme 15 Pro (12+256GB)',              'realme-15-pro-12-256gb',               'realme',  '{"ram":"12","storage":"256"}',  66999,  'Rs. 66,999'),
  ('Realme 15 Pro (12+512GB)',              'realme-15-pro-12-512gb',               'realme',  '{"ram":"12","storage":"512"}',  71999,  'Rs. 71,999'),
  ('Realme GT8 Pro (16+512GB)',             'realme-gt8-pro-16-512gb',              'realme',  '{"ram":"16","storage":"512"}',  149999, 'Rs. 1,49,999'),
  ('Realme GT8 Pro Aston Martin (16+512GB)','realme-gt8-pro-aston-martin-16-512gb', 'realme',  '{"ram":"16","storage":"512"}',  159999, 'Rs. 1,59,999'),

  -- ── OPPO ────────────────────────────────────────────
  ('OPPO A5x 4G (4+64GB)',                  'oppo-a5x-4g-4-64gb',                   'oppo',    '{"ram":"4","storage":"64"}',    16999,  'Rs. 16,999'),
  ('OPPO A5x 4G (4+128GB)',                 'oppo-a5x-4g-4-128gb',                  'oppo',    '{"ram":"4","storage":"128"}',   19499,  'Rs. 19,499'),
  ('OPPO A5x 4G (6+128GB)',                 'oppo-a5x-4g-6-128gb',                  'oppo',    '{"ram":"6","storage":"128"}',   21999,  'Rs. 21,999'),
  ('OPPO A5 4G (6+128GB)',                  'oppo-a5-4g-6-128gb',                   'oppo',    '{"ram":"6","storage":"128"}',   22999,  'Rs. 22,999'),
  ('OPPO A5 4G (8+128GB)',                  'oppo-a5-4g-8-128gb',                   'oppo',    '{"ram":"8","storage":"128"}',   24999,  'Rs. 24,999'),
  ('OPPO A5 Pro 4G (8+256GB)',              'oppo-a5-pro-4g-8-256gb',               'oppo',    '{"ram":"8","storage":"256"}',   32999,  'Rs. 32,999'),
  ('OPPO A6X 4G (6+128GB)',                 'oppo-a6x-4g-6-128gb',                  'oppo',    '{"ram":"6","storage":"128"}',   32499,  'Rs. 32,499'),
  ('OPPO A6 (8+256GB)',                     'oppo-a6-8-256gb',                      'oppo',    '{"ram":"8","storage":"256"}',   42499,  'Rs. 42,499'),
  ('OPPO A6 Pro 4G (8+256GB)',              'oppo-a6-pro-4g-8-256gb',               'oppo',    '{"ram":"8","storage":"256"}',   48999,  'Rs. 48,999'),
  ('OPPO Reno 14F (12+512GB)',              'oppo-reno-14f-12-512gb',               'oppo',    '{"ram":"12","storage":"512"}',  57999,  'Rs. 57,999'),
  ('OPPO Reno 15 F (12+512GB)',             'oppo-reno-15f-12-512gb',               'oppo',    '{"ram":"12","storage":"512"}',  69999,  'Rs. 69,999'),
  ('OPPO Reno 15 (12+512GB)',               'oppo-reno-15-12-512gb',                'oppo',    '{"ram":"12","storage":"512"}',  89999,  'Rs. 89,999'),
  ('OPPO Find N5 (16+512GB)',               'oppo-find-n5-16-512gb',                'oppo',    '{"ram":"16","storage":"512"}',  249999, 'Rs. 2,49,999'),

  -- ── INFINIX ────────────────────────────────────────────
  ('Infinix Smart 10 (4+64GB)',             'infinix-smart-10-4-64gb',              'infinix', '{"ram":"4","storage":"64"}',    14999,  'Rs. 14,999'),
  ('Infinix Smart 10 Plus (4+128GB)',       'infinix-smart-10-plus-4-128gb',        'infinix', '{"ram":"4","storage":"128"}',   15999,  'Rs. 15,999'),
  ('Infinix Hot 60i (4+128GB)',             'infinix-hot-60i-4-128gb',              'infinix', '{"ram":"4","storage":"128"}',   16999,  'Rs. 16,999'),
  ('Infinix Hot 60i (6+128GB)',             'infinix-hot-60i-6-128gb',              'infinix', '{"ram":"6","storage":"128"}',   18999,  'Rs. 18,999'),
  ('Infinix Hot 60 Pro (8+128GB)',          'infinix-hot-60-pro-8-128gb',           'infinix', '{"ram":"8","storage":"128"}',   24999,  'Rs. 24,999'),
  ('Infinix Hot 60 Pro+ (8+128GB)',         'infinix-hot-60-pro-plus-8-128gb',      'infinix', '{"ram":"8","storage":"128"}',   29999,  'Rs. 29,999'),
  ('Infinix Note 50s (8+256GB)',            'infinix-note-50s-8-256gb',             'infinix', '{"ram":"8","storage":"256"}',   35999,  'Rs. 35,999'),
  ('Infinix GT 30 (8+256GB)',               'infinix-gt-30-8-256gb',                'infinix', '{"ram":"8","storage":"256"}',   36999,  'Rs. 36,999'),
  ('Infinix GT 30 Pro (8+256GB)',           'infinix-gt-30-pro-8-256gb',            'infinix', '{"ram":"8","storage":"256"}',   47999,  'Rs. 47,999'),
  ('Infinix GT 30 Pro + Gaming Kits (8+256GB)', 'infinix-gt-30-pro-gaming-8-256gb','infinix', '{"ram":"8","storage":"256"}',   51999,  'Rs. 51,999'),
  ('Infinix GT 30 Pro + Gaming Kits (12+256GB)','infinix-gt-30-pro-gaming-12-256gb','infinix', '{"ram":"12","storage":"256"}',  55999,  'Rs. 55,999'),
  ('Infinix Note Edge (8+128GB)',           'infinix-note-edge-8-128gb',            'infinix', '{"ram":"8","storage":"128"}',   41999,  'Rs. 41,999'),
  ('Infinix Note Edge (8+256GB)',           'infinix-note-edge-8-256gb',            'infinix', '{"ram":"8","storage":"256"}',   47999,  'Rs. 47,999'),
  ('Infinix Note 60 (8+128GB)',             'infinix-note-60-8-128gb',              'infinix', '{"ram":"8","storage":"128"}',   45999,  'Rs. 45,999'),
  ('Infinix Note 60 (8+256GB)',             'infinix-note-60-8-256gb',              'infinix', '{"ram":"8","storage":"256"}',   51999,  'Rs. 51,999'),
  ('Infinix Note 60 Pro (8+256GB)',         'infinix-note-60-pro-8-256gb',          'infinix', '{"ram":"8","storage":"256"}',   59999,  'Rs. 59,999'),
  ('Infinix Note 60 Pro (12+256GB)',        'infinix-note-60-pro-12-256gb',         'infinix', '{"ram":"12","storage":"256"}',  66999,  'Rs. 66,999'),

  -- ── MOTOROLA ────────────────────────────────────────────
  ('Motorola Moto G04s (4+64GB)',           'motorola-moto-g04s-4-64gb',            'motorola','{"ram":"4","storage":"64"}',    12599,  'Rs. 12,599'),
  ('Motorola Moto G05 (4+64GB)',            'motorola-moto-g05-4-64gb',             'motorola','{"ram":"4","storage":"64"}',    12499,  'Rs. 12,499'),
  ('Motorola Moto G35 (4+128GB)',           'motorola-moto-g35-4-128gb',            'motorola','{"ram":"4","storage":"128"}',   19999,  'Rs. 19,999'),
  ('Motorola Moto G45 (8+128GB)',           'motorola-moto-g45-8-128gb',            'motorola','{"ram":"8","storage":"128"}',   24999,  'Rs. 24,999'),
  ('Motorola Moto G64 (8+128GB)',           'motorola-moto-g64-8-128gb',            'motorola','{"ram":"8","storage":"128"}',   27499,  'Rs. 27,499'),
  ('Motorola Moto G64 (12+256GB)',          'motorola-moto-g64-12-256gb',           'motorola','{"ram":"12","storage":"256"}',  30999,  'Rs. 30,999'),
  ('Motorola Moto G85 (8+128GB)',           'motorola-moto-g85-8-128gb',            'motorola','{"ram":"8","storage":"128"}',   34499,  'Rs. 34,499'),
  ('Motorola Moto G85 (12+256GB)',          'motorola-moto-g85-12-256gb',           'motorola','{"ram":"12","storage":"256"}',  37499,  'Rs. 37,499'),
  ('Motorola Moto G96 (8+256GB)',           'motorola-moto-g96-8-256gb',            'motorola','{"ram":"8","storage":"256"}',   44999,  'Rs. 44,999'),
  ('Motorola Edge 50 Fusion (12+256GB)',    'motorola-edge-50-fusion-12-256gb',     'motorola','{"ram":"12","storage":"256"}',  46999,  'Rs. 46,999'),

  -- ── ZTE / NUBIA ────────────────────────────────────────────
  ('ZTE Blade A35e (2+64GB)',               'zte-blade-a35e-2-64gb',                'zte',     '{"ram":"2","storage":"64"}',    10499,  'Rs. 10,499'),
  ('ZTE Blade A55 (4+64GB)',                'zte-blade-a55-4-64gb',                 'zte',     '{"ram":"4","storage":"64"}',    11999,  'Rs. 11,999'),
  ('ZTE Blade A55 (4+128GB)',               'zte-blade-a55-4-128gb',                'zte',     '{"ram":"4","storage":"128"}',   12999,  'Rs. 12,999'),
  ('ZTE Blade A75 (4+256GB)',               'zte-blade-a75-4-256gb',                'zte',     '{"ram":"4","storage":"256"}',   13999,  'Rs. 13,999'),
  ('ZTE Nubia A36 (4+64GB)',                'zte-nubia-a36-4-64gb',                 'zte',     '{"ram":"4","storage":"64"}',    15999,  'Rs. 15,999'),
  ('ZTE Nubia A56 (4+128GB)',               'zte-nubia-a56-4-128gb',                'zte',     '{"ram":"4","storage":"128"}',   16999,  'Rs. 16,999'),
  ('ZTE Nubia V70 Max (6+128GB)',           'zte-nubia-v70-max-6-128gb',            'zte',     '{"ram":"6","storage":"128"}',   15999,  'Rs. 15,999'),
  ('ZTE Nubia V70 (8+128GB)',               'zte-nubia-v70-8-128gb',                'zte',     '{"ram":"8","storage":"128"}',   16999,  'Rs. 16,999'),
  ('ZTE Nubia V70 (8+256GB)',               'zte-nubia-v70-8-256gb',                'zte',     '{"ram":"8","storage":"256"}',   18999,  'Rs. 18,999'),
  ('ZTE Nubia V80 Max (8+128GB)',           'zte-nubia-v80-max-8-128gb',            'zte',     '{"ram":"8","storage":"128"}',   23999,  'Rs. 23,999'),
  ('ZTE Nubia V80 Max (8+256GB)',           'zte-nubia-v80-max-8-256gb',            'zte',     '{"ram":"8","storage":"256"}',   26999,  'Rs. 26,999'),
  ('ZTE Nubia V80 Design (8+128GB)',        'zte-nubia-v80-design-8-128gb',         'zte',     '{"ram":"8","storage":"128"}',   24999,  'Rs. 24,999'),
  ('ZTE Nubia V80 Design (8+256GB)',        'zte-nubia-v80-design-8-256gb',         'zte',     '{"ram":"8","storage":"256"}',   27999,  'Rs. 27,999'),
  ('ZTE Nubia Air (8+256GB)',               'zte-nubia-air-8-256gb',                'zte',     '{"ram":"8","storage":"256"}',   33999,  'Rs. 33,999'),
  ('ZTE Nubia Neo 3 GT (12+256GB)',         'zte-nubia-neo-3-gt-12-256gb',          'zte',     '{"ram":"12","storage":"256"}',  36999,  'Rs. 36,999'),
  ('ZTE RedMagic 11 Pro (16+512GB)',        'zte-redmagic-11-pro-16-512gb',         'zte',     '{"ram":"16","storage":"512"}',  164999, 'Rs. 1,64,999'),

  -- ── AI+ ────────────────────────────────────────────
  ('Ai+ Pulse (4+64GB)',                    'ai-plus-pulse-4-64gb',                 'ai-plus', '{"ram":"4","storage":"64"}',    14999,  'Rs. 14,999'),
  ('Ai+ Pulse (6+128GB)',                   'ai-plus-pulse-6-128gb',                'ai-plus', '{"ram":"6","storage":"128"}',   16499,  'Rs. 16,499'),
  ('Ai+ Nova 5G (6+128GB)',                 'ai-plus-nova-5g-6-128gb',              'ai-plus', '{"ram":"6","storage":"128"}',   18499,  'Rs. 18,499'),
  ('Ai+ Nova 5G (8+128GB)',                 'ai-plus-nova-5g-8-128gb',              'ai-plus', '{"ram":"8","storage":"128"}',   21999,  'Rs. 21,999'),

  -- ── TECNO ────────────────────────────────────────────
  ('Tecno Spark Go 2 (3+64GB)',             'tecno-spark-go-2-3-64gb',              'tecno',   '{"ram":"3","storage":"64"}',    11499,  'Rs. 11,499'),
  ('Tecno Spark Go 2 (4+64GB)',             'tecno-spark-go-2-4-64gb',              'tecno',   '{"ram":"4","storage":"64"}',    13499,  'Rs. 13,499'),
  ('Tecno Spark Go 2 (4+128GB)',            'tecno-spark-go-2-4-128gb',             'tecno',   '{"ram":"4","storage":"128"}',   14499,  'Rs. 14,499'),
  ('Tecno Spark Go 3 (4+64GB)',             'tecno-spark-go-3-4-64gb',              'tecno',   '{"ram":"4","storage":"64"}',    15999,  'Rs. 15,999'),
  ('Tecno Spark Go 3 (4+128GB)',            'tecno-spark-go-3-4-128gb',             'tecno',   '{"ram":"4","storage":"128"}',   16999,  'Rs. 16,999'),
  ('Tecno Spark 30C (6+128GB)',             'tecno-spark-30c-6-128gb',              'tecno',   '{"ram":"6","storage":"128"}',   16490,  'Rs. 16,490'),
  ('Tecno Spark 30C (8+256GB)',             'tecno-spark-30c-8-256gb',              'tecno',   '{"ram":"8","storage":"256"}',   19990,  'Rs. 19,990'),
  ('Tecno Spark 30 (8+256GB)',              'tecno-spark-30-8-256gb',               'tecno',   '{"ram":"8","storage":"256"}',   22490,  'Rs. 22,490'),
  ('Tecno Spark 40 (6+128GB)',              'tecno-spark-40-6-128gb',               'tecno',   '{"ram":"6","storage":"128"}',   18999,  'Rs. 18,999'),
  ('Tecno Spark 40 (8+256GB)',              'tecno-spark-40-8-256gb',               'tecno',   '{"ram":"8","storage":"256"}',   24999,  'Rs. 24,999'),
  ('Tecno Spark 40 Pro (8+256GB)',          'tecno-spark-40-pro-8-256gb',           'tecno',   '{"ram":"8","storage":"256"}',   31799,  'Rs. 31,799'),
  ('Tecno Pova 6 (12+256GB)',               'tecno-pova-6-12-256gb',                'tecno',   '{"ram":"12","storage":"256"}',  34990,  'Rs. 34,990'),
  ('Tecno Pova Curve 2 5G (8+256GB)',       'tecno-pova-curve-2-5g-8-256gb',        'tecno',   '{"ram":"8","storage":"256"}',   47999,  'Rs. 47,999'),

  -- ── ITEL ────────────────────────────────────────────
  ('Itel A05s (2+32GB)',                    'itel-a05s-2-32gb',                     'itel',    '{"ram":"2","storage":"32"}',    9790,   'Rs. 9,790'),
  ('Itel A50C (2+32GB)',                    'itel-a50c-2-32gb',                     'itel',    '{"ram":"2","storage":"32"}',    9890,   'Rs. 9,890'),
  ('Itel A50 (3+64GB)',                     'itel-a50-3-64gb',                      'itel',    '{"ram":"3","storage":"64"}',    10990,  'Rs. 10,990'),
  ('Itel A50 (4+64GB)',                     'itel-a50-4-64gb',                      'itel',    '{"ram":"4","storage":"64"}',    11790,  'Rs. 11,790'),
  ('Itel A70 (4+64GB)',                     'itel-a70-4-64gb',                      'itel',    '{"ram":"4","storage":"64"}',    11810,  'Rs. 11,810'),
  ('Itel A80 (4+128GB)',                    'itel-a80-4-128gb',                     'itel',    '{"ram":"4","storage":"128"}',   12990,  'Rs. 12,990'),
  ('Itel P55 (4+128GB)',                    'itel-p55-4-128gb',                     'itel',    '{"ram":"4","storage":"128"}',   12490,  'Rs. 12,490'),
  ('Itel P55 (8+128GB)',                    'itel-p55-8-128gb',                     'itel',    '{"ram":"8","storage":"128"}',   14490,  'Rs. 14,490'),

  -- ── COOLPAD ────────────────────────────────────────────
  ('Coolpad 12 NEO Plus (3+64GB)',          'coolpad-12-neo-plus-3-64gb',           'coolpad', '{"ram":"3","storage":"64"}',    11199,  'Rs. 11,199'),
  ('Coolpad 12 NEO Plus (3+128GB)',         'coolpad-12-neo-plus-3-128gb',          'coolpad', '{"ram":"3","storage":"128"}',   11999,  'Rs. 11,999'),
  ('Coolpad 12 NEO (4+64GB)',               'coolpad-12-neo-4-64gb',                'coolpad', '{"ram":"4","storage":"64"}',    10999,  'Rs. 10,999'),
  ('Coolpad 12 NEO (4+128GB)',              'coolpad-12-neo-4-128gb',               'coolpad', '{"ram":"4","storage":"128"}',   11999,  'Rs. 11,999'),
  ('Coolpad C16 (4+128GB)',                 'coolpad-c16-4-128gb',                  'coolpad', '{"ram":"4","storage":"128"}',   12999,  'Rs. 12,999'),
  ('Coolpad C15 (6+256GB)',                 'coolpad-c15-6-256gb',                  'coolpad', '{"ram":"6","storage":"256"}',   15999,  'Rs. 15,999'),
  ('Coolpad X100 (8+256GB)',                'coolpad-x100-8-256gb',                 'coolpad', '{"ram":"8","storage":"256"}',   23999,  'Rs. 23,999'),

  -- ── BENCO ────────────────────────────────────────────
  ('Benco V90i SE (3+64GB)',                'benco-v90i-se-3-64gb',                 'benco',   '{"ram":"3","storage":"64"}',    10499,  'Rs. 10,499'),
  ('Benco V90 Plus (4+64GB)',               'benco-v90-plus-4-64gb',                'benco',   '{"ram":"4","storage":"64"}',    11299,  'Rs. 11,299'),
  ('Benco V90 Plus (4+128GB)',              'benco-v90-plus-4-128gb',               'benco',   '{"ram":"4","storage":"128"}',   11599,  'Rs. 11,599'),
  ('Benco V91c (4+128GB)',                  'benco-v91c-4-128gb',                   'benco',   '{"ram":"4","storage":"128"}',   12999,  'Rs. 12,999'),
  ('Benco V91 (4+128GB)',                   'benco-v91-4-128gb',                    'benco',   '{"ram":"4","storage":"128"}',   13599,  'Rs. 13,599'),
  ('Benco V91 (8+128GB)',                   'benco-v91-8-128gb',                    'benco',   '{"ram":"8","storage":"128"}',   14399,  'Rs. 14,399'),
  ('Benco V91 Plus (6+128GB)',              'benco-v91-plus-6-128gb',               'benco',   '{"ram":"6","storage":"128"}',   14999,  'Rs. 14,999'),
  ('Benco V91 Plus (8+256GB)',              'benco-v91-plus-8-256gb',               'benco',   '{"ram":"8","storage":"256"}',   17999,  'Rs. 17,999'),
  ('Benco V92 (6+256GB)',                   'benco-v92-6-256gb',                    'benco',   '{"ram":"6","storage":"256"}',   16999,  'Rs. 16,999'),
  ('Benco S1 (6+128GB)',                    'benco-s1-6-128gb',                     'benco',   '{"ram":"6","storage":"128"}',   13999,  'Rs. 13,999'),
  ('Benco S1 (8+128GB)',                    'benco-s1-8-128gb',                     'benco',   '{"ram":"8","storage":"128"}',   14999,  'Rs. 14,999'),
  ('Benco S1 Pro (8+128GB)',                'benco-s1-pro-8-128gb',                 'benco',   '{"ram":"8","storage":"128"}',   18999,  'Rs. 18,999'),
  ('Benco S1 Pro (8+256GB)',                'benco-s1-pro-8-256gb',                 'benco',   '{"ram":"8","storage":"256"}',   19999,  'Rs. 19,999'),
  ('Benco S1 Plus (8+256GB)',               'benco-s1-plus-8-256gb',                'benco',   '{"ram":"8","storage":"256"}',   19999,  'Rs. 19,999')

) AS v(name, slug, brand_slug, specs_json, price_npr, price_text)
JOIN public.brands b ON b.slug = v.brand_slug
ON CONFLICT (slug) DO UPDATE SET
  price_npr          = EXCLUDED.price_npr,
  price_text         = EXCLUDED.price_text,
  specs_json         = EXCLUDED.specs_json,
  verified           = true,
  is_active          = true,
  is_price_list_item = true,
  updated_at         = now();

-- Step 3: Seed valuation rules for high-demand devices
-- Schema: catalog_product_id, base_price, condition_factors, storage_adjustments, defect_adjustments, age_depreciation
INSERT INTO public.valuation_rules
  (catalog_product_id, base_price, condition_factors, storage_adjustments, defect_adjustments, age_depreciation, demand_factor, active)
SELECT
  cp.id,
  ROUND(cp.price_npr * 0.60),  -- Base trade-in = 60% of retail
  '{"new":1.0,"like_new":0.85,"used":0.65,"fair":0.45,"poor":0.28}'::jsonb,
  '{"64":0.90,"128":1.00,"256":1.08,"512":1.15,"1000":1.22}'::jsonb,
  '{"screen_crack":-8000,"battery_weak":-4000,"camera_issue":-5000,"speaker_issue":-2000,"buttons_issue":-1500,"charging_issue":-2500,"face_id_fail":-6000}'::jsonb,
  '{"0-6":1.00,"6-12":0.93,"12-24":0.84,"24-36":0.74,"36-48":0.62,"48+":0.50}'::jsonb,
  CASE
    WHEN cp.name ILIKE '%iphone 17%' OR cp.name ILIKE '%s26%' THEN 1.15
    WHEN cp.name ILIKE '%iphone 16%' OR cp.name ILIKE '%s25%' THEN 1.10
    WHEN cp.name ILIKE '%pro max%' OR cp.name ILIKE '%ultra%' OR cp.name ILIKE '%fold%' THEN 1.08
    ELSE 1.00
  END,
  true
FROM public.catalog_products cp
WHERE cp.is_price_list_item = true
  AND cp.verified = true
  AND cp.price_npr IS NOT NULL
ON CONFLICT (catalog_product_id) DO UPDATE SET
  base_price         = EXCLUDED.base_price,
  condition_factors  = EXCLUDED.condition_factors,
  storage_adjustments = EXCLUDED.storage_adjustments,
  defect_adjustments = EXCLUDED.defect_adjustments,
  age_depreciation   = EXCLUDED.age_depreciation,
  demand_factor      = EXCLUDED.demand_factor,
  updated_at         = now();
