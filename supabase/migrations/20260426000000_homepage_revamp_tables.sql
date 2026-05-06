-- Create homepage_settings table
CREATE TABLE IF NOT EXISTS public.homepage_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create home_offers table
CREATE TABLE IF NOT EXISTS public.home_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT,
    discount_text TEXT,
    target_url TEXT,
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create store_applications table
CREATE TABLE IF NOT EXISTS public.store_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_name TEXT NOT NULL,
    store_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    location TEXT NOT NULL,
    shop_number TEXT,
    business_type TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Update repair_requests with location and tracking code if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='repair_requests' AND column_name='location') THEN
        ALTER TABLE public.repair_requests ADD COLUMN location TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='repair_requests' AND column_name='tracking_code') THEN
        ALTER TABLE public.repair_requests ADD COLUMN tracking_code TEXT UNIQUE;
    END IF;
END $$;

-- RLS Policies for homepage_settings
ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for homepage_settings" ON public.homepage_settings;
CREATE POLICY "Public read access for homepage_settings" ON public.homepage_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Suadmin manage homepage_settings" ON public.homepage_settings;
CREATE POLICY "Suadmin manage homepage_settings" ON public.homepage_settings FOR ALL USING (public.is_super_admin());

-- RLS Policies for home_offers
ALTER TABLE public.home_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for active home_offers" ON public.home_offers;
CREATE POLICY "Public read access for active home_offers" ON public.home_offers FOR SELECT USING (active = true);
DROP POLICY IF EXISTS "Suadmin manage home_offers" ON public.home_offers;
CREATE POLICY "Suadmin manage home_offers" ON public.home_offers FOR ALL USING (public.is_super_admin());

-- RLS Policies for store_applications
ALTER TABLE public.store_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert store applications" ON public.store_applications;
CREATE POLICY "Anyone can insert store applications" ON public.store_applications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Suadmin/Staff manage store applications" ON public.store_applications;
CREATE POLICY "Suadmin/Staff manage store applications" ON public.store_applications FOR ALL USING (public.is_staff_admin());

-- Seed default homepage settings
INSERT INTO public.homepage_settings (key, value)
VALUES 
    ('hero_section', '{"enabled": true, "title": "Nepal’s Largest Mobile Market Hub", "subtitle": "Buy, sell, exchange, and repair phones at Tamrakar Complex - the heart of Nepal’s mobile industry."}'::jsonb),
    ('sections_control', '{"search_box": true, "quick_actions": true, "price_finder": true, "phone_finder": true, "marketplace_feed": true, "repair_form": true, "store_spotlight": true, "offers": true, "trust_stats": true, "compare_mini": true}'::jsonb),
    ('trust_stats', '{"stores": "250+", "monthly_flow": "100K+", "services": "Buy / Sell / Repair / Exchange", "network": "Verified Store Network", "hub": "Nepal Mobile Market Hub"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
