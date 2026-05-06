
-- 1. Create brands table
CREATE TABLE IF NOT EXISTS public.brands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    logo text,
    active boolean DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create device_models table
CREATE TABLE IF NOT EXISTS public.device_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    launch_year integer,
    category text DEFAULT 'phone', -- phone, tablet, watch, laptop, etc.
    status text DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(brand_id, slug)
);

-- 3. Create device_variants table
CREATE TABLE IF NOT EXISTS public.device_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id uuid REFERENCES public.device_models(id) ON DELETE CASCADE,
    storage text, -- e.g. 128GB, 256GB
    ram text,     -- e.g. 8GB, 12GB
    color text,
    region text,
    sku text UNIQUE,
    status text DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create catalog_products table (Master Products)
CREATE TABLE IF NOT EXISTS public.catalog_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid REFERENCES public.brands(id),
    model_id uuid REFERENCES public.device_models(id),
    variant_id uuid REFERENCES public.device_variants(id),
    name text NOT NULL, -- Full name e.g. "iPhone 15 Pro 256GB Blue Titanium"
    slug text NOT NULL UNIQUE,
    image_url text,
    specs_summary jsonb,
    is_active boolean DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create store_inventory table
CREATE TABLE IF NOT EXISTS public.store_inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    catalog_product_id uuid REFERENCES public.catalog_products(id) ON DELETE CASCADE,
    condition text NOT NULL, -- new, used, refurbished
    stock_qty integer DEFAULT 0,
    price decimal(12,2) NOT NULL,
    warranty text,
    status text DEFAULT 'available', -- available, out_of_stock, reserved
    source_type text DEFAULT 'store', -- store, marketplace
    last_updated_by uuid REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public can view catalog" ON public.brands;
CREATE POLICY "Public can view catalog" ON public.brands FOR SELECT TO public USING (active = true);
DROP POLICY IF EXISTS "Public can view models" ON public.device_models;
CREATE POLICY "Public can view models" ON public.device_models FOR SELECT TO public USING (status = 'active');
DROP POLICY IF EXISTS "Public can view variants" ON public.device_variants;
CREATE POLICY "Public can view variants" ON public.device_variants FOR SELECT TO public USING (status = 'active');
DROP POLICY IF EXISTS "Public can view catalog products" ON public.catalog_products;
CREATE POLICY "Public can view catalog products" ON public.catalog_products FOR SELECT TO public USING (is_active = true);
DROP POLICY IF EXISTS "Public can view inventory" ON public.store_inventory;
CREATE POLICY "Public can view inventory" ON public.store_inventory FOR SELECT TO public USING (status = 'available');

-- Admin policies
DROP POLICY IF EXISTS "Staff can manage catalog" ON public.brands;
CREATE POLICY "Staff can manage catalog" ON public.brands FOR ALL TO authenticated USING (public.is_staff_admin());
DROP POLICY IF EXISTS "Staff can manage models" ON public.device_models;
CREATE POLICY "Staff can manage models" ON public.device_models FOR ALL TO authenticated USING (public.is_staff_admin());
DROP POLICY IF EXISTS "Staff can manage variants" ON public.device_variants;
CREATE POLICY "Staff can manage variants" ON public.device_variants FOR ALL TO authenticated USING (public.is_staff_admin());
DROP POLICY IF EXISTS "Staff can manage catalog products" ON public.catalog_products;
CREATE POLICY "Staff can manage catalog products" ON public.catalog_products FOR ALL TO authenticated USING (public.is_staff_admin());

-- Store Admin policies for inventory
DROP POLICY IF EXISTS "Store admins can manage their own inventory" ON public.store_inventory;
CREATE POLICY "Store admins can manage their own inventory"
ON public.store_inventory FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.store_admins
        WHERE store_id = store_inventory.store_id
        AND user_id = auth.uid()
    ) OR public.is_staff_admin()
);

-- Triggers for audit logging (using the helper from previous migration)
CREATE TRIGGER audit_brands AFTER INSERT OR UPDATE OR DELETE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();
CREATE TRIGGER audit_device_models AFTER INSERT OR UPDATE OR DELETE ON public.device_models FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();
CREATE TRIGGER audit_device_variants AFTER INSERT OR UPDATE OR DELETE ON public.device_variants FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();
CREATE TRIGGER audit_catalog_products AFTER INSERT OR UPDATE OR DELETE ON public.catalog_products FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();
CREATE TRIGGER audit_store_inventory AFTER INSERT OR UPDATE OR DELETE ON public.store_inventory FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();
