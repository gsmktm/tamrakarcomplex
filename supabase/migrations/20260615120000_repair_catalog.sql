-- ============================================================
-- REPAIR CATALOG — iFixit-style schema + Nepal seed data
-- ============================================================

-- 1. Categories (device types)
CREATE TABLE IF NOT EXISTS public.repair_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid REFERENCES public.repair_categories(id) ON DELETE SET NULL,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  image       text,
  description text,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_repair_categories_parent ON public.repair_categories(parent_id);
ALTER TABLE public.repair_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read repair categories" ON public.repair_categories;
CREATE POLICY "Public read repair categories" ON public.repair_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage repair categories" ON public.repair_categories;
CREATE POLICY "Admin manage repair categories" ON public.repair_categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','admin'))
);

-- 2. Devices (specific models)
CREATE TABLE IF NOT EXISTS public.repair_devices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid REFERENCES public.repair_categories(id) ON DELETE SET NULL,
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  brand         text NOT NULL,
  model_number  text,
  image         text,
  summary       text,
  specifications jsonb DEFAULT '{}'::jsonb,
  is_popular    boolean DEFAULT false,
  sort_order    integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_repair_devices_category ON public.repair_devices(category_id);
CREATE INDEX IF NOT EXISTS idx_repair_devices_brand ON public.repair_devices(brand);
ALTER TABLE public.repair_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read repair devices" ON public.repair_devices;
CREATE POLICY "Public read repair devices" ON public.repair_devices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage repair devices" ON public.repair_devices;
CREATE POLICY "Admin manage repair devices" ON public.repair_devices FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','admin'))
);

-- 3. Tools
CREATE TABLE IF NOT EXISTS public.repair_tools (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL,
  url   text,
  image text
);
ALTER TABLE public.repair_tools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read repair tools" ON public.repair_tools;
CREATE POLICY "Public read repair tools" ON public.repair_tools FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage repair tools" ON public.repair_tools;
CREATE POLICY "Admin manage repair tools" ON public.repair_tools FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','admin'))
);

-- 4. Parts
CREATE TABLE IF NOT EXISTS public.repair_parts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  url             text,
  image           text,
  estimated_price numeric
);
ALTER TABLE public.repair_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read repair parts" ON public.repair_parts;
CREATE POLICY "Public read repair parts" ON public.repair_parts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage repair parts" ON public.repair_parts;
CREATE POLICY "Admin manage repair parts" ON public.repair_parts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','admin'))
);

-- 5. Guides
CREATE TABLE IF NOT EXISTS public.repair_guides (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id      uuid NOT NULL REFERENCES public.repair_devices(id) ON DELETE CASCADE,
  title          text NOT NULL,
  slug           text NOT NULL UNIQUE,
  image          text,
  summary        text,
  difficulty     text NOT NULL DEFAULT 'moderate' CHECK (difficulty IN ('easy','moderate','difficult','very_difficult')),
  time_estimate  text,
  guide_type     text NOT NULL DEFAULT 'repair',
  author         text DEFAULT 'Tamrakar Tech Team',
  published      boolean DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_repair_guides_device ON public.repair_guides(device_id);
ALTER TABLE public.repair_guides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read published guides" ON public.repair_guides;
CREATE POLICY "Public read published guides" ON public.repair_guides FOR SELECT USING (published = true);
DROP POLICY IF EXISTS "Admin manage guides" ON public.repair_guides;
CREATE POLICY "Admin manage guides" ON public.repair_guides FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','admin'))
);

-- 6. Steps
CREATE TABLE IF NOT EXISTS public.repair_steps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id    uuid NOT NULL REFERENCES public.repair_guides(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  title       text,
  content     text NOT NULL,
  images      text[] DEFAULT '{}',
  video_url   text
);
CREATE INDEX IF NOT EXISTS idx_repair_steps_guide ON public.repair_steps(guide_id);
ALTER TABLE public.repair_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read repair steps" ON public.repair_steps;
CREATE POLICY "Public read repair steps" ON public.repair_steps FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage repair steps" ON public.repair_steps;
CREATE POLICY "Admin manage repair steps" ON public.repair_steps FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','admin'))
);

-- 7. Junction: guide ↔ tools
CREATE TABLE IF NOT EXISTS public.repair_guide_tools (
  guide_id uuid REFERENCES public.repair_guides(id) ON DELETE CASCADE,
  tool_id  uuid REFERENCES public.repair_tools(id) ON DELETE CASCADE,
  PRIMARY KEY (guide_id, tool_id)
);
ALTER TABLE public.repair_guide_tools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read guide tools" ON public.repair_guide_tools;
CREATE POLICY "Public read guide tools" ON public.repair_guide_tools FOR SELECT USING (true);

-- 8. Junction: guide ↔ parts
CREATE TABLE IF NOT EXISTS public.repair_guide_parts (
  guide_id uuid REFERENCES public.repair_guides(id) ON DELETE CASCADE,
  part_id  uuid REFERENCES public.repair_parts(id) ON DELETE CASCADE,
  PRIMARY KEY (guide_id, part_id)
);
ALTER TABLE public.repair_guide_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read guide parts" ON public.repair_guide_parts;
CREATE POLICY "Public read guide parts" ON public.repair_guide_parts FOR SELECT USING (true);

