-- Nepal Price Data Seed - Samsung, Apple, Xiaomi, POCO, Honor, Vivo, Nothing, OnePlus, Realme, OPPO, Infinix, Motorola, ZTE, Tecno, Itel, Benco

BEGIN;

-- 1. Seed Brands
INSERT INTO public.brands (name, slug, logo_url, sort_order, active) VALUES
('Samsung', 'samsung', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/samsung-logo.svg', 1, true),
('Apple', 'apple', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/apple-logo.svg', 2, true),
('Xiaomi', 'xiaomi', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/xiaomi-logo.svg', 3, true),
('POCO', 'poco', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/poco-logo.svg', 4, true),
('Honor', 'honor', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/honor-logo.svg', 5, true),
('Vivo', 'vivo', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/vivo-logo.svg', 6, true),
('Nothing', 'nothing', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/nothing-logo.svg', 7, true),
('OnePlus', 'oneplus', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/oneplus-logo.svg', 8, true),
('Realme', 'realme', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/realme-logo.svg', 9, true),
('OPPO', 'oppo', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/oppo-logo.svg', 10, true),
('Infinix', 'infinix', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/infinix-logo.svg', 11, true),
('Motorola', 'motorola', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/motorola-logo.svg', 12, true),
('ZTE', 'zte', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/zte-logo.svg', 13, true),
('Tecno', 'tecno', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/tecno-logo.svg', 14, true),
('Itel', 'itel', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/itel-logo.svg', 15, true),
('Benco', 'benco', 'https://cdn.shopify.com/s/files/1/0057/8938/4802/files/benco-logo.svg', 16, true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed Samsung Products with Price List Flag
INSERT INTO public.catalog_products (name, slug, brand_id, price_npr, price_text, is_price_list_item, specs_json, verified) 
SELECT 
  'Samsung Galaxy A07 (4+64GB)', 'samsung-galaxy-a07-4-64', (SELECT id FROM brands WHERE slug='samsung'), 18999, 'Rs. 18,999', true, '{"storage": "64GB", "ram": "4GB"}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A07 (4+128GB)', 'samsung-galaxy-a07-4-128', (SELECT id FROM brands WHERE slug='samsung'), 22499, 'Rs. 22,499', true, '{"storage": "128GB", "ram": "4GB"}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A07 (6+128GB)', 'samsung-galaxy-a07-6-128', (SELECT id FROM brands WHERE slug='samsung'), 26499, 'Rs. 26,499', true, '{"storage": "128GB", "ram": "6GB"}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy M17 5G (6+128GB)', 'samsung-galaxy-m17-6-128', (SELECT id FROM brands WHERE slug='samsung'), 32999, 'Rs. 32,999', true, '{"storage": "128GB", "ram": "6GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A17 5G (6+128GB)', 'samsung-galaxy-a17-6-128', (SELECT id FROM brands WHERE slug='samsung'), 33999, 'Rs. 33,999', true, '{"storage": "128GB", "ram": "6GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A17 5G (8+128GB)', 'samsung-galaxy-a17-8-128', (SELECT id FROM brands WHERE slug='samsung'), 36999, 'Rs. 36,999', true, '{"storage": "128GB", "ram": "8GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A17 5G (8+256GB)', 'samsung-galaxy-a17-8-256', (SELECT id FROM brands WHERE slug='samsung'), 44999, 'Rs. 44,999', true, '{"storage": "256GB", "ram": "8GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy M36 5G (8+128GB)', 'samsung-galaxy-m36-8-128', (SELECT id FROM brands WHERE slug='samsung'), 41999, 'Rs. 41,999', true, '{"storage": "128GB", "ram": "8GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy M36 5G (8+256GB)', 'samsung-galaxy-m36-8-256', (SELECT id FROM brands WHERE slug='samsung'), 47999, 'Rs. 47,999', true, '{"storage": "256GB", "ram": "8GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A36 5G (8+128GB)', 'samsung-galaxy-a36-8-128', (SELECT id FROM brands WHERE slug='samsung'), 53999, 'Rs. 53,999', true, '{"storage": "128GB", "ram": "8GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A36 5G (8+256GB)', 'samsung-galaxy-a36-8-256', (SELECT id FROM brands WHERE slug='samsung'), 59999, 'Rs. 59,999', true, '{"storage": "256GB", "ram": "8GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A36 5G (12+256GB)', 'samsung-galaxy-a36-12-256', (SELECT id FROM brands WHERE slug='samsung'), 65999, 'Rs. 65,999', true, '{"storage": "256GB", "ram": "12GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A37 5G (8+128GB)', 'samsung-galaxy-a37-8-128', (SELECT id FROM brands WHERE slug='samsung'), 64999, 'Rs. 64,999 (New)', true, '{"storage": "128GB", "ram": "8GB", "5g": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A37 5G (8+256GB)', 'samsung-galaxy-a37-8-256', (SELECT id FROM brands WHERE slug='samsung'), 72999, 'Rs. 72,999 (New)', true, '{"storage": "256GB", "ram": "8GB", "5g": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A37 5G (12+256GB)', 'samsung-galaxy-a37-12-256', (SELECT id FROM brands WHERE slug='samsung'), 79999, 'Rs. 79,999 (New)', true, '{"storage": "256GB", "ram": "12GB", "5g": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A56 5G (8+256GB)', 'samsung-galaxy-a56-8-256', (SELECT id FROM brands WHERE slug='samsung'), 71999, 'Rs. 71,999', true, '{"storage": "256GB", "ram": "8GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A56 5G (12+256GB)', 'samsung-galaxy-a56-12-256', (SELECT id FROM brands WHERE slug='samsung'), 77999, 'Rs. 77,999', true, '{"storage": "256GB", "ram": "12GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A57 5G (8+256GB)', 'samsung-galaxy-a57-8-256', (SELECT id FROM brands WHERE slug='samsung'), 84999, 'Rs. 84,999 (New)', true, '{"storage": "256GB", "ram": "8GB", "5g": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy A57 5G (12+256GB)', 'samsung-galaxy-a57-12-256', (SELECT id FROM brands WHERE slug='samsung'), 89999, 'Rs. 89,999 (New)', true, '{"storage": "256GB", "ram": "12GB", "5g": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy S25 FE (8+256GB)', 'samsung-galaxy-s25-fe', (SELECT id FROM brands WHERE slug='samsung'), 107999, 'Rs. 107,999', true, '{"storage": "256GB", "ram": "8GB", "5g": true, "flagship": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy S25 Ultra (12+256GB)', 'samsung-galaxy-s25-ultra-12-256', (SELECT id FROM brands WHERE slug='samsung'), 184999, 'Rs. 184,999', true, '{"storage": "256GB", "ram": "12GB", "5g": true, "flagship": true, "ultra": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy S25 Ultra (12+512GB)', 'samsung-galaxy-s25-ultra-12-512', (SELECT id FROM brands WHERE slug='samsung'), 199999, 'Rs. 199,999', true, '{"storage": "512GB", "ram": "12GB", "5g": true, "flagship": true, "ultra": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy S25 Ultra (12+1TB)', 'samsung-galaxy-s25-ultra-12-1tb', (SELECT id FROM brands WHERE slug='samsung'), 234999, 'Rs. 234,999', true, '{"storage": "1TB", "ram": "12GB", "5g": true, "flagship": true, "ultra": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy S26 (12+256GB)', 'samsung-galaxy-s26-12-256', (SELECT id FROM brands WHERE slug='samsung'), 133999, 'Rs. 133,999 (New)', true, '{"storage": "256GB", "ram": "12GB", "5g": true, "flagship": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy S26+ (12+256GB)', 'samsung-galaxy-s26plus-12-256', (SELECT id FROM brands WHERE slug='samsung'), 182999, 'Rs. 182,999 (New)', true, '{"storage": "256GB", "ram": "12GB", "5g": true, "flagship": true, "plus": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy S26 Ultra (12+256GB)', 'samsung-galaxy-s26-ultra-12-256', (SELECT id FROM brands WHERE slug='samsung'), 212999, 'Rs. 212,999 (New)', true, '{"storage": "256GB", "ram": "12GB", "5g": true, "flagship": true, "ultra": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy S26 Ultra (12+512GB)', 'samsung-galaxy-s26-ultra-12-512', (SELECT id FROM brands WHERE slug='samsung'), 242999, 'Rs. 242,999 (New)', true, '{"storage": "512GB", "ram": "12GB", "5g": true, "flagship": true, "ultra": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy S26 Ultra (16+1TB)', 'samsung-galaxy-s26-ultra-16-1tb', (SELECT id FROM brands WHERE slug='samsung'), 292999, 'Rs. 292,999 (New)', true, '{"storage": "1TB", "ram": "16GB", "5g": true, "flagship": true, "ultra": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy Z Flip 7 (12+256GB)', 'samsung-galaxy-z-flip7-12-256', (SELECT id FROM brands WHERE slug='samsung'), 154999, 'Rs. 154,999', true, '{"storage": "256GB", "ram": "12GB", "5g": true, "foldable": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy Z Fold 7 (12+256GB)', 'samsung-galaxy-z-fold7-12-256', (SELECT id FROM brands WHERE slug='samsung'), 244999, 'Rs. 244,999', true, '{"storage": "256GB", "ram": "12GB", "5g": true, "foldable": true}'::jsonb, true
UNION ALL SELECT 'Samsung Galaxy Z Fold 7 (12+512GB)', 'samsung-galaxy-z-fold7-12-512', (SELECT id FROM brands WHERE slug='samsung'), 259999, 'Rs. 259,999', true, '{"storage": "512GB", "ram": "12GB", "5g": true, "foldable": true}'::jsonb, true
ON CONFLICT (slug) DO NOTHING;

-- 3. Seed Apple Products
INSERT INTO public.catalog_products (name, slug, brand_id, price_npr, price_text, is_price_list_item, specs_json, verified) 
SELECT 
  'Apple iPhone 13 (128GB)', 'apple-iphone-13-128', (SELECT id FROM brands WHERE slug='apple'), 80399, 'Rs. 80,399', true, '{"storage": "128GB", "series": "13"}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 14 (128GB)', 'apple-iphone-14-128', (SELECT id FROM brands WHERE slug='apple'), 93499, 'Rs. 93,499', true, '{"storage": "128GB", "series": "14"}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 15 (128GB)', 'apple-iphone-15-128', (SELECT id FROM brands WHERE slug='apple'), 110999, 'Rs. 110,999', true, '{"storage": "128GB", "series": "15"}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 16e (128GB)', 'apple-iphone-16e-128', (SELECT id FROM brands WHERE slug='apple'), 102299, 'Rs. 102,299', true, '{"storage": "128GB", "series": "16", "variant": "e"}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 16 (128GB)', 'apple-iphone-16-128', (SELECT id FROM brands WHERE slug='apple'), 141499, 'Rs. 141,499', true, '{"storage": "128GB", "series": "16"}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 17e (256GB)', 'apple-iphone-17e-256', (SELECT id FROM brands WHERE slug='apple'), 127799, 'Rs. 127,799 (New)', true, '{"storage": "256GB", "series": "17", "variant": "e", "new": true}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 17e (512GB)', 'apple-iphone-17e-512', (SELECT id FROM brands WHERE slug='apple'), 168999, 'Rs. 168,999 (New)', true, '{"storage": "512GB", "series": "17", "variant": "e", "new": true}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 17 (256GB)', 'apple-iphone-17-256', (SELECT id FROM brands WHERE slug='apple'), 167999, 'Rs. 167,999', true, '{"storage": "256GB", "series": "17"}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 17 (512GB)', 'apple-iphone-17-512', (SELECT id FROM brands WHERE slug='apple'), 208999, 'Rs. 208,999', true, '{"storage": "512GB", "series": "17"}'::jsonb, true
UNION ALL SELECT 'Apple iPhone Air (256GB)', 'apple-iphone-air-256', (SELECT id FROM brands WHERE slug='apple'), 183999, 'Rs. 183,999', true, '{"storage": "256GB", "series": "air", "flagship": true}'::jsonb, true
UNION ALL SELECT 'Apple iPhone Air (512GB)', 'apple-iphone-air-512', (SELECT id FROM brands WHERE slug='apple'), 224999, 'Rs. 224,999', true, '{"storage": "512GB", "series": "air", "flagship": true}'::jsonb, true
UNION ALL SELECT 'Apple iPhone Air (1TB)', 'apple-iphone-air-1tb', (SELECT id FROM brands WHERE slug='apple'), 265999, 'Rs. 265,999', true, '{"storage": "1TB", "series": "air", "flagship": true}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 17 Pro (256GB)', 'apple-iphone-17-pro-256', (SELECT id FROM brands WHERE slug='apple'), 228999, 'Rs. 228,999', true, '{"storage": "256GB", "series": "17", "pro": true, "flagship": true}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 17 Pro (512GB)', 'apple-iphone-17-pro-512', (SELECT id FROM brands WHERE slug='apple'), 269999, 'Rs. 269,999', true, '{"storage": "512GB", "series": "17", "pro": true, "flagship": true}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 17 Pro (1TB)', 'apple-iphone-17-pro-1tb', (SELECT id FROM brands WHERE slug='apple'), 309999, 'Rs. 309,999', true, '{"storage": "1TB", "series": "17", "pro": true, "flagship": true}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 17 Pro Max (256GB)', 'apple-iphone-17-promax-256', (SELECT id FROM brands WHERE slug='apple'), 248999, 'Rs. 248,999', true, '{"storage": "256GB", "series": "17", "promax": true, "flagship": true}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 17 Pro Max (512GB)', 'apple-iphone-17-promax-512', (SELECT id FROM brands WHERE slug='apple'), 289999, 'Rs. 289,999', true, '{"storage": "512GB", "series": "17", "promax": true, "flagship": true}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 17 Pro Max (1TB)', 'apple-iphone-17-promax-1tb', (SELECT id FROM brands WHERE slug='apple'), 309999, 'Rs. 309,999', true, '{"storage": "1TB", "series": "17", "promax": true, "flagship": true}'::jsonb, true
UNION ALL SELECT 'Apple iPhone 17 Pro Max (2TB)', 'apple-iphone-17-promax-2tb', (SELECT id FROM brands WHERE slug='apple'), 411999, 'Rs. 411,999', true, '{"storage": "2TB", "series": "17", "promax": true, "flagship": true}'::jsonb, true
ON CONFLICT (slug) DO NOTHING;

-- 4. Seed Xiaomi, POCO, Honor, Vivo, Nothing, OnePlus, Realme Products (truncated for brevity, seed top models)
INSERT INTO public.catalog_products (name, slug, brand_id, price_npr, price_text, is_price_list_item, specs_json, verified) 
SELECT 
  'Xiaomi Redmi Note 15 5G (8+256GB)', 'xiaomi-redmi-note-15-5g-8-256', (SELECT id FROM brands WHERE slug='xiaomi'), 39999, 'Rs. 39,999', true, '{"storage": "256GB", "ram": "8GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Xiaomi Redmi Note 15 5G (12+512GB)', 'xiaomi-redmi-note-15-5g-12-512', (SELECT id FROM brands WHERE slug='xiaomi'), 46999, 'Rs. 46,999', true, '{"storage": "512GB", "ram": "12GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'Xiaomi 17 Ultra (16+512GB)', 'xiaomi-17-ultra-16-512', (SELECT id FROM brands WHERE slug='xiaomi'), 199999, 'Rs. 199,999 (New)', true, '{"storage": "512GB", "ram": "16GB", "5g": true, "flagship": true, "ultra": true, "new": true}'::jsonb, true
UNION ALL SELECT 'POCO X8 Pro (12/512GB)', 'poco-x8-pro-12-512', (SELECT id FROM brands WHERE slug='poco'), 89999, 'Rs. 89,999 (New)', true, '{"storage": "512GB", "ram": "12GB", "5g": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Honor X9d (12+256GB)', 'honor-x9d-12-256', (SELECT id FROM brands WHERE slug='honor'), 59999, 'Rs. 59,999 (New)', true, '{"storage": "256GB", "ram": "12GB", "5g": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Honor Magic 8 Pro (12+512GB)', 'honor-magic-8-pro-12-512', (SELECT id FROM brands WHERE slug='honor'), 199999, 'Rs. 199,999 (New)', true, '{"storage": "512GB", "ram": "12GB", "5g": true, "flagship": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Vivo V70 5G (12+512GB)', 'vivo-v70-5g-12-512', (SELECT id FROM brands WHERE slug='vivo'), 94999, 'Rs. 94,999 (New)', true, '{"storage": "512GB", "ram": "12GB", "5g": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Vivo X300 Pro (16+512GB)', 'vivo-x300-pro-16-512', (SELECT id FROM brands WHERE slug='vivo'), 179999, 'Rs. 179,999 (New)', true, '{"storage": "512GB", "ram": "16GB", "5g": true, "flagship": true, "ultra": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Nothing Phone (4a) (12+256GB)', 'nothing-phone-4a-12-256', (SELECT id FROM brands WHERE slug='nothing'), 69999, 'Rs. 69,999 (New)', true, '{"storage": "256GB", "ram": "12GB", "5g": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Nothing Phone (3) (16+512GB)', 'nothing-phone-3-16-512', (SELECT id FROM brands WHERE slug='nothing'), 114999, 'Rs. 114,999', true, '{"storage": "512GB", "ram": "16GB", "5g": true, "flagship": true}'::jsonb, true
UNION ALL SELECT 'OnePlus 15R (12+512GB)', 'oneplus-15r-12-512', (SELECT id FROM brands WHERE slug='oneplus'), 106999, 'Rs. 106,999 (New)', true, '{"storage": "512GB", "ram": "12GB", "5g": true, "flagship": true, "new": true}'::jsonb, true
UNION ALL SELECT 'OnePlus 13 (16+512GB)', 'oneplus-13-16-512', (SELECT id FROM brands WHERE slug='oneplus'), 141999, 'Rs. 141,999', true, '{"storage": "512GB", "ram": "16GB", "5g": true, "flagship": true}'::jsonb, true
UNION ALL SELECT 'Realme GT8 Pro (16/512GB)', 'realme-gt8-pro-16-512', (SELECT id FROM brands WHERE slug='realme'), 149999, 'Rs. 149,999 (New)', true, '{"storage": "512GB", "ram": "16GB", "5g": true, "flagship": true, "gt": true, "new": true}'::jsonb, true
UNION ALL SELECT 'Realme 15 Pro (12/512GB)', 'realme-15-pro-12-512', (SELECT id FROM brands WHERE slug='realme'), 71999, 'Rs. 71,999', true, '{"storage": "512GB", "ram": "12GB", "5g": true}'::jsonb, true
UNION ALL SELECT 'OPPO Reno 15 (12/512GB)', 'oppo-reno-15-12-512', (SELECT id FROM brands WHERE slug='oppo'), 89999, 'Rs. 89,999 (New)', true, '{"storage": "512GB", "ram": "12GB", "5g": true, "new": true}'::jsonb, true
UNION ALL SELECT 'OPPO Find N5 (16/512GB)', 'oppo-find-n5-16-512', (SELECT id FROM brands WHERE slug='oppo'), 249999, 'Rs. 249,999', true, '{"storage": "512GB", "ram": "16GB", "5g": true, "foldable": true, "flagship": true}'::jsonb, true
ON CONFLICT (slug) DO NOTHING;

COMMIT;
