-- Migration: Clean Database Foundation for TamrakarComplex.com
-- Creates normalized catalog system while keeping backward compatibility with existing products table

-- 1. brands table
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  logo_url text,
  aliases jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. device_models table
CREATE TABLE IF NOT EXISTS public.device_models (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('phone', 'tablet', 'laptop', 'watch', 'accessory')),
  launch_year integer,
  source_url text,
  source_site text,
  verified boolean DEFAULT false,
  verified_at timestamp with time zone,
  popularity_score integer DEFAULT 0,
  search_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. device_variants table
CREATE TABLE IF NOT EXISTS public.device_variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id uuid REFERENCES public.device_models(id) ON DELETE CASCADE,
  storage text,
  ram text,
  color text,
  region text DEFAULT 'NP',
  sku text UNIQUE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. catalog_products table
CREATE TABLE IF NOT EXISTS public.catalog_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  model_id uuid REFERENCES public.device_models(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.device_variants(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  image_url text,
  specs_json jsonb DEFAULT '{}'::jsonb,
  price_npr decimal(10,2),
  price_text text,
  source_url text,
  source_site text,
  verified boolean DEFAULT false,
  is_price_list_item boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. store_inventory table
CREATE TABLE IF NOT EXISTS public.store_inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  catalog_product_id uuid REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  condition text NOT NULL CHECK (condition IN ('new', 'used', 'refurbished', 'open_box')),
  stock_qty integer DEFAULT 0,
  price decimal(10,2),
  warranty text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(store_id, catalog_product_id, condition)
);

-- 6. device_search_events table (updated from previous)
CREATE TABLE IF NOT EXISTS public.device_search_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  model_id uuid REFERENCES public.device_models(id) ON DELETE CASCADE,
  query text,
  event_type text NOT NULL CHECK (event_type IN ('search', 'click', 'view', 'quote')),
  created_at timestamp with time zone DEFAULT now()
);

-- 7. audit_logs table (ensure exists)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_models_brand_id ON public.device_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_device_models_category ON public.device_models(category);
CREATE INDEX IF NOT EXISTS idx_device_variants_model_id ON public.device_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_brand_id ON public.catalog_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_model_id ON public.catalog_products(model_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_store_id ON public.store_inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_catalog_product_id ON public.store_inventory(catalog_product_id);
CREATE INDEX IF NOT EXISTS idx_device_search_events_brand_id ON public.device_search_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_device_search_events_model_id ON public.device_search_events(model_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

-- Row Level Security (RLS) Policies

-- brands: Public read active brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active brands" ON public.brands;
CREATE POLICY "Public read active brands" ON public.brands
  FOR SELECT USING (active = true);

-- Staff admin and super admin can manage
DROP POLICY IF EXISTS "Staff admin manage brands" ON public.brands;
CREATE POLICY "Staff admin manage brands" ON public.brands
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- device_models: Public read verified active models
ALTER TABLE public.device_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read verified active models" ON public.device_models;
CREATE POLICY "Public read verified active models" ON public.device_models
  FOR SELECT USING (verified = true AND status = 'active');

DROP POLICY IF EXISTS "Staff admin manage models" ON public.device_models;
CREATE POLICY "Staff admin manage models" ON public.device_models
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- device_variants: Public read
ALTER TABLE public.device_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read variants" ON public.device_variants;
CREATE POLICY "Public read variants" ON public.device_variants
  FOR SELECT USING (status = 'active');

-- catalog_products: Public read active verified
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read catalog products" ON public.catalog_products;
CREATE POLICY "Public read catalog products" ON public.catalog_products
  FOR SELECT USING (is_active = true AND verified = true);

DROP POLICY IF EXISTS "Staff admin manage catalog" ON public.catalog_products;
CREATE POLICY "Staff admin manage catalog" ON public.catalog_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- store_inventory: Public read available, store admin manage own
ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read inventory" ON public.store_inventory;
CREATE POLICY "Public read inventory" ON public.store_inventory
  FOR SELECT USING (status = 'active' AND stock_qty > 0);

DROP POLICY IF EXISTS "Store admin manage own inventory" ON public.store_inventory;
CREATE POLICY "Store admin manage own inventory" ON public.store_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.store_admins sa ON sa.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND sa.store_id = store_inventory.store_id
      AND ur.role = 'storeadmin'
    )
  );

-- device_search_events: Insert for all, read for admins
ALTER TABLE public.device_search_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert search events" ON public.device_search_events;
CREATE POLICY "Anyone can insert search events" ON public.device_search_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read search events" ON public.device_search_events;
CREATE POLICY "Admins read search events" ON public.device_search_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- audit_logs: Only admins can read, system inserts
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_table_name text,
  p_record_id uuid,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_data,
    p_new_data,
    NULL, -- Would need to get from request headers in edge function
    NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for auto audit on catalog tables
CREATE OR REPLACE FUNCTION public.audit_catalog_changes() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('INSERT', TG_TABLE_NAME, NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to catalog tables
DROP TRIGGER IF EXISTS audit_brands ON public.brands;
CREATE TRIGGER audit_brands AFTER INSERT OR UPDATE OR DELETE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.audit_catalog_changes();

DROP TRIGGER IF EXISTS audit_device_models ON public.device_models;
CREATE TRIGGER audit_device_models AFTER INSERT OR UPDATE OR DELETE ON public.device_models
  FOR EACH ROW EXECUTE FUNCTION public.audit_catalog_changes();

DROP TRIGGER IF EXISTS audit_catalog_products ON public.catalog_products;
CREATE TRIGGER audit_catalog_products AFTER INSERT OR UPDATE OR DELETE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.audit_catalog_changes();

DROP TRIGGER IF EXISTS audit_store_inventory ON public.store_inventory;
CREATE TRIGGER audit_store_inventory AFTER INSERT OR UPDATE OR DELETE ON public.store_inventory
  FOR EACH ROW EXECUTE FUNCTION public.audit_catalog_changes();

-- Seed initial brands if empty
INSERT INTO public.brands (name, slug, aliases, sort_order) VALUES
('Samsung', 'samsung', '["Samsung", "samsung"]', 1),
('Apple', 'apple', '["Apple", "iPhone"]', 2),
('Xiaomi', 'xiaomi', '["Xiaomi", "MI", "Redmi"]', 3),
('OnePlus', 'oneplus', '["OnePlus", "oneplus"]', 4),
('Google', 'google', '["Google", "Pixel"]', 5)
ON CONFLICT (name) DO NOTHING;