-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT ON public.repair_categories TO anon, authenticated;
GRANT SELECT ON public.repair_devices TO anon, authenticated;
GRANT SELECT ON public.repair_guides TO anon, authenticated;
GRANT SELECT ON public.repair_steps TO anon, authenticated;
GRANT SELECT ON public.repair_tools TO anon, authenticated;
GRANT SELECT ON public.repair_parts TO anon, authenticated;
GRANT SELECT ON public.repair_guide_tools TO anon, authenticated;
GRANT SELECT ON public.repair_guide_parts TO anon, authenticated;

-- ============================================================
-- SEED DATA — Nepal-relevant devices + guides
-- ============================================================

-- Root categories
INSERT INTO public.repair_categories (name, slug, description, sort_order) VALUES
  ('Smartphones',  'smartphones',  'All smartphone brands and models', 1),
  ('Tablets',      'tablets',      'iPad, Android tablets',            2),
  ('Laptops',      'laptops',      'MacBook, Windows laptops',         3),
  ('Accessories',  'accessories',  'Earphones, chargers, cables',      4)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories under Smartphones
INSERT INTO public.repair_categories (parent_id, name, slug, description, sort_order)
SELECT id, 'Apple iPhone',  'apple-iphone',  'iPhone repair guides',       1 FROM public.repair_categories WHERE slug='smartphones'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.repair_categories (parent_id, name, slug, description, sort_order)
SELECT id, 'Samsung Galaxy','samsung-galaxy','Samsung Galaxy repair guides',2 FROM public.repair_categories WHERE slug='smartphones'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.repair_categories (parent_id, name, slug, description, sort_order)
SELECT id, 'Xiaomi / Redmi','xiaomi-redmi',  'Xiaomi & Redmi repair guides',3 FROM public.repair_categories WHERE slug='smartphones'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.repair_categories (parent_id, name, slug, description, sort_order)
SELECT id, 'OnePlus',       'oneplus',       'OnePlus repair guides',       4 FROM public.repair_categories WHERE slug='smartphones'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.repair_categories (parent_id, name, slug, description, sort_order)
SELECT id, 'Vivo',          'vivo',          'Vivo repair guides',          5 FROM public.repair_categories WHERE slug='smartphones'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.repair_categories (parent_id, name, slug, description, sort_order)
SELECT id, 'Oppo / Realme', 'oppo-realme',   'Oppo & Realme repair guides', 6 FROM public.repair_categories WHERE slug='smartphones'
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories under Laptops
INSERT INTO public.repair_categories (parent_id, name, slug, description, sort_order)
SELECT id, 'MacBook', 'macbook', 'MacBook Air & Pro repair', 1 FROM public.repair_categories WHERE slug='laptops'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.repair_categories (parent_id, name, slug, description, sort_order)
SELECT id, 'Windows Laptops', 'windows-laptops', 'Dell, HP, Lenovo, Asus repair', 2 FROM public.repair_categories WHERE slug='laptops'
ON CONFLICT (slug) DO NOTHING;

-- ── DEVICES ─────────────────────────────────────────────────────────────────

-- iPhone devices
INSERT INTO public.repair_devices (category_id, name, slug, brand, model_number, summary, is_popular, sort_order,
  specifications)
SELECT
  (SELECT id FROM public.repair_categories WHERE slug='apple-iphone'),
  name, slug, 'Apple', model_number, summary, is_popular, sort_order,
  specs::jsonb
