-- Current Nepal mobile buying-price catalog supplied 2026-07-30.
-- Idempotently adds all supplied brands, models and variants, and updates prices.
-- When a source line contains two amounts, the final amount is current and the
-- first is retained as the previous/regular price.

CREATE TEMP TABLE _mobile_prices_20260730 (
  brand_slug TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_slug TEXT NOT NULL,
  ram TEXT,
  storage TEXT NOT NULL,
  price INTEGER NOT NULL,
  old_price INTEGER
) ON COMMIT DROP;

INSERT INTO _mobile_prices_20260730
  (brand_slug, brand_name, model_name, model_slug, ram, storage, price, old_price)
VALUES
('samsung', 'Samsung', 'Galaxy A07', 'samsung-galaxy-a07', '4GB', '64GB', 18999, NULL),
('samsung', 'Samsung', 'Galaxy A07', 'samsung-galaxy-a07', '4GB', '128GB', 22499, NULL),
('samsung', 'Samsung', 'Galaxy A07', 'samsung-galaxy-a07', '6GB', '128GB', 26499, NULL),
('samsung', 'Samsung', 'Galaxy M17', 'samsung-galaxy-m17', '6GB', '128GB', 32999, NULL),
('samsung', 'Samsung', 'Galaxy A17', 'samsung-galaxy-a17', '6GB', '128GB', 33999, NULL),
('samsung', 'Samsung', 'Galaxy A17', 'samsung-galaxy-a17', '8GB', '128GB', 36999, NULL),
('samsung', 'Samsung', 'Galaxy A17', 'samsung-galaxy-a17', '8GB', '256GB', 44999, NULL),
('samsung', 'Samsung', 'Galaxy A27', 'samsung-galaxy-a27', '6GB', '128GB', 51999, 55999),
('samsung', 'Samsung', 'Galaxy A27', 'samsung-galaxy-a27', '8GB', '256GB', 65999, 69999),
('samsung', 'Samsung', 'Galaxy A37', 'samsung-galaxy-a37', '8GB', '128GB', 61999, NULL),
('samsung', 'Samsung', 'Galaxy A37', 'samsung-galaxy-a37', '8GB', '256GB', 69999, NULL),
('samsung', 'Samsung', 'Galaxy A37', 'samsung-galaxy-a37', '12GB', '256GB', 77999, NULL),
('samsung', 'Samsung', 'Galaxy A57', 'samsung-galaxy-a57', '8GB', '256GB', 79999, 84999),
('samsung', 'Samsung', 'Galaxy A57', 'samsung-galaxy-a57', '12GB', '256GB', 84999, 89999),
('samsung', 'Samsung', 'Galaxy S25 FE', 'samsung-galaxy-s25-fe', '8GB', '256GB', 107999, NULL),
('samsung', 'Samsung', 'Galaxy S25 Ultra', 'samsung-galaxy-s25-ultra', '12GB', '256GB', 184999, NULL),
('samsung', 'Samsung', 'Galaxy S26', 'samsung-galaxy-s26', '12GB', '256GB', 123999, 133999),
('samsung', 'Samsung', 'Galaxy S26+', 'samsung-galaxy-s26-plus', '12GB', '256GB', 159999, 182999),
('samsung', 'Samsung', 'Galaxy S26 Ultra', 'samsung-galaxy-s26-ultra', '12GB', '256GB', 202999, 212999),
('samsung', 'Samsung', 'Galaxy S26 Ultra', 'samsung-galaxy-s26-ultra', '12GB', '512GB', 232999, 222999),
('samsung', 'Samsung', 'Galaxy S26 Ultra', 'samsung-galaxy-s26-ultra', '16GB', '1TB', 283999, 293999),
('samsung', 'Samsung', 'Galaxy Z Flip 7', 'samsung-galaxy-z-flip-7', '12GB', '256GB', 154999, NULL),
('samsung', 'Samsung', 'Galaxy Z Fold 7', 'samsung-galaxy-z-fold-7', '12GB', '256GB', 279999, NULL),
('apple', 'Apple', 'iPhone 15', 'apple-iphone-15', NULL, '128GB', 127499, NULL),
('apple', 'Apple', 'iPhone 16e', 'apple-iphone-16e', NULL, '128GB', 105999, NULL),
('apple', 'Apple', 'iPhone 16', 'apple-iphone-16', NULL, '128GB', 146599, NULL),
('apple', 'Apple', 'iPhone 17e', 'apple-iphone-17e', NULL, '256GB', 132499, NULL),
('apple', 'Apple', 'iPhone 17e', 'apple-iphone-17e', NULL, '512GB', 175099, NULL),
('apple', 'Apple', 'iPhone 17', 'apple-iphone-17', NULL, '256GB', 173499, NULL),
('apple', 'Apple', 'iPhone 17', 'apple-iphone-17', NULL, '512GB', 215699, NULL),
('apple', 'Apple', 'iPhone Air', 'apple-iphone-air', NULL, '256GB', 190699, NULL),
('apple', 'Apple', 'iPhone Air', 'apple-iphone-air', NULL, '512GB', 232899, NULL),
('apple', 'Apple', 'iPhone Air', 'apple-iphone-air', NULL, '1TB', 275099, NULL),
('apple', 'Apple', 'iPhone 17 Pro', 'apple-iphone-17-pro', NULL, '256GB', 236899, NULL),
('apple', 'Apple', 'iPhone 17 Pro', 'apple-iphone-17-pro', NULL, '512GB', 279099, NULL),
('apple', 'Apple', 'iPhone 17 Pro', 'apple-iphone-17-pro', NULL, '1TB', 321299, NULL),
('apple', 'Apple', 'iPhone 17 Pro Max', 'apple-iphone-17-pro-max', NULL, '256GB', 257999, NULL),
('apple', 'Apple', 'iPhone 17 Pro Max', 'apple-iphone-17-pro-max', NULL, '512GB', 300199, NULL),
('apple', 'Apple', 'iPhone 17 Pro Max', 'apple-iphone-17-pro-max', NULL, '1TB', 342499, NULL),
('apple', 'Apple', 'iPhone 17 Pro Max', 'apple-iphone-17-pro-max', NULL, '2TB', 426999, NULL),
('xiaomi', 'Xiaomi', 'Redmi A7', 'xiaomi-redmi-a7', '3GB', '64GB', 20499, NULL),
('xiaomi', 'Xiaomi', 'Redmi A7 Pro', 'xiaomi-redmi-a7-pro', '4GB', '64GB', 21499, NULL),
('xiaomi', 'Xiaomi', 'Redmi A7 Pro', 'xiaomi-redmi-a7-pro', '4GB', '128GB', 23999, NULL),
('xiaomi', 'Xiaomi', 'Redmi 15C', 'xiaomi-redmi-15c', '4GB', '128GB', 19999, NULL),
('xiaomi', 'Xiaomi', 'Redmi 15C', 'xiaomi-redmi-15c', '6GB', '128GB', 21999, NULL),
('xiaomi', 'Xiaomi', 'Redmi 15C', 'xiaomi-redmi-15c', '8GB', '256GB', 24999, NULL),
('xiaomi', 'Xiaomi', 'Redmi 15', 'xiaomi-redmi-15', '6GB', '128GB', 24999, NULL),
('xiaomi', 'Xiaomi', 'Redmi 15', 'xiaomi-redmi-15', '8GB', '256GB', 27999, NULL),
('xiaomi', 'Xiaomi', 'Redmi Note 15 4G', 'xiaomi-redmi-note-15-4g', '6GB', '128GB', 33999, NULL),
('xiaomi', 'Xiaomi', 'Redmi Note 15 4G', 'xiaomi-redmi-note-15-4g', '8GB', '256GB', 39999, NULL),
('xiaomi', 'Xiaomi', 'Redmi Note 15 5G', 'xiaomi-redmi-note-15-5g', '8GB', '256GB', 43999, NULL),
('xiaomi', 'Xiaomi', 'Redmi Note 15 5G', 'xiaomi-redmi-note-15-5g', '12GB', '512GB', 49999, NULL),
('xiaomi', 'Xiaomi', 'Redmi Note 15 Pro 5G', 'xiaomi-redmi-note-15-pro-5g', '8GB', '256GB', 53999, NULL),
('xiaomi', 'Xiaomi', 'Redmi Note 15 Pro 5G', 'xiaomi-redmi-note-15-pro-5g', '12GB', '512GB', 59999, NULL),
('xiaomi', 'Xiaomi', 'Redmi Note 15 Pro+', 'xiaomi-redmi-note-15-pro-plus', '8GB', '256GB', 63999, NULL),
('xiaomi', 'Xiaomi', 'Redmi Note 15 Pro+', 'xiaomi-redmi-note-15-pro-plus', '12GB', '512GB', 69999, NULL),
('xiaomi', 'Xiaomi', 'Xiaomi 17T', 'xiaomi-xiaomi-17t', '12GB', '512GB', 89999, NULL),
('xiaomi', 'Xiaomi', 'Xiaomi 17 Ultra', 'xiaomi-xiaomi-17-ultra', '16GB', '512GB', 199999, NULL),
('honor', 'Honor', 'Honor Play10', 'honor-honor-play10', '3GB', '64GB', 17499, NULL),
('honor', 'Honor', 'Honor Play10', 'honor-honor-play10', '4GB', '128GB', 19999, NULL),
('honor', 'Honor', 'Honor X5c', 'honor-honor-x5c', '4GB', '64GB', 20499, NULL),
('honor', 'Honor', 'Honor X5c Plus', 'honor-honor-x5c-plus', '4GB', '128GB', 22499, NULL),
('honor', 'Honor', 'Honor X6c', 'honor-honor-x6c', '6GB', '128GB', 23499, NULL),
('honor', 'Honor', 'Honor X6c', 'honor-honor-x6c', '6GB', '256GB', 25499, NULL),
('honor', 'Honor', 'Honor X7d', 'honor-honor-x7d', '8GB', '256GB', 33999, NULL),
('honor', 'Honor', 'Honor X8d', 'honor-honor-x8d', '8GB', '128GB', 39999, NULL),
('honor', 'Honor', 'Honor X8d', 'honor-honor-x8d', '8GB', '256GB', 43999, NULL),
('honor', 'Honor', 'Honor X9d', 'honor-honor-x9d', '8GB', '256GB', 54999, NULL),
('honor', 'Honor', 'Honor X9d', 'honor-honor-x9d', '12GB', '256GB', 59999, NULL),
('honor', 'Honor', 'Honor 600 Lite', 'honor-honor-600-lite', '8GB', '256GB', 59999, NULL),
('honor', 'Honor', 'Honor 600', 'honor-honor-600', '8GB', '256GB', 84999, NULL),
('honor', 'Honor', 'Honor 600', 'honor-honor-600', '12GB', '256GB', 89999, NULL),
('honor', 'Honor', 'Honor 600 Pro', 'honor-honor-600-pro', '12GB', '256GB', 129999, NULL),
('honor', 'Honor', 'Honor Magic 8 Pro', 'honor-honor-magic-8-pro', '12GB', '512GB', 199999, NULL),
('honor', 'Honor', 'Honor Magic V5', 'honor-honor-magic-v5', '16GB', '512GB', 266999, NULL),
('poco', 'POCO', 'POCO M8s', 'poco-poco-m8s', '6GB', '128GB', 37999, NULL),
('poco', 'POCO', 'POCO M8s', 'poco-poco-m8s', '8GB', '256GB', 44999, NULL),
('poco', 'POCO', 'POCO M8 Pro', 'poco-poco-m8-pro', '8GB', '256GB', 56999, NULL),
('poco', 'POCO', 'POCO X8 Pro', 'poco-poco-x8-pro', '8GB', '256GB', 63999, NULL),
('poco', 'POCO', 'POCO X8 Pro', 'poco-poco-x8-pro', '12GB', '256GB', 73999, NULL),
('poco', 'POCO', 'POCO X8 Pro Max', 'poco-poco-x8-pro-max', '12GB', '256GB', 79999, NULL),
('poco', 'POCO', 'POCO X8 Pro Max', 'poco-poco-x8-pro-max', '12GB', '512GB', 89999, NULL),
('poco', 'POCO', 'POCO F8 Pro', 'poco-poco-f8-pro', '12GB', '512GB', 99999, NULL),
('vivo', 'Vivo', 'Vivo Y05', 'vivo-vivo-y05', '4GB', '64GB', 21999, NULL),
('vivo', 'Vivo', 'Vivo Y05', 'vivo-vivo-y05', '4GB', '128GB', 24999, NULL),
('vivo', 'Vivo', 'Vivo Y11d', 'vivo-vivo-y11d', '4GB', '128GB', 27999, NULL),
('vivo', 'Vivo', 'Vivo Y11d', 'vivo-vivo-y11d', '6GB', '128GB', 33999, NULL),
('vivo', 'Vivo', 'Vivo Y31d', 'vivo-vivo-y31d', '4GB', '128GB', 32999, NULL),
('vivo', 'Vivo', 'Vivo Y31d', 'vivo-vivo-y31d', '6GB', '128GB', 37999, NULL),
('vivo', 'Vivo', 'Vivo Y31d', 'vivo-vivo-y31d', '8GB', '128GB', 43999, NULL),
('vivo', 'Vivo', 'Vivo Y31d', 'vivo-vivo-y31d', '8GB', '256GB', 51999, NULL),
('vivo', 'Vivo', 'Vivo Y21 5G', 'vivo-vivo-y21-5g', '6GB', '128GB', 40999, NULL),
('vivo', 'Vivo', 'Vivo V60 Lite 4G', 'vivo-vivo-v60-lite-4g', '8GB', '256GB', 43499, NULL),
('vivo', 'Vivo', 'Vivo V60 Lite 5G', 'vivo-vivo-v60-lite-5g', '12GB', '256GB', 51999, NULL),
('vivo', 'Vivo', 'Vivo Y500', 'vivo-vivo-y500', '8GB', '128GB', 54999, NULL),
('vivo', 'Vivo', 'Vivo Y500', 'vivo-vivo-y500', '8GB', '256GB', 61999, NULL),
('vivo', 'Vivo', 'Vivo V70 FE', 'vivo-vivo-v70-fe', '8GB', '256GB', 62999, NULL),
('vivo', 'Vivo', 'Vivo V70 FE', 'vivo-vivo-v70-fe', '12GB', '256GB', 72999, NULL),
('vivo', 'Vivo', 'Vivo V60 5G', 'vivo-vivo-v60-5g', '12GB', '256GB', 74999, NULL),
('vivo', 'Vivo', 'Vivo V60 5G', 'vivo-vivo-v60-5g', '12GB', '512GB', 79999, NULL),
('vivo', 'Vivo', 'Vivo V70 5G', 'vivo-vivo-v70-5g', '8GB', '256GB', 84999, NULL),
('vivo', 'Vivo', 'Vivo V70 5G', 'vivo-vivo-v70-5g', '12GB', '256GB', 102999, NULL),
('vivo', 'Vivo', 'Vivo V70 5G', 'vivo-vivo-v70-5g', '12GB', '512GB', 122999, NULL),
('vivo', 'Vivo', 'Vivo X300 Pro', 'vivo-vivo-x300-pro', '16GB', '512GB', 179999, NULL),
('nothing', 'Nothing', 'Nothing Phone (3a) Lite', 'nothing-nothing-phone-3a-lite', '8GB', '128GB', 40999, NULL),
('nothing', 'Nothing', 'Nothing Phone (3a) Lite', 'nothing-nothing-phone-3a-lite', '8GB', '256GB', 45999, NULL),
('nothing', 'Nothing', 'Nothing Phone (4b)', 'nothing-nothing-phone-4b', '8GB', '128GB', 59999, NULL),
('nothing', 'Nothing', 'Nothing Phone (4a)', 'nothing-nothing-phone-4a', '8GB', '128GB', 64999, NULL),
('nothing', 'Nothing', 'Nothing Phone (4a)', 'nothing-nothing-phone-4a', '8GB', '256GB', 71999, NULL),
('nothing', 'Nothing', 'Nothing Phone (4a)', 'nothing-nothing-phone-4a', '12GB', '256GB', 78999, NULL),
('nothing', 'Nothing', 'Nothing Phone (4a) Pro', 'nothing-nothing-phone-4a-pro', '12GB', '256GB', 93999, NULL),
('nothing', 'Nothing', 'Nothing Phone (3)', 'nothing-nothing-phone-3', '12GB', '256GB', 89999, 104999),
('nothing', 'Nothing', 'Nothing Phone (3)', 'nothing-nothing-phone-3', '16GB', '512GB', 99999, 119999),
('oneplus', 'OnePlus', 'OnePlus Nord CE 5', 'oneplus-oneplus-nord-ce-5', '8GB', '256GB', 53999, NULL),
('oneplus', 'OnePlus', 'OnePlus Nord 6', 'oneplus-oneplus-nord-6', '8GB', '256GB', 89999, NULL),
('oneplus', 'OnePlus', 'OnePlus Nord 6', 'oneplus-oneplus-nord-6', '12GB', '256GB', 100999, NULL),
('oneplus', 'OnePlus', 'OnePlus 15R', 'oneplus-oneplus-15r', '12GB', '256GB', 98499, NULL),
('oneplus', 'OnePlus', 'OnePlus 15R', 'oneplus-oneplus-15r', '12GB', '512GB', 106999, NULL),
('oneplus', 'OnePlus', 'OnePlus 15', 'oneplus-oneplus-15', '16GB', '512GB', 169999, NULL),
('infinix', 'Infinix', 'Infinix Smart 20', 'infinix-infinix-smart-20', '4GB', '64GB', 19999, NULL),
('infinix', 'Infinix', 'Infinix Smart 20', 'infinix-infinix-smart-20', '4GB', '128GB', 21999, NULL),
('infinix', 'Infinix', 'Infinix Hot 70', 'infinix-infinix-hot-70', '6GB', '128GB', 31999, NULL),
('infinix', 'Infinix', 'Infinix Hot 70', 'infinix-infinix-hot-70', '8GB', '128GB', 34999, NULL),
('infinix', 'Infinix', 'Infinix GT 30 Pro', 'infinix-infinix-gt-30-pro', '8GB', '256GB', 55999, NULL),
('infinix', 'Infinix', 'Infinix GT 30 Pro', 'infinix-infinix-gt-30-pro', '12GB', '256GB', 59999, NULL),
('infinix', 'Infinix', 'Infinix Note Edge', 'infinix-infinix-note-edge', '8GB', '128GB', 41999, NULL),
('infinix', 'Infinix', 'Infinix Note Edge', 'infinix-infinix-note-edge', '8GB', '256GB', 47999, NULL),
('infinix', 'Infinix', 'Infinix Note 60', 'infinix-infinix-note-60', '8GB', '128GB', 45999, NULL),
('infinix', 'Infinix', 'Infinix Note 60', 'infinix-infinix-note-60', '8GB', '256GB', 51999, NULL),
('infinix', 'Infinix', 'Infinix Note 60 Pro', 'infinix-infinix-note-60-pro', '8GB', '256GB', 59999, NULL),
('infinix', 'Infinix', 'Infinix Note 60 Pro', 'infinix-infinix-note-60-pro', '12GB', '256GB', 66999, NULL),
('realme', 'Realme', 'Realme Note 60x', 'realme-realme-note-60x', '3GB', '64GB', 15999, NULL),
('realme', 'Realme', 'Realme Note 60x', 'realme-realme-note-60x', '4GB', '64GB', 16999, NULL),
('realme', 'Realme', 'Realme Note 60x', 'realme-realme-note-60x', '4GB', '128GB', 22999, NULL),
('realme', 'Realme', 'Realme Note 70', 'realme-realme-note-70', '4GB', '64GB', 15499, NULL),
('realme', 'Realme', 'Realme Note 70', 'realme-realme-note-70', '4GB', '128GB', 20999, NULL),
('realme', 'Realme', 'Realme Note 70', 'realme-realme-note-70', '6GB', '128GB', 23999, NULL),
('realme', 'Realme', 'Realme Note 80', 'realme-realme-note-80', '4GB', '64GB', 21999, NULL),
('realme', 'Realme', 'Realme C71', 'realme-realme-c71', '4GB', '128GB', 20999, NULL),
('realme', 'Realme', 'Realme C71', 'realme-realme-c71', '6GB', '128GB', 25999, NULL),
('realme', 'Realme', 'Realme C100i', 'realme-realme-c100i', '4GB', '128GB', 28999, NULL),
('realme', 'Realme', 'Realme C85', 'realme-realme-c85', '8GB', '256GB', 39999, NULL),
('realme', 'Realme', 'Realme C85 Pro', 'realme-realme-c85-pro', '8GB', '128GB', 36999, NULL),
('realme', 'Realme', 'Realme P3', 'realme-realme-p3', '8GB', '256GB', 44999, NULL),
('realme', 'Realme', 'Realme P3 Ultra', 'realme-realme-p3-ultra', '12GB', '256GB', 65999, NULL),
('realme', 'Realme', 'Realme 15 Pro', 'realme-realme-15-pro', '12GB', '256GB', 66999, NULL),
('realme', 'Realme', 'Realme 15 Pro', 'realme-realme-15-pro', '12GB', '512GB', 71999, NULL),
('realme', 'Realme', 'Realme GT8 Pro', 'realme-realme-gt8-pro', '16GB', '512GB', 149999, NULL),
('realme', 'Realme', 'Realme GT8 Pro (Aston Martin Edition)', 'realme-realme-gt8-pro-aston-martin-edition', NULL, 'Unspecified', 159999, NULL),
('oppo', 'OPPO', 'OPPO A6c', 'oppo-oppo-a6c', '4GB', '64GB', 22999, NULL),
('oppo', 'OPPO', 'OPPO A6c', 'oppo-oppo-a6c', '4GB', '128GB', 30999, NULL),
('oppo', 'OPPO', 'OPPO A6X', 'oppo-oppo-a6x', '6GB', '128GB', 32499, NULL),
('oppo', 'OPPO', 'OPPO A6', 'oppo-oppo-a6', '8GB', '128GB', 40999, NULL),
('oppo', 'OPPO', 'OPPO A6', 'oppo-oppo-a6', '8GB', '256GB', 43999, NULL),
('oppo', 'OPPO', 'OPPO A6 Pro', 'oppo-oppo-a6-pro', '8GB', '256GB', 48999, NULL),
('oppo', 'OPPO', 'OPPO A6s Pro', 'oppo-oppo-a6s-pro', '8GB', '256GB', 56999, NULL),
('oppo', 'OPPO', 'OPPO Reno 15F', 'oppo-oppo-reno-15f', '8GB', '256GB', 63999, NULL),
('oppo', 'OPPO', 'OPPO Reno 15F', 'oppo-oppo-reno-15f', '12GB', '512GB', 69999, NULL),
('oppo', 'OPPO', 'OPPO Reno 15', 'oppo-oppo-reno-15', '12GB', '512GB', 89999, NULL),
('motorola', 'Motorola', 'Moto G05', 'motorola-moto-g05', '4GB', '64GB', 14499, NULL),
('motorola', 'Motorola', 'Moto G06 Power', 'motorola-moto-g06-power', '4GB', '64GB', 24999, NULL),
('motorola', 'Motorola', 'Moto G35', 'motorola-moto-g35', '4GB', '128GB', 19999, NULL),
('motorola', 'Motorola', 'Moto G64', 'motorola-moto-g64', '8GB', '128GB', 27499, NULL),
('motorola', 'Motorola', 'Moto G64', 'motorola-moto-g64', '12GB', '256GB', 30999, NULL),
('motorola', 'Motorola', 'Moto G57 Power', 'motorola-moto-g57-power', '8GB', '128GB', 37499, NULL),
('motorola', 'Motorola', 'Moto G96', 'motorola-moto-g96', '8GB', '256GB', 44999, NULL),
('motorola', 'Motorola', 'Moto Edge 50 Fusion', 'motorola-moto-edge-50-fusion', '12GB', '256GB', 46999, NULL),
('zte', 'ZTE', 'Nubia A36', 'zte-nubia-a36', '4GB', '64GB', 15999, NULL),
('zte', 'ZTE', 'Nubia A56', 'zte-nubia-a56', '4GB', '128GB', 16999, NULL),
('zte', 'ZTE', 'Nubia V80 Max', 'zte-nubia-v80-max', '8GB', '128GB', 23999, NULL),
('zte', 'ZTE', 'Nubia V80 Max', 'zte-nubia-v80-max', '8GB', '256GB', 26999, NULL),
('zte', 'ZTE', 'Nubia V80 Design', 'zte-nubia-v80-design', '8GB', '128GB', 24999, NULL),
('zte', 'ZTE', 'Nubia V80 Design', 'zte-nubia-v80-design', '8GB', '256GB', 27999, NULL),
('zte', 'ZTE', 'Nubia Neo 3 GT', 'zte-nubia-neo-3-gt', '12GB', '256GB', 36999, NULL),
('zte', 'ZTE', 'Nubia Neo 5', 'zte-nubia-neo-5', '8GB', '256GB', 55999, NULL),
('zte', 'ZTE', 'Nubia Neo 5 GT', 'zte-nubia-neo-5-gt', '12GB', '256GB', 77999, NULL),
('zte', 'ZTE', 'RedMagic 11 Pro', 'zte-redmagic-11-pro', '16GB', '512GB', 164999, NULL),
('aiplus', 'Ai+', 'Ai+ Pulse', 'ai-plus-ai-plus-pulse', '4GB', '64GB', 14999, NULL),
('aiplus', 'Ai+', 'Ai+ Pulse', 'ai-plus-ai-plus-pulse', '6GB', '128GB', 16499, NULL),
('aiplus', 'Ai+', 'Ai+ Pulse 2', 'ai-plus-ai-plus-pulse-2', '4GB', '64GB', 16999, NULL),
('aiplus', 'Ai+', 'Ai+ Nova 5G', 'ai-plus-ai-plus-nova-5g', '6GB', '128GB', 18499, NULL),
('aiplus', 'Ai+', 'Ai+ Nova 5G', 'ai-plus-ai-plus-nova-5g', '8GB', '128GB', 21999, NULL),
('tecno', 'Tecno', 'Spark 50', 'tecno-spark-50', '4GB', '128GB', 29999, NULL),
('tecno', 'Tecno', 'Spark 50', 'tecno-spark-50', '6GB', '128GB', 32999, NULL),
('tecno', 'Tecno', 'Pova Curve 2 5G', 'tecno-pova-curve-2-5g', '8GB', '256GB', 52999, NULL),
('tecno', 'Tecno', 'Spark Go 3', 'tecno-spark-go-3', '4GB', '64GB', 21999, NULL),
('tecno', 'Tecno', 'Spark Go 3', 'tecno-spark-go-3', '4GB', '128GB', 25999, NULL),
('tecno', 'Tecno', 'Spark 40 Pro', 'tecno-spark-40-pro', '8GB', '256GB', 33999, NULL),
('tecno', 'Tecno', 'Spark 30', 'tecno-spark-30', '8GB', '256GB', 29999, NULL),
('tecno', 'Tecno', 'Pova 6', 'tecno-pova-6', '12GB', '256GB', 44990, NULL);

