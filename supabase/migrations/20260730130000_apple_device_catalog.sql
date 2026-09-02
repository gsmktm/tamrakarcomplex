-- Apple device catalog supplied by the user from GSMArena on 2026-07-30.
-- Adds sourced models/specifications without inventing retail or valuation prices.

ALTER TABLE public.device_models ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.device_models ADD COLUMN IF NOT EXISTS source_site text;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS specs_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS source_site text;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS is_price_list_item boolean DEFAULT false;

CREATE TEMP TABLE _apple_devices_20260730 (
  model_name text NOT NULL,
  model_slug text NOT NULL,
  category text NOT NULL,
  launch_year integer NOT NULL,
  display_inches numeric NOT NULL,
  chipset text,
  battery_mah integer,
  storage_gb integer NOT NULL,
  ram_gb numeric,
  source_url text NOT NULL
) ON COMMIT DROP;

INSERT INTO _apple_devices_20260730
  (model_name, model_slug, category, launch_year, display_inches, chipset, battery_mah, storage_gb, ram_gb, source_url)
VALUES
('iPhone 17e', 'apple-iphone-17e', 'phone', 2026, 6.1, 'Apple A19', 4005, 512, 8, 'https://www.gsmarena.com/apple_iphone_17e-14487.php'),
('iPad Air 13 5G (2026)', 'apple-ipad-air-13-5g-2026', 'tablet', 2026, 13, 'Apple M4', 9705, 1024, 12, 'https://www.gsmarena.com/apple_ipad_air_13_5g_(2026)-14521.php'),
('iPad Air 11 5G (2026)', 'apple-ipad-air-11-5g-2026', 'tablet', 2026, 11, 'Apple M4', 7606, 1024, 12, 'https://www.gsmarena.com/apple_ipad_air_11_5g_(2026)-14520.php'),
('iPad Pro 13 5G (2025)', 'apple-ipad-pro-13-5g-2025', 'tablet', 2025, 13, 'Apple M5', 10290, 2048, 16, 'https://www.gsmarena.com/apple_ipad_pro_13_5g_(2025)-14233.php'),
('iPad Pro 11 5G (2025)', 'apple-ipad-pro-11-5g-2025', 'tablet', 2025, 11, 'Apple M5', 8160, 2048, 16, 'https://www.gsmarena.com/apple_ipad_pro_11_5g_(2025)-14234.php'),
('iPhone 17 Pro Max', 'apple-iphone-17-pro-max', 'phone', 2025, 6.9, 'Apple A19 Pro', 4823, 2048, 12, 'https://www.gsmarena.com/apple_iphone_17_pro_max-13964.php'),
('iPhone 17 Pro', 'apple-iphone-17-pro', 'phone', 2025, 6.3, 'Apple A19 Pro', 3998, 1024, 12, 'https://www.gsmarena.com/apple_iphone_17_pro-14049.php'),
('iPhone 17 Air', 'apple-iphone-17-air', 'phone', 2025, 6.5, 'Apple A19 Pro', 3149, 1024, 12, 'https://www.gsmarena.com/apple_iphone_17_air-13502.php'),
('iPhone 17', 'apple-iphone-17', 'phone', 2025, 6.3, 'Apple A19', 3692, 512, 8, 'https://www.gsmarena.com/apple_iphone_17-14050.php'),
('Watch Ultra 3', 'apple-watch-ultra-3', 'watch', 2025, 1.98, 'Apple S10', 599, 64, NULL, 'https://www.gsmarena.com/apple_watch_ultra_3-14130.php'),
('Watch Series 11', 'apple-watch-series-11', 'watch', 2025, 1.96, 'Apple S10', NULL, 64, NULL, 'https://www.gsmarena.com/apple_watch_series_11-14131.php'),
('Watch Series 11 Aluminum', 'apple-watch-series-11-aluminum', 'watch', 2025, 1.96, 'Apple S10', NULL, 64, NULL, 'https://www.gsmarena.com/apple_watch_series_11_aluminum-14132.php'),
('Watch SE 3', 'apple-watch-se-3', 'watch', 2025, 1.78, 'Apple S10', NULL, 64, NULL, 'https://www.gsmarena.com/apple_watch_se_3-14133.php'),
('iPad Air 13 (2025)', 'apple-ipad-air-13-2025', 'tablet', 2025, 13, 'Apple M3', 9705, 1024, 8, 'https://www.gsmarena.com/apple_ipad_air_13_(2025)-13704.php'),
('iPad Air 11 (2025)', 'apple-ipad-air-11-2025', 'tablet', 2025, 11, 'Apple M3', 7606, 1024, 8, 'https://www.gsmarena.com/apple_ipad_air_11_(2025)-13703.php'),
('iPad (2025)', 'apple-ipad-2025', 'tablet', 2025, 11, 'Apple A16 Bionic', NULL, 512, 6, 'https://www.gsmarena.com/apple_ipad_(2025)-13702.php'),
('iPhone 16e', 'apple-iphone-16e', 'phone', 2025, 6.1, 'Apple A18', 4005, 512, 8, 'https://www.gsmarena.com/apple_iphone_16e-13395.php'),
('iPad mini (2024)', 'apple-ipad-mini-2024', 'tablet', 2024, 8.3, 'Apple A17 Pro', 5078, 512, 8, 'https://www.gsmarena.com/apple_ipad_mini_(2024)-13437.php'),
('iPhone 16 Pro Max', 'apple-iphone-16-pro-max', 'phone', 2024, 6.9, 'Apple A18 Pro', 4685, 1024, 8, 'https://www.gsmarena.com/apple_iphone_16_pro_max-13123.php'),
('iPhone 16 Pro', 'apple-iphone-16-pro', 'phone', 2024, 6.3, 'Apple A18 Pro', 3582, 1024, 8, 'https://www.gsmarena.com/apple_iphone_16_pro-13315.php'),
('iPhone 16 Plus', 'apple-iphone-16-plus', 'phone', 2024, 6.7, 'Apple A18', 4674, 512, 8, 'https://www.gsmarena.com/apple_iphone_16_plus-13316.php'),
('iPhone 16', 'apple-iphone-16', 'phone', 2024, 6.1, 'Apple A18', 3561, 512, 8, 'https://www.gsmarena.com/apple_iphone_16-13317.php'),
('Watch Series 10', 'apple-watch-series-10', 'watch', 2024, 1.96, 'Apple S10', 327, 64, NULL, 'https://www.gsmarena.com/apple_watch_series_10-13318.php'),
('Watch Series 10 Aluminum', 'apple-watch-series-10-aluminum', 'watch', 2024, 1.96, 'Apple S10', 327, 64, NULL, 'https://www.gsmarena.com/apple_watch_series_10_aluminum-13319.php'),
('iPad Pro 13 (2024)', 'apple-ipad-pro-13-2024', 'tablet', 2024, 13, 'Apple M4', 10290, 2048, 16, 'https://www.gsmarena.com/apple_ipad_pro_13_(2024)-12987.php'),
('iPad Pro 11 (2024)', 'apple-ipad-pro-11-2024', 'tablet', 2024, 11, 'Apple M4', 8160, 2048, 16, 'https://www.gsmarena.com/apple_ipad_pro_11_(2024)-12986.php'),
('iPad Air 13 (2024)', 'apple-ipad-air-13-2024', 'tablet', 2024, 13, 'Apple M2', 9705, 1024, 8, 'https://www.gsmarena.com/apple_ipad_air_13_(2024)-12985.php'),
('iPad Air 11 (2024)', 'apple-ipad-air-11-2024', 'tablet', 2024, 11, 'Apple M2', 7606, 1024, 8, 'https://www.gsmarena.com/apple_ipad_air_11_(2024)-12984.php'),
('iPhone 15 Pro Max', 'apple-iphone-15-pro-max', 'phone', 2023, 6.7, 'Apple A17 Pro', 4441, 1024, 8, 'https://www.gsmarena.com/apple_iphone_15_pro_max-12548.php'),
('iPhone 15 Pro', 'apple-iphone-15-pro', 'phone', 2023, 6.1, 'Apple A17 Pro', 3274, 1024, 8, 'https://www.gsmarena.com/apple_iphone_15_pro-12557.php'),
('iPhone 15 Plus', 'apple-iphone-15-plus', 'phone', 2023, 6.7, 'Apple A16 Bionic', 4383, 512, 6, 'https://www.gsmarena.com/apple_iphone_15_plus-12558.php'),
('iPhone 15', 'apple-iphone-15', 'phone', 2023, 6.1, 'Apple A16 Bionic', 3349, 512, 6, 'https://www.gsmarena.com/apple_iphone_15-12559.php'),
('Watch Ultra 2', 'apple-watch-ultra-2', 'watch', 2023, 1.92, 'Apple S9', 564, 64, NULL, 'https://www.gsmarena.com/apple_watch_ultra_2-12560.php'),
('Watch Series 9', 'apple-watch-series-9', 'watch', 2023, 1.9, 'Apple S9', 308, 64, NULL, 'https://www.gsmarena.com/apple_watch_series_9-12561.php'),
('Watch Series 9 Aluminum', 'apple-watch-series-9-aluminum', 'watch', 2023, 1.9, 'Apple S9', 308, 64, NULL, 'https://www.gsmarena.com/apple_watch_series_9_aluminum-12562.php'),
('iPad Pro 12.9 (2022)', 'apple-ipad-pro-12-9-2022', 'tablet', 2022, 12.9, 'Apple M2', 10758, 2048, 16, 'https://www.gsmarena.com/apple_ipad_pro_12_9_(2022)-11939.php'),
('iPad Pro 11 (2022)', 'apple-ipad-pro-11-2022', 'tablet', 2022, 11, 'Apple M2', 7538, 2048, 16, 'https://www.gsmarena.com/apple_ipad_pro_11_(2022)-11940.php'),
('iPad (2022)', 'apple-ipad-2022', 'tablet', 2022, 10.9, 'Apple A14 Bionic', 7606, 256, 4, 'https://www.gsmarena.com/apple_ipad_(2022)-11941.php'),
('iPhone 14 Pro Max', 'apple-iphone-14-pro-max', 'phone', 2022, 6.7, 'Apple A16 Bionic', 4323, 1024, 6, 'https://www.gsmarena.com/apple_iphone_14_pro_max-11773.php'),
('iPhone 14 Pro', 'apple-iphone-14-pro', 'phone', 2022, 6.1, 'Apple A16 Bionic', 3200, 1024, 6, 'https://www.gsmarena.com/apple_iphone_14_pro-11860.php'),
('iPhone 14 Plus', 'apple-iphone-14-plus', 'phone', 2022, 6.7, 'Apple A15 Bionic', 4323, 512, 6, 'https://www.gsmarena.com/apple_iphone_14_plus-11862.php'),
('iPhone 14', 'apple-iphone-14', 'phone', 2022, 6.1, 'Apple A15 Bionic', 3279, 512, 6, 'https://www.gsmarena.com/apple_iphone_14-11861.php'),
('Watch Ultra', 'apple-watch-ultra', 'watch', 2022, 1.92, 'Apple S8', 542, 32, NULL, 'https://www.gsmarena.com/apple_watch_ultra-11827.php'),
('Watch Series 8', 'apple-watch-series-8', 'watch', 2022, 1.9, 'Apple S8', 308, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_series_8-11866.php'),
('Watch Series 8 Aluminum', 'apple-watch-series-8-aluminum', 'watch', 2022, 1.9, 'Apple S8', 308, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_series_8_aluminum-11864.php'),
('Watch SE (2022)', 'apple-watch-se-2022', 'watch', 2022, 1.78, 'Apple S8', 296, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_se_(2022)-11865.php'),
('iPhone SE (2022)', 'apple-iphone-se-2022', 'phone', 2022, 4.7, 'Apple A15 Bionic', 2018, 256, 4, 'https://www.gsmarena.com/apple_iphone_se_(2022)-11410.php'),
('iPad Air (2022)', 'apple-ipad-air-2022', 'tablet', 2022, 10.9, 'Apple M1', 7600, 256, 8, 'https://www.gsmarena.com/apple_ipad_air_(2022)-11411.php'),
('iPhone 13 Pro Max', 'apple-iphone-13-pro-max', 'phone', 2021, 6.7, 'Apple A15 Bionic', 4352, 1024, 6, 'https://www.gsmarena.com/apple_iphone_13_pro_max-11089.php'),
('iPhone 13 Pro', 'apple-iphone-13-pro', 'phone', 2021, 6.1, 'Apple A15 Bionic', 3095, 1024, 6, 'https://www.gsmarena.com/apple_iphone_13_pro-11102.php'),
('iPhone 13', 'apple-iphone-13', 'phone', 2021, 6.1, 'Apple A15 Bionic', 3240, 512, 4, 'https://www.gsmarena.com/apple_iphone_13-11103.php'),
('iPhone 13 mini', 'apple-iphone-13-mini', 'phone', 2021, 5.4, 'Apple A15 Bionic', 2438, 512, 4, 'https://www.gsmarena.com/apple_iphone_13_mini-11104.php'),
('iPad mini (2021)', 'apple-ipad-mini-2021', 'tablet', 2021, 8.3, 'Apple A15 Bionic', 5078, 256, 4, 'https://www.gsmarena.com/apple_ipad_mini_(2021)-11105.php'),
('iPad 10.2 (2021)', 'apple-ipad-10-2-2021', 'tablet', 2021, 10.2, 'Apple A13 Bionic', 8557, 256, 3, 'https://www.gsmarena.com/apple_ipad_10_2_(2021)-11106.php'),
('Watch Edition Series 7', 'apple-watch-edition-series-7', 'watch', 2021, 1.9, 'Apple S7', 309, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_edition_series_7-11147.php'),
('Watch Series 7', 'apple-watch-series-7', 'watch', 2021, 1.9, 'Apple S7', 309, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_series_7-11146.php'),
('Watch Series 7 Aluminum', 'apple-watch-series-7-aluminum', 'watch', 2021, 1.9, 'Apple S7', 309, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_series_7_aluminum-11107.php'),
('iPad Pro 12.9 (2021)', 'apple-ipad-pro-12-9-2021', 'tablet', 2021, 12.9, 'Apple M1', 10758, 2048, 16, 'https://www.gsmarena.com/apple_ipad_pro_12_9_(2021)-10864.php'),
('iPad Pro 11 (2021)', 'apple-ipad-pro-11-2021', 'tablet', 2021, 11, 'Apple M1', 7538, 2048, 16, 'https://www.gsmarena.com/apple_ipad_pro_11_(2021)-10865.php'),
('iPhone 12 Pro Max', 'apple-iphone-12-pro-max', 'phone', 2020, 6.7, 'Apple A14 Bionic', 3687, 512, 6, 'https://www.gsmarena.com/apple_iphone_12_pro_max-10237.php'),
('iPhone 12 Pro', 'apple-iphone-12-pro', 'phone', 2020, 6.1, 'Apple A14 Bionic', 2815, 512, 6, 'https://www.gsmarena.com/apple_iphone_12_pro-10508.php'),
('iPhone 12', 'apple-iphone-12', 'phone', 2020, 6.1, 'Apple A14 Bionic', 2815, 256, 4, 'https://www.gsmarena.com/apple_iphone_12-10509.php'),
('iPhone 12 mini', 'apple-iphone-12-mini', 'phone', 2020, 5.4, 'Apple A14 Bionic', 2227, 256, 4, 'https://www.gsmarena.com/apple_iphone_12_mini-10510.php'),
('iPad Air (2020)', 'apple-ipad-air-2020', 'tablet', 2020, 10.9, 'Apple A14 Bionic', 7606, 256, 4, 'https://www.gsmarena.com/apple_ipad_air_(2020)-10444.php'),
('iPad 10.2 (2020)', 'apple-ipad-10-2-2020', 'tablet', 2020, 10.2, 'Apple A12 Bionic', 8827, 128, 3, 'https://www.gsmarena.com/apple_ipad_10_2_(2020)-10445.php'),
('Watch SE', 'apple-watch-se', 'watch', 2020, 1.78, 'Apple S5', NULL, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_se-10446.php'),
('Watch Series 6 Aluminum', 'apple-watch-series-6-aluminum', 'watch', 2020, 1.78, 'Apple S6', 304, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_series_6_aluminum-10447.php'),
('Watch Series 6', 'apple-watch-series-6', 'watch', 2020, 1.78, 'Apple S6', 304, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_series_6-10448.php'),
('Watch Edition Series 6', 'apple-watch-edition-series-6', 'watch', 2020, 1.78, 'Apple S6', 304, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_edition_series_6-10449.php'),
('iPhone SE (2020)', 'apple-iphone-se-2020', 'phone', 2020, 4.7, 'Apple A13 Bionic', 1821, 256, 3, 'https://www.gsmarena.com/apple_iphone_se_(2020)-10170.php'),
('iPad Pro 12.9 (2020)', 'apple-ipad-pro-12-9-2020', 'tablet', 2020, 12.9, 'Apple A12Z Bionic', 9720, 1024, 6, 'https://www.gsmarena.com/apple_ipad_pro_12_9_(2020)-10136.php'),
('iPad Pro 11 (2020)', 'apple-ipad-pro-11-2020', 'tablet', 2020, 11, 'Apple A12Z Bionic', 7538, 1024, 6, 'https://www.gsmarena.com/apple_ipad_pro_11_(2020)-10137.php'),
('iPhone 11 Pro Max', 'apple-iphone-11-pro-max', 'phone', 2019, 6.5, 'Apple A13 Bionic', 3969, 512, 4, 'https://www.gsmarena.com/apple_iphone_11_pro_max-9846.php'),
('iPhone 11 Pro', 'apple-iphone-11-pro', 'phone', 2019, 5.8, 'Apple A13 Bionic', 3046, 512, 4, 'https://www.gsmarena.com/apple_iphone_11_pro-9847.php'),
('iPhone 11', 'apple-iphone-11', 'phone', 2019, 6.1, 'Apple A13 Bionic', 3110, 256, 4, 'https://www.gsmarena.com/apple_iphone_11-9848.php'),
('iPad 10.2 (2019)', 'apple-ipad-10-2-2019', 'tablet', 2019, 10.2, 'Apple A10 Fusion', 8827, 128, 3, 'https://www.gsmarena.com/apple_ipad_10_2_(2019)-9857.php'),
('Watch Edition Series 5', 'apple-watch-edition-series-5', 'watch', 2019, 1.78, 'Apple S5', 296, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_edition_series_5-9860.php'),
('Watch Series 5', 'apple-watch-series-5', 'watch', 2019, 1.78, 'Apple S5', 296, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_series_5-9859.php'),
('Watch Series 5 Aluminum', 'apple-watch-series-5-aluminum', 'watch', 2019, 1.78, 'Apple S5', 296, 32, 0.9765625, 'https://www.gsmarena.com/apple_watch_series_5_aluminum-9858.php'),
('iPad Air (2019)', 'apple-ipad-air-2019', 'tablet', 2019, 10.5, 'Apple A12 Bionic', 8134, 256, 3, 'https://www.gsmarena.com/apple_ipad_air_(2019)-9638.php'),
('iPad mini (2019)', 'apple-ipad-mini-2019', 'tablet', 2019, 7.9, 'Apple A12 Bionic', 5124, 256, 3, 'https://www.gsmarena.com/apple_ipad_mini_(2019)-9637.php'),
('iPad Pro 12.9 (2018)', 'apple-ipad-pro-12-9-2018', 'tablet', 2018, 12.9, 'Apple A12X Bionic', 9720, 1024, 6, 'https://www.gsmarena.com/apple_ipad_pro_12_9_(2018)-9387.php'),
('iPad Pro 11 (2018)', 'apple-ipad-pro-11-2018', 'tablet', 2018, 11, 'Apple A12X Bionic', 7812, 1024, 4, 'https://www.gsmarena.com/apple_ipad_pro_11_(2018)-9386.php'),
('iPhone XS Max', 'apple-iphone-xs-max', 'phone', 2018, 6.5, 'Apple A12 Bionic', 3174, 512, 4, 'https://www.gsmarena.com/apple_iphone_xs_max-9319.php'),
('iPhone XS', 'apple-iphone-xs', 'phone', 2018, 5.8, 'Apple A12 Bionic', 2658, 512, 4, 'https://www.gsmarena.com/apple_iphone_xs-9318.php'),
('iPhone XR', 'apple-iphone-xr', 'phone', 2018, 6.1, 'Apple A12 Bionic', 2942, 256, 3, 'https://www.gsmarena.com/apple_iphone_xr-9320.php'),
('Watch Series 4', 'apple-watch-series-4', 'watch', 2018, 1.78, 'Apple S4', 292, 16, 0.9765625, 'https://www.gsmarena.com/apple_watch_series_4-9321.php'),
('Watch Series 4 Aluminum', 'apple-watch-series-4-aluminum', 'watch', 2018, 1.78, 'Apple S4', NULL, 16, 0.9765625, 'https://www.gsmarena.com/apple_watch_series_4_aluminum-9322.php'),
('iPad 9.7 (2018)', 'apple-ipad-9-7-2018', 'tablet', 2018, 9.7, 'Apple A10 Fusion', 8827, 128, 2, 'https://www.gsmarena.com/apple_ipad_9_7_(2018)-9142.php'),
('iPhone X', 'apple-iphone-x', 'phone', 2017, 5.8, 'Apple A11 Bionic', 2716, 256, 3, 'https://www.gsmarena.com/apple_iphone_x-8858.php'),
('iPhone 8 Plus', 'apple-iphone-8-plus', 'phone', 2017, 5.5, 'Apple A11 Bionic', 2691, 256, 3, 'https://www.gsmarena.com/apple_iphone_8_plus-8131.php'),
('iPhone 8', 'apple-iphone-8', 'phone', 2017, 4.7, 'Apple A11 Bionic', 1821, 256, 2, 'https://www.gsmarena.com/apple_iphone_8-8573.php'),
('Watch Edition Series 3', 'apple-watch-edition-series-3', 'watch', 2017, 1.65, 'Apple S3', 341, 16, 0.75, 'https://www.gsmarena.com/apple_watch_edition_series_3-8861.php'),
('Watch Series 3', 'apple-watch-series-3', 'watch', 2017, 1.65, 'Apple S3', 279, 16, 0.75, 'https://www.gsmarena.com/apple_watch_series_3-8860.php'),
('Watch Series 3 Aluminum', 'apple-watch-series-3-aluminum', 'watch', 2017, 1.65, 'Apple S3', 279, 16, 0.75, 'https://www.gsmarena.com/apple_watch_series_3_aluminum-8859.php'),
('iPad Pro 12.9 (2017)', 'apple-ipad-pro-12-9-2017', 'tablet', 2017, 12.9, 'Apple A10X Fusion', 10891, 512, 4, 'https://www.gsmarena.com/apple_ipad_pro_12_9_(2017)-8717.php'),
('iPad Pro 10.5 (2017)', 'apple-ipad-pro-10-5-2017', 'tablet', 2017, 10.5, 'Apple A10X Fusion', 8134, 512, 4, 'https://www.gsmarena.com/apple_ipad_pro_10_5_(2017)-8716.php'),
('iPad 9.7 (2017)', 'apple-ipad-9-7-2017', 'tablet', 2017, 9.7, 'Apple A9', 8827, 128, 2, 'https://www.gsmarena.com/apple_ipad_9_7_(2017)-8620.php'),
('Watch Edition Series 2 42mm', 'apple-watch-edition-series-2-42mm', 'watch', 2016, 1.65, 'Apple S2', 334, 8, 0.5, 'https://www.gsmarena.com/apple_watch_edition_series_2_42mm-8331.php'),
('Watch Edition Series 2 38mm', 'apple-watch-edition-series-2-38mm', 'watch', 2016, 1.5, 'Apple S2', 273, 8, 0.5, 'https://www.gsmarena.com/apple_watch_edition_series_2_38mm-8332.php'),
('Watch Series 2 42mm', 'apple-watch-series-2-42mm', 'watch', 2016, 1.65, 'Apple S2', 334, 8, 0.5, 'https://www.gsmarena.com/apple_watch_series_2_42mm-8329.php'),
('Watch Series 2 38mm', 'apple-watch-series-2-38mm', 'watch', 2016, 1.5, 'Apple S2', 273, 8, 0.5, 'https://www.gsmarena.com/apple_watch_series_2_38mm-8330.php'),
('Watch Series 2 Aluminum 42mm', 'apple-watch-series-2-aluminum-42mm', 'watch', 2016, 1.65, 'Apple S2', 334, 8, 0.5, 'https://www.gsmarena.com/apple_watch_series_2_aluminum_42mm-8328.php'),
('Watch Series 1 Aluminum 42mm', 'apple-watch-series-1-aluminum-42mm', 'watch', 2016, 1.65, 'Apple S1P', 250, 8, 0.5, 'https://www.gsmarena.com/apple_watch_series_1_aluminum_42mm-8334.php'),
('Watch Series 2 Aluminum 38mm', 'apple-watch-series-2-aluminum-38mm', 'watch', 2016, 1.5, 'Apple S2', 273, 8, 0.5, 'https://www.gsmarena.com/apple_watch_series_2_aluminum_38mm-8327.php'),
('Watch Series 1 Aluminum 38mm', 'apple-watch-series-1-aluminum-38mm', 'watch', 2016, 1.5, 'Apple S1P', 205, 8, 0.5, 'https://www.gsmarena.com/apple_watch_series_1_aluminum_38mm-8333.php'),
('iPhone 7 Plus', 'apple-iphone-7-plus', 'phone', 2016, 5.5, 'Apple A10 Fusion', 2900, 256, 3, 'https://www.gsmarena.com/apple_iphone_7_plus-8065.php'),
('iPhone 7', 'apple-iphone-7', 'phone', 2016, 4.7, 'Apple A10 Fusion', 1960, 256, 2, 'https://www.gsmarena.com/apple_iphone_7-8064.php'),
('iPad Pro 9.7 (2016)', 'apple-ipad-pro-9-7-2016', 'tablet', 2016, 9.7, 'Apple A9X', 7306, 256, 2, 'https://www.gsmarena.com/apple_ipad_pro_9_7_(2016)-7984.php'),
('iPhone SE', 'apple-iphone-se', 'phone', 2016, 4, 'Apple A9', 1624, 128, 2, 'https://www.gsmarena.com/apple_iphone_se-7969.php'),
('iPhone 6s Plus', 'apple-iphone-6s-plus', 'phone', 2015, 5.5, 'Apple A9 (14', 2750, 128, 2, 'https://www.gsmarena.com/apple_iphone_6s_plus-7243.php'),
('iPhone 6s', 'apple-iphone-6s', 'phone', 2015, 4.7, 'Apple A9 (14', 1715, 128, 2, 'https://www.gsmarena.com/apple_iphone_6s-7242.php'),
('iPad Pro 12.9 (2015)', 'apple-ipad-pro-12-9-2015', 'tablet', 2015, 12.9, 'Apple A9X', 10307, 256, 4, 'https://www.gsmarena.com/apple_ipad_pro_12_9_(2015)-7562.php'),
('iPad mini 4 (2015)', 'apple-ipad-mini-4-2015', 'tablet', 2015, 7.9, 'Apple A8', 5124, 128, 2, 'https://www.gsmarena.com/apple_ipad_mini_4_(2015)-7561.php'),
('Watch Edition 42mm (1st gen)', 'apple-watch-edition-42mm-1st-gen', 'watch', 2014, 1.65, 'Apple S1', 250, 8, 0.5, 'https://www.gsmarena.com/apple_watch_edition_42mm_(1st_gen)-7698.php'),
('Watch Edition 38mm (1st gen)', 'apple-watch-edition-38mm-1st-gen', 'watch', 2014, 1.5, 'Apple S1', 205, 8, 0.5, 'https://www.gsmarena.com/apple_watch_edition_38mm_(1st_gen)-7697.php'),
('Watch 42mm (1st gen)', 'apple-watch-42mm-1st-gen', 'watch', 2014, 1.65, 'Apple S1', 250, 8, 0.5, 'https://www.gsmarena.com/apple_watch_42mm_(1st_gen)-7696.php'),
('Watch 38mm (1st gen)', 'apple-watch-38mm-1st-gen', 'watch', 2014, 1.5, 'Apple S1', 205, 8, 0.5, 'https://www.gsmarena.com/apple_watch_38mm_(1st_gen)-7695.php'),
('Watch Sport 42mm (1st gen)', 'apple-watch-sport-42mm-1st-gen', 'watch', 2014, 1.65, 'Apple S1', 250, 8, 0.5, 'https://www.gsmarena.com/apple_watch_sport_42mm_(1st_gen)-7694.php'),
('Watch Sport 38mm (1st gen)', 'apple-watch-sport-38mm-1st-gen', 'watch', 2014, 1.5, 'Apple S1', 205, 8, 0.5, 'https://www.gsmarena.com/apple_watch_sport_38mm_(1st_gen)-7693.php'),
('iPad Air 2', 'apple-ipad-air-2', 'tablet', 2014, 9.7, 'Apple A8X', 7340, 128, 2, 'https://www.gsmarena.com/apple_ipad_air_2-6742.php'),
('iPad mini 3', 'apple-ipad-mini-3', 'tablet', 2014, 7.9, 'Apple A7', 6470, 128, 0.9765625, 'https://www.gsmarena.com/apple_ipad_mini_3-6741.php'),
('iPhone 6 Plus', 'apple-iphone-6-plus', 'phone', 2014, 5.5, 'Apple A8', 2915, 128, 0.9765625, 'https://www.gsmarena.com/apple_iphone_6_plus-6665.php'),
('iPhone 6', 'apple-iphone-6', 'phone', 2014, 4.7, 'Apple A8', 1810, 128, 0.9765625, 'https://www.gsmarena.com/apple_iphone_6-6378.php'),
('iPad Air', 'apple-ipad-air', 'tablet', 2013, 9.7, 'Apple A7', 8820, 128, 0.9765625, 'https://www.gsmarena.com/apple_ipad_air-5797.php'),
('iPad mini 2', 'apple-ipad-mini-2', 'tablet', 2013, 7.9, 'Apple A7', 6470, 128, 0.9765625, 'https://www.gsmarena.com/apple_ipad_mini_2-5735.php'),
('iPhone 5s', 'apple-iphone-5s', 'phone', 2013, 4, 'Apple A7', 1560, 64, 0.9765625, 'https://www.gsmarena.com/apple_iphone_5s-5685.php'),
('iPhone 5c', 'apple-iphone-5c', 'phone', 2013, 4, 'Apple A6', 1510, 32, 0.9765625, 'https://www.gsmarena.com/apple_iphone_5c-5690.php'),
('iPad mini Wi-Fi', 'apple-ipad-mini-wi-fi', 'tablet', 2012, 7.9, 'Apple A5', NULL, 64, 0.5, 'https://www.gsmarena.com/apple_ipad_mini_wi_fi-5070.php'),
('iPad mini Wi-Fi + Cellular', 'apple-ipad-mini-wi-fi-plus-cellular', 'tablet', 2012, 7.9, 'Apple A5', NULL, 64, 0.5, 'https://www.gsmarena.com/apple_ipad_mini_wi_fi_+_cellular-5061.php'),
('iPad 4 Wi-Fi', 'apple-ipad-4-wi-fi', 'tablet', 2012, 9.7, 'Apple A6X', 11560, 128, 0.9765625, 'https://www.gsmarena.com/apple_ipad_4_wi_fi-5072.php'),
('iPad 4 Wi-Fi + Cellular', 'apple-ipad-4-wi-fi-plus-cellular', 'tablet', 2012, 9.7, 'Apple A6X', 11560, 128, 0.9765625, 'https://www.gsmarena.com/apple_ipad_4_wi_fi_+_cellular-5071.php'),
('iPhone 5', 'apple-iphone-5', 'phone', 2012, 4, 'Apple A6', 1440, 64, 0.9765625, 'https://www.gsmarena.com/apple_iphone_5-4910.php'),
('iPad 3 Wi-Fi + Cellular', 'apple-ipad-3-wi-fi-plus-cellular', 'tablet', 2012, 9.7, 'Apple A5X', 11560, 64, 0.9765625, 'https://www.gsmarena.com/apple_ipad_3_wi_fi_+_cellular-4620.php'),
('iPad 3 Wi-Fi', 'apple-ipad-3-wi-fi', 'tablet', 2012, 9.7, 'Apple A5X', 11560, 64, 0.9765625, 'https://www.gsmarena.com/apple_ipad_3_wi_fi-4621.php'),
('iPhone 4s', 'apple-iphone-4s', 'phone', 2011, 3.5, 'Apple A5', 1432, 64, 0.5, 'https://www.gsmarena.com/apple_iphone_4s-4212.php'),
('iPad 2 Wi-Fi + 3G', 'apple-ipad-2-wi-fi-plus-3g', 'tablet', 2011, 9.7, 'Apple A5', 6930, 64, 0.5, 'https://www.gsmarena.com/apple_ipad_2_wi_fi_+_3g-3848.php'),
('iPad 2 Wi-Fi', 'apple-ipad-2-wi-fi', 'tablet', 2011, 9.7, 'Apple A5', 6930, 64, 0.5, 'https://www.gsmarena.com/apple_ipad_2_wi_fi-3847.php'),
('iPad 2 CDMA', 'apple-ipad-2-cdma', 'tablet', 2011, 9.7, 'Apple A5', 6930, 64, 0.5, 'https://www.gsmarena.com/apple_ipad_2_cdma-3849.php'),
('iPhone 4', 'apple-iphone-4', 'phone', 2010, 3.5, 'Apple A4', 1420, 32, 0.5, 'https://www.gsmarena.com/apple_iphone_4-3275.php'),
('iPhone 4 CDMA', 'apple-iphone-4-cdma', 'phone', 2011, 3.5, 'Apple A4', 1420, 32, 0.5, 'https://www.gsmarena.com/apple_iphone_4_cdma-3716.php'),
('iPad Wi-Fi + 3G', 'apple-ipad-wi-fi-plus-3g', 'tablet', 2010, 9.7, 'Apple A4', NULL, 64, 0.25, 'https://www.gsmarena.com/apple_ipad_wi_fi_+_3g-3827.php'),
('iPad Wi-Fi', 'apple-ipad-wi-fi', 'tablet', 2010, 9.7, 'Apple A4', NULL, 64, 0.25, 'https://www.gsmarena.com/apple_ipad_wi_fi-3828.php'),
('iPhone 3GS', 'apple-iphone-3gs', 'phone', 2009, 3.5, NULL, 1400, 32, 0.25, 'https://www.gsmarena.com/apple_iphone_3gs-2826.php'),
('iPhone 3G', 'apple-iphone-3g', 'phone', 2008, 3.5, NULL, 1220, 16, 0.125, 'https://www.gsmarena.com/apple_iphone_3g-2424.php'),
('iPhone', 'apple-iphone', 'phone', 2007, 3.5, NULL, 1400, 16, NULL, 'https://www.gsmarena.com/apple_iphone-1827.php');

INSERT INTO public.device_models
  (brand_id, name, slug, category, launch_year, source_url, source_site, verified, verified_at, status)
SELECT
  brands.id, devices.model_name, devices.model_slug, devices.category,
  devices.launch_year, devices.source_url, 'GSMArena', true, now(), 'active'
FROM _apple_devices_20260730 devices
JOIN public.brands brands ON brands.slug = 'apple'
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
  CASE WHEN devices.ram_gb IS NULL THEN NULL ELSE concat(devices.ram_gb, 'GB') END,
  'NP',
  'active'
FROM _apple_devices_20260730 devices
JOIN public.device_models models ON models.slug = devices.model_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.device_variants existing
  WHERE existing.model_id = models.id
    AND existing.storage = concat(devices.storage_gb, 'GB')
    AND existing.ram IS NOT DISTINCT FROM
      CASE WHEN devices.ram_gb IS NULL THEN NULL ELSE concat(devices.ram_gb, 'GB') END
);

INSERT INTO public.catalog_products
  (brand_id, model_id, variant_id, name, slug, release_year, specs_json, source_url, source_site, verified, is_price_list_item, is_active)
SELECT
  brands.id,
  models.id,
  variants.id,
  concat('Apple ', devices.model_name),
  devices.model_slug,
  devices.launch_year,
  jsonb_strip_nulls(jsonb_build_object(
    'category', devices.category,
    'display_inches', devices.display_inches,
    'chipset', devices.chipset,
    'battery_mah', devices.battery_mah,
    'storage_gb', devices.storage_gb,
    'ram_gb', devices.ram_gb,
    'launch_year', devices.launch_year
  )),
  devices.source_url,
  'GSMArena',
  true,
  false,
  true
FROM _apple_devices_20260730 devices
JOIN public.brands brands ON brands.slug = 'apple'
JOIN public.device_models models ON models.slug = devices.model_slug
JOIN public.device_variants variants
  ON variants.model_id = models.id
 AND variants.storage = concat(devices.storage_gb, 'GB')
 AND variants.ram IS NOT DISTINCT FROM
   CASE WHEN devices.ram_gb IS NULL THEN NULL ELSE concat(devices.ram_gb, 'GB') END
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