FROM (VALUES
  ('iPhone 15 Pro Max', 'iphone-15-pro-max', 'A2849',
   'Apple''s flagship 2023 smartphone with titanium frame, 48MP camera system, and USB-C. Most common repairs: screen, battery, camera module.',
   true, 1,
   '{"Display":"6.7\" Super Retina XDR OLED","Chip":"A17 Pro","Battery":"4422 mAh","Storage":"256GB–1TB","Release":"September 2023"}'),
  ('iPhone 15 Pro', 'iphone-15-pro', 'A2848',
   'Titanium body, Action Button, 48MP main camera. Common repairs: cracked screen, battery degradation, USB-C port.',
   true, 2,
   '{"Display":"6.1\" Super Retina XDR OLED","Chip":"A17 Pro","Battery":"3274 mAh","Storage":"128GB–1TB","Release":"September 2023"}'),
  ('iPhone 15', 'iphone-15', 'A2846',
   'Dynamic Island, 48MP camera, USB-C port. Popular mid-range model in Nepal. Screen and battery most common repairs.',
   true, 3,
   '{"Display":"6.1\" Super Retina XDR","Chip":"A16 Bionic","Battery":"3349 mAh","Storage":"128GB–512GB","Release":"September 2023"}'),
  ('iPhone 14 Pro Max', 'iphone-14-pro-max', 'A2651',
   'Always-On display, Dynamic Island, 48MP camera. A very common device in Kathmandu repair centers.',
   true, 4,
   '{"Display":"6.7\" Super Retina XDR OLED","Chip":"A16 Bionic","Battery":"4323 mAh","Storage":"128GB–1TB","Release":"September 2022"}'),
  ('iPhone 14', 'iphone-14', 'A2649',
   'Crash Detection, emergency SOS, improved camera. Common repair: screen, back glass, battery.',
   true, 5,
   '{"Display":"6.1\" Super Retina XDR","Chip":"A15 Bionic","Battery":"3279 mAh","Storage":"128GB–512GB","Release":"September 2022"}'),
  ('iPhone 13', 'iphone-13', 'A2482',
   'Improved dual-camera system, Cinematic mode video. Widely sold and repaired across Nepal.',
   true, 6,
   '{"Display":"6.1\" Super Retina XDR","Chip":"A15 Bionic","Battery":"3227 mAh","Storage":"128GB–512GB","Release":"September 2021"}'),
  ('iPhone 12', 'iphone-12', 'A2172',
   'First 5G iPhone. Flat-edge design. Screen and battery repairs most common in older units.',
   false, 7,
   '{"Display":"6.1\" Super Retina XDR OLED","Chip":"A14 Bionic","Battery":"2815 mAh","Storage":"64GB–256GB","Release":"October 2020"}'),
  ('iPhone 11', 'iphone-11', 'A2111',
   'Dual-camera system, longest battery life at launch. Still widely in use in Nepal.',
   false, 8,
   '{"Display":"6.1\" Liquid Retina IPS","Chip":"A13 Bionic","Battery":"3110 mAh","Storage":"64GB–256GB","Release":"September 2019"}')
) AS t(name, slug, model_number, summary, is_popular, sort_order, specs)
ON CONFLICT (slug) DO NOTHING;

-- Samsung devices
INSERT INTO public.repair_devices (category_id, name, slug, brand, model_number, summary, is_popular, sort_order, specifications)
SELECT
  (SELECT id FROM public.repair_categories WHERE slug='samsung-galaxy'),
  name, slug, 'Samsung', model_number, summary, is_popular, sort_order, specs::jsonb
FROM (VALUES
  ('Samsung Galaxy S24 Ultra', 'samsung-s24-ultra', 'SM-S928B',
   'Snapdragon 8 Gen 3, built-in S Pen, 200MP camera. Top Samsung repair model in premium segment.',
   true, 1,
   '{"Display":"6.8\" Dynamic AMOLED 2X","Chip":"Snapdragon 8 Gen 3","Battery":"5000 mAh","S Pen":"Built-in","Release":"January 2024"}'),
  ('Samsung Galaxy S24+', 'samsung-s24-plus', 'SM-S926B',
   'Large 6.7-inch Dynamic AMOLED, Snapdragon 8 Gen 3, 50MP camera.',
   false, 2,
   '{"Display":"6.7\" Dynamic AMOLED 2X","Chip":"Snapdragon 8 Gen 3","Battery":"4900 mAh","Release":"January 2024"}'),
  ('Samsung Galaxy S24', 'samsung-s24', 'SM-S921B',
   'Compact flagship with Snapdragon 8 Gen 3. Most popular Samsung premium model in Nepal.',
   true, 3,
   '{"Display":"6.2\" Dynamic AMOLED 2X","Chip":"Snapdragon 8 Gen 3","Battery":"4000 mAh","Release":"January 2024"}'),
  ('Samsung Galaxy A55 5G', 'samsung-a55-5g', 'SM-A556B',
   'Mid-range powerhouse. Gorilla Glass Victus+, 50MP camera. High repair volume in Kathmandu.',
   true, 4,
   '{"Display":"6.6\" Super AMOLED","Chip":"Exynos 1480","Battery":"5000 mAh","Release":"March 2024"}'),
  ('Samsung Galaxy A35 5G', 'samsung-a35-5g', 'SM-A356B',
   'Popular affordable 5G Samsung. Screen and battery repairs most common.',
   true, 5,
   '{"Display":"6.6\" Super AMOLED","Chip":"Exynos 1380","Battery":"5000 mAh","Release":"March 2024"}'),
  ('Samsung Galaxy S23 Ultra', 'samsung-s23-ultra', 'SM-S918B',
   'Snapdragon 8 Gen 2, 200MP camera, S Pen. Flagship tier repairs including screen and S Pen digitizer.',
   false, 6,
   '{"Display":"6.8\" Dynamic AMOLED 2X","Chip":"Snapdragon 8 Gen 2","Battery":"5000 mAh","Release":"February 2023"}'),
  ('Samsung Galaxy M34 5G', 'samsung-m34-5g', 'SM-M346B',
   'Budget 5G segment leader in Nepal. High volume of screen and charging port repairs.',
   true, 7,
   '{"Display":"6.5\" Super AMOLED","Chip":"Exynos 1280","Battery":"6000 mAh","Release":"July 2023"}')
) AS t(name, slug, model_number, summary, is_popular, sort_order, specs)
ON CONFLICT (slug) DO NOTHING;

