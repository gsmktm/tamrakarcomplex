-- Migration: Fix Schema Conflicts and Consolidate Tables

-- 1. Fix brands table (Rename canonical_name to name if it exists, ensure all columns)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'canonical_name') THEN
    ALTER TABLE public.brands RENAME COLUMN canonical_name TO name;
  END IF;
END $$;

ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- 2. Fix catalog_products (Add missing columns)
ALTER TABLE public.catalog_products
ADD COLUMN IF NOT EXISTS specs_json jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS price_npr numeric,
ADD COLUMN IF NOT EXISTS price_text text,
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS source_site text,
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS is_price_list_item boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS popularity_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_pinned boolean DEFAULT false;

-- 3. Fix device_search_events (Ensure final schema)
ALTER TABLE public.device_search_events
ADD COLUMN IF NOT EXISTS catalog_product_id uuid REFERENCES public.catalog_products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS brand_name text,
ADD COLUMN IF NOT EXISTS model_name text;

-- 4. Fix orders (Ensure order_status column)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_status text DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'));

-- 5. Fix order_items (Ensure unit_price, total_price, store_id)
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS unit_price decimal(10,2),
ADD COLUMN IF NOT EXISTS total_price decimal(10,2),
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;

-- 6. Initial brands data
INSERT INTO public.brands (name, slug, aliases)
VALUES 
  ('Samsung', 'samsung', '["Samsung", "samsung", "SAMSUNG"]'),
  ('Apple', 'apple', '["Apple", "iPhone", "apple"]'),
  ('Google', 'google', '["Google", "Pixel", "google"]'),
  ('OnePlus', 'oneplus', '["OnePlus", "oneplus", "One Plus"]'),
  ('Xiaomi', 'xiaomi', '["Xiaomi", "MI", "Redmi", "xiaomi"]'),
  ('Huawei', 'huawei', '["Huawei", "huawei", "Honor"]'),
  ('Sony', 'sony', '["Sony", "Xperia", "sony"]'),
  ('LG', 'lg', '["LG", "lg"]'),
  ('Motorola', 'motorola', '["Motorola", "Moto", "motorola"]'),
  ('Nokia', 'nokia', '["Nokia", "nokia"]')
ON CONFLICT (name) DO UPDATE 
SET aliases = EXCLUDED.aliases,
    slug = EXCLUDED.slug;

-- 7. Fix commission calculation (replace get_store_entitlements with CASE)
CREATE OR REPLACE FUNCTION public.calculate_store_commission(
  p_store_id uuid,
  p_order_amount decimal
) RETURNS decimal AS $$
DECLARE
  v_commission_percent decimal;
  v_package_slug text;
BEGIN
  -- Get store's package
  SELECT package_slug, marketplace_commission 
  INTO v_package_slug, v_commission_percent
  FROM public.stores 
  WHERE id = p_store_id;

  -- If store has explicit commission set, use it
  IF v_commission_percent IS NOT NULL THEN
    RETURN (p_order_amount * v_commission_percent / 100);
  END IF;

  -- Otherwise use package defaults
  v_commission_percent := CASE v_package_slug
    WHEN 'diamond' THEN 5
    WHEN 'gold' THEN 7
    WHEN 'silver' THEN 10
    ELSE 12 -- default commission
  END;

  RETURN (p_order_amount * v_commission_percent / 100);
END;
$$ LANGUAGE plpgsql;