INSERT INTO public.brands (name, slug, status)
SELECT DISTINCT brand_name, brand_slug, 'active'
FROM _mobile_prices_20260730
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'active';

INSERT INTO public.phone_models
  (brand_id, name, slug, release_year, status, market_status, search_keywords)
SELECT DISTINCT
  b.id,
  prices.model_name,
  prices.model_slug,
  2026,
  'active',
  'available',
  concat_ws(', ', prices.model_name, b.name, 'mobile price Nepal', 'best buying price')
FROM _mobile_prices_20260730 prices
JOIN public.brands b ON b.slug = prices.brand_slug
ON CONFLICT (slug) DO UPDATE SET
  brand_id = EXCLUDED.brand_id,
  name = EXCLUDED.name,
  status = 'active',
  market_status = 'available',
  updated_at = now();

INSERT INTO public.phone_variants
  (model_id, ram, storage, condition_type, status)
SELECT models.id, prices.ram, prices.storage, 'new', 'active'
FROM _mobile_prices_20260730 prices
JOIN public.phone_models models ON models.slug = prices.model_slug
ON CONFLICT (model_id, ram, storage, condition_type) DO UPDATE SET
  status = 'active',
  updated_at = now();

UPDATE public.phone_variant_prices current_price
SET
  regular_price = CASE
    WHEN prices.old_price > prices.price THEN prices.old_price
    ELSE prices.price
  END,
  sale_price = CASE
    WHEN prices.old_price > prices.price THEN prices.price
    ELSE NULL
  END,
  currency = 'NPR',
  stock_status = 'in_stock',
  updated_at = now()