-- Xiaomi / Redmi devices
INSERT INTO public.repair_devices (category_id, name, slug, brand, model_number, summary, is_popular, sort_order, specifications)
SELECT
  (SELECT id FROM public.repair_categories WHERE slug='xiaomi-redmi'),
  name, slug, 'Xiaomi', model_number, summary, is_popular, sort_order, specs::jsonb
FROM (VALUES
  ('Xiaomi 14', 'xiaomi-14', 'N/A',
   'Leica optics, Snapdragon 8 Gen 3. Premium Xiaomi flagship. Increasing repair volume in Nepal.',
   false, 1,
   '{"Display":"6.36\" AMOLED","Chip":"Snapdragon 8 Gen 3","Battery":"4610 mAh","Camera":"Leica 50MP","Release":"2024"}'),
  ('Redmi Note 13 Pro+', 'redmi-note-13-pro-plus', 'N/A',
   '200MP camera, 120W charging, IP68. Best-selling Redmi in Nepal. Screen and camera top repairs.',
   true, 2,
   '{"Display":"6.67\" AMOLED","Chip":"Dimensity 7200 Ultra","Battery":"5000 mAh","Charging":"120W","Release":"2024"}'),
  ('Redmi Note 13 Pro', 'redmi-note-13-pro', 'N/A',
   '50MP Sony IMX890, 67W charging. High volume affordable mid-range repairs.',
   true, 3,
   '{"Display":"6.67\" AMOLED","Chip":"Snapdragon 7s Gen 2","Battery":"5100 mAh","Release":"2024"}'),
  ('Redmi Note 12', 'redmi-note-12', 'N/A',
   'AMOLED display, 50MP camera. Most common Xiaomi repair in Tamrakar Complex.',
   true, 4,
   '{"Display":"6.67\" AMOLED","Chip":"Snapdragon 685","Battery":"5000 mAh","Release":"2023"}'),
  ('Poco X6 Pro', 'poco-x6-pro', 'N/A',
   'Dimensity 8300 Ultra, 67W charging. Budget gaming phone. Heating and screen repairs common.',
   false, 5,
   '{"Display":"6.67\" Flow AMOLED","Chip":"Dimensity 8300 Ultra","Battery":"5000 mAh","Release":"2024"}')
) AS t(name, slug, model_number, summary, is_popular, sort_order, specs)
ON CONFLICT (slug) DO NOTHING;

-- OnePlus devices
INSERT INTO public.repair_devices (category_id, name, slug, brand, model_number, summary, is_popular, sort_order, specifications)
SELECT
  (SELECT id FROM public.repair_categories WHERE slug='oneplus'),
  name, slug, 'OnePlus', model_number, summary, is_popular, sort_order, specs::jsonb
FROM (VALUES
  ('OnePlus 12', 'oneplus-12', 'CPH2573',
   'Snapdragon 8 Gen 3, Hasselblad camera, 100W charging. Premium OnePlus flagship.',
   true, 1,
   '{"Display":"6.82\" LTPO4 AMOLED","Chip":"Snapdragon 8 Gen 3","Battery":"5400 mAh","Charging":"100W","Release":"2024"}'),
  ('OnePlus 12R', 'oneplus-12r', 'CPH2609',
   'Snapdragon 8 Gen 1, 80W charging. Popular value flagship. Screen and battery most repaired.',
   true, 2,
   '{"Display":"6.78\" LTPO3 AMOLED","Chip":"Snapdragon 8 Gen 1","Battery":"5500 mAh","Charging":"80W","Release":"2024"}'),
  ('OnePlus Nord CE 4', 'oneplus-nord-ce-4', 'CPH2613',
   'Snapdragon 7 Gen 3, 100W SUPERVOOC. Best-selling OnePlus mid-ranger in Nepal.',
   true, 3,
   '{"Display":"6.67\" FHD+ AMOLED","Chip":"Snapdragon 7 Gen 3","Battery":"5500 mAh","Release":"2024"}')
) AS t(name, slug, model_number, summary, is_popular, sort_order, specs)
ON CONFLICT (slug) DO NOTHING;

-- Vivo devices
INSERT INTO public.repair_devices (category_id, name, slug, brand, model_number, summary, is_popular, sort_order, specifications)
SELECT
  (SELECT id FROM public.repair_categories WHERE slug='vivo'),
  name, slug, 'Vivo', model_number, summary, is_popular, sort_order, specs::jsonb
