-- Phase 7: Query and admin UI performance
-- Adds indexes supporting the server-side pagination + filter patterns
-- introduced in RepairManager, ProductManager, StoreManager, OrderManager.

-- repair_requests: filtered by assigned_store_id, ordered by created_at desc
CREATE INDEX IF NOT EXISTS idx_repair_requests_assigned_store_created
  ON repair_requests (assigned_store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repair_requests_status_created
  ON repair_requests (status, created_at DESC);

-- order_items: filtered by store_id to derive relevant order IDs
CREATE INDEX IF NOT EXISTS idx_order_items_store_id
  ON order_items (store_id);
CREATE INDEX IF NOT NULL idx_order_items_order_id
  ON order_items (order_id);

-- orders: ordered by created_at desc (already likely has an index, but ensure)
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created
  ON orders (user_id, created_at DESC);

-- products: filtered by store_id + brand + category, ordered by created_at desc
CREATE INDEX IF NOT EXISTS idx_products_store_brand_cat
  ON products (store_id, brand, category);
CREATE INDEX IF NOT EXISTS idx_products_store_created
  ON products (store_id, created_at DESC);

-- stores: filtered by owner_id / membership, ordered by name
CREATE INDEX IF NOT EXISTS idx_stores_owner_id
  ON stores (owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_name_pattern
  ON stores (name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_stores_status_created
  ON stores (status, created_at DESC);

-- store_admins: queried for store_id membership lookups
CREATE INDEX IF NOT EXISTS idx_store_admins_user_status
  ON store_admins (user_id, status);
