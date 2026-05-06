-- Master Mobile Database System Migration
-- One Model = One ID = Whole System Connection

-- 1. Brands (Ensuring existing table has correct fields)
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Phone Series
CREATE TABLE IF NOT EXISTS public.phone_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Phone Models
CREATE TABLE IF NOT EXISTS public.phone_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
    series_id UUID REFERENCES public.phone_series(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    model_number TEXT,
    release_year INTEGER,
    image TEXT,
    status TEXT DEFAULT 'active',
    search_keywords TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Phone Variants
CREATE TABLE IF NOT EXISTS public.phone_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES public.phone_models(id) ON DELETE CASCADE,
    ram TEXT,
    storage TEXT,
    color TEXT,
    region TEXT,
    condition_type TEXT DEFAULT 'new',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Phone Specifications
CREATE TABLE IF NOT EXISTS public.phone_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES public.phone_models(id) ON DELETE CASCADE UNIQUE,
    display TEXT,
    processor TEXT,
    camera TEXT,
    battery TEXT,
    charging TEXT,
    os TEXT,
    network TEXT,
    body TEXT,
    pros TEXT[] DEFAULT '{}',
    cons TEXT[] DEFAULT '{}',
    verdict TEXT,
    highlights JSONB,
    full_specs_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Inventory Items (New Phone Stock)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES public.phone_models(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.phone_variants(id) ON DELETE CASCADE,
    store_id UUID NOT NULL, -- Reference to stores table
    price INTEGER NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    condition TEXT DEFAULT 'new',
    warranty TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Used Phone Listings
CREATE TABLE IF NOT EXISTS public.used_phone_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES public.phone_models(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.phone_variants(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL, -- Reference to users/profiles
    store_id UUID, -- Optional store reference
    condition TEXT NOT NULL,
    expected_price INTEGER NOT NULL,
    approved_price INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Exchange Values
CREATE TABLE IF NOT EXISTS public.exchange_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES public.phone_models(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.phone_variants(id) ON DELETE CASCADE,
    min_value INTEGER NOT NULL,
    max_value INTEGER NOT NULL,
    condition_grade TEXT NOT NULL,
    admin_note TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Unlocking Services
CREATE TABLE IF NOT EXISTS public.unlocking_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES public.phone_models(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    price INTEGER NOT NULL,
    time_required TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Repair Services
CREATE TABLE IF NOT EXISTS public.repair_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES public.phone_models(id) ON DELETE CASCADE,
    repair_type TEXT NOT NULL,
    part_name TEXT,
    price INTEGER,
    time_required TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Accessories
CREATE TABLE IF NOT EXISTS public.accessories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    price INTEGER NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Accessory Compatibility
CREATE TABLE IF NOT EXISTS public.accessory_compatibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accessory_id UUID REFERENCES public.accessories(id) ON DELETE CASCADE,
    model_id UUID REFERENCES public.phone_models(id) ON DELETE CASCADE,
    compatibility_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Search Aliases
CREATE TABLE IF NOT EXISTS public.search_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES public.phone_models(id) ON DELETE CASCADE,
    alias_text TEXT NOT NULL,
    normalized_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Auto SEO Pages
CREATE TABLE IF NOT EXISTS public.auto_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES public.phone_models(id) ON DELETE CASCADE,
    page_type TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    meta_description TEXT,
    content TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_models_brand ON public.phone_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_phone_models_series ON public.phone_models(series_id);
CREATE INDEX IF NOT EXISTS idx_phone_variants_model ON public.phone_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_model ON public.inventory_items(model_id);
CREATE INDEX IF NOT EXISTS idx_used_phone_listings_model ON public.used_phone_listings(model_id);
CREATE INDEX IF NOT EXISTS idx_search_aliases_text ON public.search_aliases(normalized_text);

-- RLS Policies (Basic staff access)
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_phone_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlocking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessory_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_pages ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on master data brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data series" ON public.phone_series FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data models" ON public.phone_models FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data variants" ON public.phone_variants FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data specs" ON public.phone_specs FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data inventory" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data used" ON public.used_phone_listings FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data exchange" ON public.exchange_values FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data unlocking" ON public.unlocking_services FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data repair" ON public.repair_services FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data accessories" ON public.accessories FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data compatibility" ON public.accessory_compatibility FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data search" ON public.search_aliases FOR SELECT USING (true);
CREATE POLICY "Allow public read access on master data autopages" ON public.auto_pages FOR SELECT USING (true);

-- Allow staff to manage
CREATE POLICY "Staff can manage master data brands" ON public.brands FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data series" ON public.phone_series FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data models" ON public.phone_models FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data variants" ON public.phone_variants FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data specs" ON public.phone_specs FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data inventory" ON public.inventory_items FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data used" ON public.used_phone_listings FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data exchange" ON public.exchange_values FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data unlocking" ON public.unlocking_services FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data repair" ON public.repair_services FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data accessories" ON public.accessories FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data compatibility" ON public.accessory_compatibility FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data search" ON public.search_aliases FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Staff can manage master data autopages" ON public.auto_pages FOR ALL TO authenticated USING (public.is_admin());