FROM (VALUES
  ('Vivo V30 Pro', 'vivo-v30-pro', 'V2318',
   'Zeiss optics, 50MP selfie, curved AMOLED. Popular selfie-focused phone in Nepal.',
   true, 1,
   '{"Display":"6.78\" Curved AMOLED","Chip":"Snapdragon 7 Gen 3","Battery":"5000 mAh","Release":"2024"}'),
  ('Vivo Y200', 'vivo-y200', 'V2309',
   'Slim design, 44W charging. Budget segment Vivo. High screen and battery repair volume.',
   true, 2,
   '{"Display":"6.67\" AMOLED","Chip":"Snapdragon 4 Gen 1","Battery":"4500 mAh","Release":"2023"}'),
  ('Vivo T3x', 'vivo-t3x', 'N/A',
   '6000 mAh battery, 50MP camera. Most common Vivo budget segment repaired at Tamrakar Complex.',
   true, 3,
   '{"Display":"6.72\" LCD","Chip":"Snapdragon 6 Gen 1","Battery":"6000 mAh","Release":"2024"}')
) AS t(name, slug, model_number, summary, is_popular, sort_order, specs)
ON CONFLICT (slug) DO NOTHING;

-- Oppo/Realme devices
INSERT INTO public.repair_devices (category_id, name, slug, brand, model_number, summary, is_popular, sort_order, specifications)
SELECT
  (SELECT id FROM public.repair_categories WHERE slug='oppo-realme'),
  name, slug, brand, model_number, summary, is_popular, sort_order, specs::jsonb
FROM (VALUES
  ('Realme GT 6', 'realme-gt-6', 'RMX3851', 'Realme',
   'Snapdragon 8s Gen 3, 120W charging, 6000 nits display. Gaming-focused repairs.',
   false, 1,
   '{"Display":"6.78\" LTPO AMOLED","Chip":"Snapdragon 8s Gen 3","Battery":"5500 mAh","Release":"2024"}'),
  ('Realme 12 Pro+', 'realme-12-pro-plus', 'RMX3840', 'Realme',
   '50MP Sony periscope, curved AMOLED. Popular mid-range with increasing Nepal repair volume.',
   true, 2,
   '{"Display":"6.7\" Curved AMOLED","Chip":"Snapdragon 7s Gen 2","Battery":"5000 mAh","Release":"2024"}'),
  ('Oppo Reno 11 Pro', 'oppo-reno-11-pro', 'CPH2599', 'Oppo',
   'Curved display, 32MP selfie, 80W charging. Common camera and screen repairs.',
   true, 3,
   '{"Display":"6.7\" Curved AMOLED","Chip":"Dimensity 8200","Battery":"4600 mAh","Release":"2024"}'),
  ('Oppo A79 5G', 'oppo-a79-5g', 'CPH2557', 'Oppo',
   'Affordable 5G. High volume budget segment repair model.',
   true, 4,
   '{"Display":"6.72\" IPS LCD","Chip":"Dimensity 6020","Battery":"5000 mAh","Release":"2023"}')
) AS t(name, slug, model_number, brand, summary, is_popular, sort_order, specs)
ON CONFLICT (slug) DO NOTHING;

-- MacBook devices
INSERT INTO public.repair_devices (category_id, name, slug, brand, model_number, summary, is_popular, sort_order, specifications)
SELECT
  (SELECT id FROM public.repair_categories WHERE slug='macbook'),
  name, slug, 'Apple', model_number, summary, is_popular, sort_order, specs::jsonb
FROM (VALUES
  ('MacBook Air M3', 'macbook-air-m3', 'MRXN3LL/A',
   'Apple M3 chip, fanless design, up to 18-hour battery. Common repairs: screen, keyboard, charging port.',
   true, 1,
   '{"Chip":"Apple M3","Display":"13.6\" Liquid Retina","Battery":"Up to 18 hours","RAM":"8–24GB","Release":"March 2024"}'),
  ('MacBook Pro M3 Pro', 'macbook-pro-m3-pro', 'MRX33LL/A',
   'Apple M3 Pro, ProMotion display. Common issues: battery swelling, keyboard, display backlight.',
   true, 2,
   '{"Chip":"Apple M3 Pro","Display":"14\" Liquid Retina XDR","Battery":"Up to 18 hours","Release":"November 2023"}'),
  ('MacBook Air M2', 'macbook-air-m2', 'MLXY3LL/A',
   'Redesigned slim body with M2 chip. Very common in Nepal. Screen, battery, USB-C port repairs.',
   true, 3,
   '{"Chip":"Apple M2","Display":"13.6\" Liquid Retina","Battery":"Up to 18 hours","RAM":"8–24GB","Release":"June 2022"}'),
  ('MacBook Pro M1 Pro', 'macbook-pro-m1-pro', 'MKGP3LL/A',
   'M1 Pro chip, MiniLED display. Common: screen damage, liquid damage, battery failure.',
   false, 4,
   '{"Chip":"Apple M1 Pro","Display":"14\" Liquid Retina XDR","Battery":"Up to 17 hours","Release":"October 2021"}')
) AS t(name, slug, model_number, summary, is_popular, sort_order, specs)
ON CONFLICT (slug) DO NOTHING;

-- iPad devices
INSERT INTO public.repair_devices (category_id, name, slug, brand, model_number, summary, is_popular, sort_order, specifications)
SELECT
  (SELECT id FROM public.repair_categories WHERE slug='tablets'),
  name, slug, 'Apple', model_number, summary, is_popular, sort_order, specs::jsonb
