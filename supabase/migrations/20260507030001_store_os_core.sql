-- Migration: Complete Store Operating System
-- This migration builds the full database structure for multi-tenant stores, packages, and permissions.

-- 1. store_packages table
CREATE TABLE IF NOT EXISTS public.store_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    price DECIMAL(10,2) DEFAULT 0,
    billing_cycle TEXT DEFAULT 'monthly',
    product_limit INTEGER DEFAULT 5,
    accessory_limit INTEGER DEFAULT 5,
    staff_limit INTEGER DEFAULT 0,
    exchange_enabled BOOLEAN DEFAULT false,
    repair_enabled BOOLEAN DEFAULT false,
    custom_seo_enabled BOOLEAN DEFAULT false,
    analytics_level TEXT DEFAULT 'none', -- 'none', 'basic', 'advanced'
    featured_enabled BOOLEAN DEFAULT false,
    verified_badge_enabled BOOLEAN DEFAULT false,
    homepage_promotion_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed default packages
INSERT INTO public.store_packages (name, slug, price, product_limit, accessory_limit, staff_limit, exchange_enabled, repair_enabled, custom_seo_enabled, analytics_level, featured_enabled, verified_badge_enabled, homepage_promotion_enabled)
VALUES 
('Free', 'free', 0, 5, 5, 0, false, false, false, 'none', false, false, false),
('Silver', 'silver', 1500, 25, 25, 2, true, true, false, 'basic', false, false, false),
('Gold', 'gold', 3500, 100, 100, 5, true, true, true, 'advanced', true, false, false),
('Diamond', 'diamond', 7500, 999999, 999999, 999999, true, true, true, 'advanced', true, true, true)
ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    product_limit = EXCLUDED.product_limit,
    accessory_limit = EXCLUDED.accessory_limit,
    staff_limit = EXCLUDED.staff_limit,
    exchange_enabled = EXCLUDED.exchange_enabled,
    repair_enabled = EXCLUDED.repair_enabled,
    custom_seo_enabled = EXCLUDED.custom_seo_enabled,
    analytics_level = EXCLUDED.analytics_level,
    featured_enabled = EXCLUDED.featured_enabled,
    verified_badge_enabled = EXCLUDED.verified_badge_enabled,
    homepage_promotion_enabled = EXCLUDED.homepage_promotion_enabled;

-- 3. Update stores table with new columns
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS seo_slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS meta_keywords TEXT[],
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS floor TEXT,
ADD COLUMN IF NOT EXISTS block TEXT,
ADD COLUMN IF NOT EXISTS public_status TEXT DEFAULT 'published' CHECK (public_status IN ('draft', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.store_packages(id),
ADD COLUMN IF NOT EXISTS package_slug TEXT DEFAULT 'free';

-- 4. store_staff table
CREATE TABLE IF NOT EXISTS public.store_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('manager', 'staff')),
    permissions JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, user_id)
);

-- 5. store_products table
CREATE TABLE IF NOT EXISTS public.store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_type TEXT DEFAULT 'phone' CHECK (product_type IN ('phone', 'tablet', 'laptop')),
    brand_id UUID, -- References catalog brands if exists
    model_id UUID, -- References catalog models if exists
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    condition TEXT CHECK (condition IN ('new', 'used', 'refurbished', 'open_box')),
    storage TEXT,
    color TEXT,
    price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 1,
    images TEXT[],
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. store_accessories table
CREATE TABLE IF NOT EXISTS public.store_accessories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    category TEXT, -- Case, Charger, Screen Protector, etc.
    brand TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 1,
    images TEXT[],
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. store_repair_services table
CREATE TABLE IF NOT EXISTS public.store_repair_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    device_type TEXT,
    estimated_price TEXT,
    estimated_time TEXT,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. store_leads table
CREATE TABLE IF NOT EXISTS public.store_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    lead_type TEXT DEFAULT 'inquiry' CHECK (lead_type IN ('inquiry', 'buy', 'exchange', 'repair')),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    message TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'rejected', 'cancelled')),
    source_page TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store device info for exchange/repair leads
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. store_reviews table
CREATE TABLE IF NOT EXISTS public.store_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    customer_name TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Helper functions for permissions
CREATE OR REPLACE FUNCTION public.is_store_admin(p_store_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.stores WHERE id = p_store_id AND owner_id = p_user_id
  ) OR public.has_role(p_user_id, 'admin'::public.app_role) OR public.has_role(p_user_id, 'suadmin'::public.app_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_store_staff(p_store_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.store_staff WHERE store_id = p_store_id AND user_id = p_user_id AND status = 'active'
  ) OR public.is_store_admin(p_store_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RLS Policies

-- Store Packages: Public read
ALTER TABLE public.store_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Packages are viewable by everyone" ON public.store_packages FOR SELECT USING (true);

-- Store Staff: Admins and staff of the store
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view their own record" ON public.store_staff FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Store admins can manage staff" ON public.store_staff FOR ALL USING (public.is_store_admin(store_id, auth.uid()));

-- Store Products
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON public.store_products FOR SELECT USING (status = 'active');
CREATE POLICY "Staff can manage products" ON public.store_products FOR ALL USING (public.is_store_staff(store_id, auth.uid()));

-- Store Accessories
ALTER TABLE public.store_accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accessories are viewable by everyone" ON public.store_accessories FOR SELECT USING (status = 'active');
CREATE POLICY "Staff can manage accessories" ON public.store_accessories FOR ALL USING (public.is_store_staff(store_id, auth.uid()));

-- Store Repair Services
ALTER TABLE public.store_repair_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services are viewable by everyone" ON public.store_repair_services FOR SELECT USING (status = 'active');
CREATE POLICY "Staff can manage services" ON public.store_repair_services FOR ALL USING (public.is_store_staff(store_id, auth.uid()));

-- Store Leads
ALTER TABLE public.store_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage leads" ON public.store_leads FOR ALL USING (public.is_store_staff(store_id, auth.uid()));
CREATE POLICY "Public can create leads" ON public.store_leads FOR INSERT WITH CHECK (true);

-- Store Reviews
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are viewable by everyone" ON public.store_reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "Authenticated users can create reviews" ON public.store_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage reviews" ON public.store_reviews FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'suadmin'::public.app_role));

-- 12. Triggers for updated_at
CREATE TRIGGER update_store_packages_updated_at BEFORE UPDATE ON public.store_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_staff_updated_at BEFORE UPDATE ON public.store_staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_products_updated_at BEFORE UPDATE ON public.store_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_accessories_updated_at BEFORE UPDATE ON public.store_accessories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_repair_services_updated_at BEFORE UPDATE ON public.store_repair_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_leads_updated_at BEFORE UPDATE ON public.store_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_reviews_updated_at BEFORE UPDATE ON public.store_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