FROM _mobile_prices_20260730 prices
JOIN public.phone_models models ON models.slug = prices.model_slug
JOIN public.phone_variants variants
  ON variants.model_id = models.id
 AND variants.ram IS NOT DISTINCT FROM prices.ram
 AND variants.storage = prices.storage
 AND variants.condition_type = 'new'
WHERE current_price.variant_id = variants.id
  AND current_price.is_default = true;

INSERT INTO public.phone_variant_prices
  (model_id, variant_id, regular_price, sale_price, currency, stock_status, is_default, sort_order)
SELECT
  models.id,
  variants.id,
  CASE
    WHEN prices.old_price > prices.price THEN prices.old_price
    ELSE prices.price
  END,
  CASE
    WHEN prices.old_price > prices.price THEN prices.price
    ELSE NULL
  END,
  'NPR',
  'in_stock',
  true,
  0
FROM _mobile_prices_20260730 prices
JOIN public.phone_models models ON models.slug = prices.model_slug
JOIN public.phone_variants variants
  ON variants.model_id = models.id
 AND variants.ram IS NOT DISTINCT FROM prices.ram
 AND variants.storage = prices.storage
 AND variants.condition_type = 'new'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.phone_variant_prices existing
  WHERE existing.variant_id = variants.id
    AND existing.is_default = true
);