FROM (VALUES
  ('iPad Pro M4 11"', 'ipad-pro-m4-11', 'MVV93LL/A',
   'Ultra Retina XDR OLED, M4 chip. Repairs: screen, pencil charging strip, USB-C port.',
   true, 1,
   '{"Chip":"Apple M4","Display":"11\" Ultra Retina XDR OLED","Storage":"256GB–2TB","Release":"May 2024"}'),
  ('iPad Air M2', 'ipad-air-m2', 'MUWJ3LL/A',
   'M2 chip, 11-inch and 13-inch sizes. Common repairs: screen, battery, USB-C.',
   true, 2,
   '{"Chip":"Apple M2","Display":"11\" or 13\" Liquid Retina","Storage":"128GB–1TB","Release":"March 2024"}'),
  ('iPad 10th Gen', 'ipad-10th-gen', 'MPQ03LL/A',
   'All-new design, USB-C, 5G support. Most common Apple tablet in Nepal. Screen and battery repairs.',
   true, 3,
   '{"Chip":"Apple A14 Bionic","Display":"10.9\" Liquid Retina","Storage":"64GB–256GB","Release":"October 2022"}')
) AS t(name, slug, model_number, summary, is_popular, sort_order, specs)
ON CONFLICT (slug) DO NOTHING;

-- ── TOOLS (common repair tools) ──────────────────────────────────────────────
INSERT INTO public.repair_tools (name) VALUES
  ('Phillips #000 Screwdriver'),
  ('Pentalobe P2 Screwdriver'),
  ('Pentalobe P5 Screwdriver'),
  ('Spudger / Plastic Opening Tool'),
  ('Suction Cup'),
  ('iOpener / Heat Gun'),
  ('Tweezers'),
  ('Anti-Static Wrist Strap'),
  ('T3 Torx Screwdriver'),
  ('T5 Torx Screwdriver'),
  ('Isopropyl Alcohol 99%'),
  ('Adhesive Strips / B-7000 Glue')
ON CONFLICT DO NOTHING;

-- ── REPAIR GUIDES + STEPS — iPhone 15 Battery ───────────────────────────────

WITH guide AS (
  INSERT INTO public.repair_guides (device_id, title, slug, summary, difficulty, time_estimate, guide_type)
  SELECT
    (SELECT id FROM public.repair_devices WHERE slug='iphone-15'),
    'iPhone 15 Battery Replacement',
    'iphone-15-battery-replacement',
    'Replace the battery in your iPhone 15 to restore full charge capacity. Rated Easy — no soldering required.',
    'easy', '45–60 minutes', 'repair'
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
)
INSERT INTO public.repair_steps (guide_id, step_number, title, content)
SELECT g.id, s.step_number, s.title, s.content
FROM guide g,
(VALUES
  (1, 'Power Down & SIM Removal', 'Power off the iPhone. Use a SIM ejector pin to remove the SIM tray from the left side.'),
  (2, 'Loosen Bottom Pentalobe Screws', 'Remove the two Pentalobe P2 screws flanking the Lightning/USB-C port at the bottom of the device.'),
  (3, 'Apply Heat to Soften Adhesive', 'Heat the screen edges with an iOpener for 90 seconds per side. The display adhesive softens at ~65°C.'),
  (4, 'Apply Suction Cup & Open', 'Apply the suction cup near the bottom edge. Pull firmly while inserting a guitar pick at the gap. Slide around the perimeter. Do not open past 90°.'),
  (5, 'Disconnect Battery Connector', 'Remove the 2-screw metal plate over the battery connector. Gently lift the battery flex cable to disconnect. CRITICAL: disconnect battery before all other connectors.'),
  (6, 'Remove Display Assembly', 'Disconnect the display connectors (usually 3-4 ribbon cables). Lift display away and set aside safely.'),
  (7, 'Pull Battery Pull Tab', 'Pull the battery adhesive stretch-release tabs parallel to the battery. Pull slowly at a low angle. Remove all adhesive strips before lifting battery.'),
  (8, 'Install New Battery', 'Seat the new battery. Apply fresh adhesive strips if pull tabs are missing. Route the flex cable correctly.'),
  (9, 'Reconnect & Test Before Closing', 'Reconnect battery connector. Briefly connect display. Power on to test new battery charge and Face ID before full reassembly.'),
  (10, 'Reassemble & Seal', 'Reverse all steps. Press display firmly along all edges to reseal adhesive. Re-insert Pentalobe screws. Run battery calibration: charge to 100%, use until 0%, charge fully again.')
) AS s(step_number, title, content)
WHERE g.id IS NOT NULL;

