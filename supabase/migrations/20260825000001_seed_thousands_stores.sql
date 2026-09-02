-- Seed thousands of stores for marketplace scale (81 → 1000+)
-- Uses service role (bypasses RLS), idempotent via slug
-- NOTE: stores table has no 'address' column; 'status' is GENERATED (from is_active)

-- Ensure slug has unique constraint (required for ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_slug_unique ON stores(slug);

INSERT INTO stores (name, slug, seo_slug, location, shop_no, package_slug, public_status, is_verified, is_featured, is_active)
SELECT
  'Demo Store ' || LPAD(s::text, 4, '0') || ' - ' || (ARRAY['New Road','Thamel','Patan','Pokhara','Butwal','Biratnagar','Dharan','Itahari','Hetauda','Janakpur'])[1 + (s % 10)] as name,
  'demo-store-' || LPAD(s::text, 4, '0') as slug,
  'demo-store-' || LPAD(s::text, 4, '0') as seo_slug,
  (ARRAY['New Road, Kathmandu','Thamel, Kathmandu','Patan Dhoka, Lalitpur','Lakeside, Pokhara','Rajmarg Chaurah, Butwal','Traffic Chowk, Biratnagar','Bhanu Chowk, Dharan','Itahari Chowk, Itahari','Hetauda Chowk, Hetauda','Janakpur Chowk, Janakpur'])[1 + (s % 10)] as location,
  'Shop No. ' || s as shop_no,
  (ARRAY['free','silver','gold','diamond'])[1 + (s % 4)] as package_slug,
  'published' as public_status,
  (s % 3 = 0) as is_verified,
  (s % 10 = 0) as is_featured,
  true as is_active
FROM generate_series(82, 1000) s
ON CONFLICT (slug) DO NOTHING;
