-- Marketplace scale to thousands of stores (stores/pricing + multi-tenant)
-- Enables: indexed search, package scheduling, pagination, RLS sharding

-- 1. Enable pg_trgm for store search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. store_packages: add is_active, is_popular, yearly_price, sort_order if missing
ALTER TABLE store_packages ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE store_packages ADD COLUMN IF NOT EXISTS is_popular boolean DEFAULT false;
ALTER TABLE store_packages ADD COLUMN IF NOT EXISTS yearly_price numeric DEFAULT 0;
ALTER TABLE store_packages ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 999;
CREATE INDEX IF NOT EXISTS idx_store_packages_slug ON store_packages(slug);
CREATE INDEX IF NOT EXISTS idx_store_packages_active_sort ON store_packages(is_active, sort_order, price);

UPDATE store_packages SET is_active = true WHERE is_active IS NULL;
UPDATE store_packages SET sort_order = CASE slug WHEN 'free' THEN 0 WHEN 'silver' THEN 1 WHEN 'gold' THEN 2 WHEN 'diamond' THEN 3 ELSE 999 END WHERE sort_order = 999;
UPDATE store_packages SET is_popular = (slug = 'gold') WHERE is_popular IS DISTINCT FROM true;
UPDATE store_packages SET yearly_price = price * 10 WHERE yearly_price IS NULL OR yearly_price = 0;

-- 3. stores: indexes for thousands
CREATE INDEX IF NOT EXISTS idx_stores_package_slug ON stores(package_slug);
CREATE INDEX IF NOT EXISTS idx_stores_verified ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_owner_user_id ON stores(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_stores_created_at ON stores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stores_name_trgm ON stores USING gin (name gin_trgm_ops);
-- search_vector for full-text
ALTER TABLE stores ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_stores_search_vector ON stores USING gin(search_vector);
CREATE OR REPLACE FUNCTION stores_search_vector_update() RETURNS trigger AS $$
BEGIN NEW.search_vector := to_tsvector('english', coalesce(NEW.name,'') || ' ' || coalesce(NEW.location,'') || ' ' || coalesce(NEW.shop_no,'')); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_stores_search_vector ON stores;
CREATE TRIGGER trg_stores_search_vector BEFORE INSERT OR UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION stores_search_vector_update();

-- 4. store_admins / store_staff composite
CREATE INDEX IF NOT EXISTS idx_store_admins_user_store_status ON store_admins(user_id, store_id, status);
CREATE INDEX IF NOT EXISTS idx_store_staff_user_store_status ON store_staff(user_id, store_id, status);

-- 5. marketplace listings + store_products: pagination indexes
CREATE INDEX IF NOT EXISTS idx_store_products_store_status ON store_products(store_id, status);
CREATE INDEX IF NOT EXISTS idx_store_products_created ON store_products(created_at DESC);