-- iPhone 15 Screen Replacement guide
WITH guide AS (
  INSERT INTO public.repair_guides (device_id, title, slug, summary, difficulty, time_estimate, guide_type)
  SELECT
    (SELECT id FROM public.repair_devices WHERE slug='iphone-15'),
    'iPhone 15 Screen Replacement',
    'iphone-15-screen-replacement',
    'Replace a cracked or unresponsive display on iPhone 15. Moderate difficulty — Face ID transfers with screen.',
    'moderate', '60–90 minutes', 'repair'
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
)
INSERT INTO public.repair_steps (guide_id, step_number, title, content)
SELECT g.id, s.step_number, s.title, s.content
FROM guide g,
(VALUES
  (1, 'Power Off & Backup', 'Fully power off device. Ensure you have an iCloud backup — Face ID calibration may reset.'),
  (2, 'Remove Pentalobe Screws', 'Remove the two 6.9mm Pentalobe screws at the bottom edge using a P2 driver.'),
  (3, 'Heat & Open', 'Apply heat gun or iOpener across all four screen edges. Insert picks and slide around to release adhesive. Open like a book toward the top edge.'),
  (4, 'Disconnect Battery First', 'Always disconnect battery before touching display cables to prevent shorting.'),
  (5, 'Remove Display Bracket & Connectors', 'Remove the 5-screw metal plate over display connectors. Disconnect all display ribbon cables carefully.'),
  (6, 'Transfer Earpiece + Face ID Module', 'The Face ID sensor array and earpiece must transfer to the new screen. Remove the 3-screw earpiece bracket and the flood illuminator/dot projector. Handle Face ID components with extreme care — replacements break Face ID.'),
  (7, 'Install New Display', 'Seat new display. Reconnect display cables in reverse order. Replace connector bracket.'),
  (8, 'Test Before Sealing', 'Connect battery. Power on. Verify: touch response, True Tone, Face ID enrollment prompt, brightness levels.'),
  (9, 'Seal & Reassemble', 'Press screen firmly with even pressure around perimeter. Replace Pentalobe screws. Allow adhesive to cure 1 hour before water exposure.')
) AS s(step_number, title, content)
WHERE g.id IS NOT NULL;

-- Samsung S24 Battery guide
WITH guide AS (
  INSERT INTO public.repair_guides (device_id, title, slug, summary, difficulty, time_estimate, guide_type)
  SELECT
    (SELECT id FROM public.repair_devices WHERE slug='samsung-s24'),
    'Samsung Galaxy S24 Battery Replacement',
    'samsung-s24-battery-replacement',
    'Replace the battery in the Galaxy S24. Moderate difficulty due to back glass removal required.',
    'moderate', '50–70 minutes', 'repair'
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
)
INSERT INTO public.repair_steps (guide_id, step_number, title, content)
SELECT g.id, s.step_number, s.title, s.content
FROM guide g,
(VALUES
  (1, 'Power Off Device', 'Hold power + volume down. Select Power Off. Wait 30 seconds.'),
  (2, 'Heat Back Glass', 'Apply heat gun to back glass at ~80°C for 2 minutes. Samsung uses strong adhesive — sufficient heat is critical.'),
  (3, 'Remove Back Glass', 'Apply suction cup to back glass. Insert pick at corner, slide around. The back glass lifts off as one piece.'),
  (4, 'Remove Screws & Motherboard Shield', 'Use Phillips PH00 to remove 12 screws securing the midframe plate. Lift the plate.'),
  (5, 'Disconnect Battery', 'Use spudger to disconnect the battery connector before any other ribbon cables.'),
  (6, 'Remove Battery', 'Samsung batteries use strong adhesive. Apply isopropyl alcohol around battery edges. Use plastic cards to slowly lift battery. Do not puncture.'),
  (7, 'Install New Battery', 'Place new battery. Apply adhesive backing. Route flex cable to connector position.'),
  (8, 'Reassemble & Test', 'Reverse steps. Apply new back glass adhesive strip before pressing back glass. Power on and run battery calibration cycle.')
) AS s(step_number, title, content)
WHERE g.id IS NOT NULL;

-- MacBook Air M2 Battery guide
WITH guide AS (
  INSERT INTO public.repair_guides (device_id, title, slug, summary, difficulty, time_estimate, guide_type)
  SELECT
    (SELECT id FROM public.repair_devices WHERE slug='macbook-air-m2'),
    'MacBook Air M2 Battery Replacement',
    'macbook-air-m2-battery-replacement',
    'Replace the internal battery on MacBook Air M2. Requires careful adhesive removal and SMC reset after.',
    'difficult', '90–120 minutes', 'repair'
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
)
INSERT INTO public.repair_steps (guide_id, step_number, title, content)
SELECT g.id, s.step_number, s.title, s.content
FROM guide g,
(VALUES
  (1, 'Discharge to Under 25%', 'Apple recommends discharging to below 25% before battery work to reduce fire risk from lithium cells.'),
  (2, 'Remove Bottom Case', 'Remove 8 P5 Pentalobe screws (corners + sides). The rear case lifts off.'),
  (3, 'Disconnect Battery Cable', 'The battery connector is near the right speaker. Use a spudger to lift and disconnect before touching anything else.'),
  (4, 'Remove Trackpad, Fan, and Speakers', 'The M2 Air battery fills most of the chassis. Remove fan (2 screws), speakers (4 screws), and trackpad cable bracket to gain full battery access.'),
  (5, 'Soften Battery Adhesive', 'Apply a small amount of 90%+ isopropyl alcohol under each battery cell using a syringe. Wait 2–3 minutes. The battery is glued with extremely strong adhesive.'),
  (6, 'Pry Battery Cells', 'Insert plastic card under each of the 3 battery cells. Gently flex to break adhesive bond. Avoid bending the cells — lithium pouch cells can vent if kinked.'),
  (7, 'Install New Battery Pack', 'Place new battery. Apply connector. Route cable neatly before reinstalling speakers and fan.'),
  (8, 'Reassemble & SMC Reset', 'Reinstall all components. After closing: connect power, hold Shift+Control+Option + Power for 10 seconds to reset SMC. Boot normally.')
) AS s(step_number, title, content)
WHERE g.id IS NOT NULL;

