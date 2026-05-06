-- Seed data for Repair Service based on iFixit data
-- Hierarchical Categories
INSERT INTO public.repair_categories (name, slug, image) VALUES
('Computer', 'computer', 'https://images.ifixit.com/igi/fLqW6R6M6S3W2R.medium'),
('Laptop', 'laptop', 'https://images.ifixit.com/igi/R6P6R6M6S3W2R.medium'),
('Smartphone', 'smartphone', 'https://images.ifixit.com/igi/O4X6P6rR2m6S3W2R.medium')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  image = COALESCE(EXCLUDED.image, public.repair_categories.image);

-- Subcategories
INSERT INTO public.repair_categories (parent_id, name, slug) 
SELECT id, 'MacBook', 'macbook' FROM public.repair_categories WHERE slug = 'laptop'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.repair_categories (parent_id, name, slug) 
SELECT id, 'MacBook Pro', 'macbook-pro' FROM public.repair_categories WHERE slug = 'macbook'
ON CONFLICT (slug) DO NOTHING;

-- Device: MacBook Pro 13" Retina Display Late 2012
INSERT INTO public.repair_devices (category_id, name, slug, brand, model_number, image, summary, specifications)
SELECT id, 'MacBook Pro 13" Retina Late 2012', 'macbook-pro-13-retina-late-2012', 'Apple', 'A1425', 
'https://images.ifixit.com/igi/S6P6R6M6S3W2R.medium', 
'The MacBook Pro 13" Retina Display Late 2012 is a powerful laptop with a high-resolution display.',
'{"CPU": "2.5 GHz Core i5", "RAM": "8 GB", "Storage": "128 GB SSD", "Battery": "74 Wh Li-Poly"}'
FROM public.repair_categories WHERE slug = 'macbook-pro'
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  model_number = EXCLUDED.model_number,
  image = COALESCE(EXCLUDED.image, public.repair_devices.image),
  summary = COALESCE(EXCLUDED.summary, public.repair_devices.summary),
  specifications = COALESCE(EXCLUDED.specifications, public.repair_devices.specifications),
  category_id = COALESCE(EXCLUDED.category_id, public.repair_devices.category_id);

-- Guide: MacBook Pro 13" Retina Late 2012 Battery Replacement
WITH guide_row AS (
    INSERT INTO public.repair_guides (device_id, title, slug, image, summary, difficulty, time_estimate, guide_type)
    SELECT id, 'MacBook Pro 13" Retina Late 2012 Battery Replacement', 'macbook-pro-13-retina-battery', 
    'https://images.ifixit.com/igi/T6P6R6M6S3W2R.medium', 
    'Use this guide to replace a worn out or dead battery in your MacBook Pro.', 'difficult', '1-2 hours', 'replacement'
    FROM public.repair_devices WHERE slug = 'macbook-pro-13-retina-late-2012'
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      image = COALESCE(EXCLUDED.image, public.repair_guides.image),
      summary = COALESCE(EXCLUDED.summary, public.repair_guides.summary),
      difficulty = EXCLUDED.difficulty,
      time_estimate = EXCLUDED.time_estimate,
      guide_type = EXCLUDED.guide_type,
      published = true
    RETURNING id
)
INSERT INTO public.repair_steps (guide_id, step_number, title, content, images)
SELECT id, 1, 'Remove Pentalobe Screws', 'Remove the ten P5 pentalobe screws from the lower case.', '["https://images.ifixit.com/igi/V6P6R6M6S3W2R.large"]' FROM guide_row
UNION ALL
SELECT id, 2, 'Disconnect Battery', 'Grasp the plastic tab on the battery connector and pull it toward the front of the MacBook.', '["https://images.ifixit.com/igi/Q6P6R6M6S3W2R.large"]' FROM guide_row
ON CONFLICT (guide_id, step_number) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  images = EXCLUDED.images;

-- Device: iPhone 13
INSERT INTO public.repair_devices (category_id, name, slug, brand, model_number, image, summary)
SELECT id, 'iPhone 13', 'iphone-13', 'Apple', 'A2482', 'https://images.ifixit.com/igi/O4X6P6rR2m6S3W2R.medium', 'Apple flagship 2021'
FROM public.repair_categories WHERE slug = 'smartphone'
ON CONFLICT (slug) DO NOTHING;

-- Device: Samsung Galaxy S21
INSERT INTO public.repair_devices (category_id, name, slug, brand, model_number, image, summary) 
SELECT id, 'Samsung Galaxy S21', 'samsung-galaxy-s21', 'Samsung', 'SM-G991B', 'https://images.ifixit.com/igi/2P2G6R6M6S3W2R.medium', 'Samsung flagship 2021'
FROM public.repair_categories WHERE slug = 'smartphone'
ON CONFLICT (slug) DO NOTHING;