-- Redmi Note 13 Pro screen guide
WITH guide AS (
  INSERT INTO public.repair_guides (device_id, title, slug, summary, difficulty, time_estimate, guide_type)
  SELECT
    (SELECT id FROM public.repair_devices WHERE slug='redmi-note-13-pro'),
    'Redmi Note 13 Pro Screen Replacement',
    'redmi-note-13-pro-screen-replacement',
    'Replace a cracked or broken AMOLED display on the Redmi Note 13 Pro. Moderate difficulty.',
    'moderate', '40–60 minutes', 'repair'
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
)
INSERT INTO public.repair_steps (guide_id, step_number, title, content)
SELECT g.id, s.step_number, s.title, s.content
FROM guide g,
(VALUES
  (1, 'Power Off', 'Hold power button, select Power Off, wait 30 seconds.'),
  (2, 'Remove SIM Tray', 'Eject SIM tray from the left side.'),
  (3, 'Heat Back Cover', 'Apply gentle heat to back cover edges for 60–90 seconds.'),
  (4, 'Open Back Cover', 'Insert pick at corner, slide around all edges. Back cover snaps off.'),
  (5, 'Remove Internal Screws', 'Phillips PH00: remove all screws from midframe plate (typically 14–16 screws on Redmi models).'),
  (6, 'Disconnect Battery', 'Locate battery connector near bottom. Pry up carefully with spudger.'),
  (7, 'Disconnect Display Cable', 'The display flex cable connects at a ZIF connector near center. Lift the locking tab with a spudger, slide cable out.'),
  (8, 'Heat Front Glass', 'The screen is glued to the frame. Apply heat gun for 90 seconds per side at 70°C.'),
  (9, 'Separate Screen from Frame', 'Insert picks along heated edges. Slide slowly. Avoid sharp tools near camera cutouts.'),
  (10, 'Install New Screen', 'Seat new AMOLED panel into frame. Reconnect display cable. Lock ZIF connector. Reconnect battery. Test before applying adhesive.'),
  (11, 'Seal & Reassemble', 'Apply frame adhesive or B-7000 glue around perimeter. Press firmly. Replace all screws and back cover.')
) AS s(step_number, title, content)
WHERE g.id IS NOT NULL;

-- iPhone 15 Pro Max charging port troubleshooting guide
WITH guide AS (
  INSERT INTO public.repair_guides (device_id, title, slug, summary, difficulty, time_estimate, guide_type)
  SELECT
    (SELECT id FROM public.repair_devices WHERE slug='iphone-15-pro-max'),
    'iPhone 15 Pro Max USB-C Port Repair',
    'iphone-15-pro-max-usbc-port-repair',
    'Fix a loose, non-charging, or damaged USB-C port on iPhone 15 Pro Max. Advanced repair.',
    'difficult', '60–90 minutes', 'repair'
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
)
INSERT INTO public.repair_steps (guide_id, step_number, title, content)
SELECT g.id, s.step_number, s.title, s.content
FROM guide g,
(VALUES
  (1, 'Diagnose First', 'Try multiple certified cables. Clean port with compressed air. Check for lint/debris with flashlight. If charging works with one cable but not another, the cable is faulty — not the port.'),
  (2, 'Power Down', 'Power off fully before any disassembly.'),
  (3, 'Remove Bottom Pentalobe Screws', 'P2 Pentalobe, 6.9mm, x2 at bottom edge.'),
  (4, 'Open Display', 'Heat, suction, and open carefully. Disconnect battery before display cables.'),
  (5, 'Remove Entire Logic Board', 'USB-C port on iPhone 15 Pro Max is board-mounted. Full logic board removal is required.'),
  (6, 'Rework USB-C Port (Advanced)', 'USB-C port requires reflow soldering or hot air rework station. This step requires professional-level equipment. Recommend professional service.'),
  (7, 'Reassemble & Test', 'After port replacement/repair, test charging and data transfer before sealing device.')
) AS s(step_number, title, content)
WHERE g.id IS NOT NULL;

-- Add repair_categories column to repair_devices table alias for FK query support
-- (already set via category_id FK above)

