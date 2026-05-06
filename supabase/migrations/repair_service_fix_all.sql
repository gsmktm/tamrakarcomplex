-- COMPREHENSIVE REPAIR SERVICE SCHEMA
-- Run this in your Supabase SQL Editor to fix all database issues

-- 1. Repair Categories (Hierarchy: Computer -> MacBook -> MacBook Pro)
CREATE TABLE IF NOT EXISTS public.repair_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.repair_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Repair Devices (e.g., MacBook Pro 13" Retina Late 2012)
CREATE TABLE IF NOT EXISTS public.repair_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.repair_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,
    model_number TEXT,
    image TEXT,
    summary TEXT,
    specifications JSONB DEFAULT '{}', -- Store detailed specs like iFixit
    meta_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Repair Guides (e.g., Screen Replacement)
CREATE TABLE IF NOT EXISTS public.repair_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES public.repair_devices(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image TEXT,
    summary TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'difficult', 'very_difficult')),
    time_estimate TEXT,
    guide_type TEXT NOT NULL DEFAULT 'repair',
    author TEXT DEFAULT 'iFixit / Tech Team',
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Repair Steps
CREATE TABLE IF NOT EXISTS public.repair_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID REFERENCES public.repair_guides(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    images JSONB DEFAULT '[]',
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(guide_id, step_number)
);

-- 4. Repair Tools
CREATE TABLE IF NOT EXISTS public.repair_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    url TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Guide Tools Junction
CREATE TABLE IF NOT EXISTS public.repair_guide_tools (
    guide_id UUID REFERENCES public.repair_guides(id) ON DELETE CASCADE,
    tool_id UUID REFERENCES public.repair_tools(id) ON DELETE CASCADE,
    PRIMARY KEY (guide_id, tool_id)
);

-- 6. Repair Parts
CREATE TABLE IF NOT EXISTS public.repair_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT,
    image TEXT,
    estimated_price NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Guide Parts Junction
CREATE TABLE IF NOT EXISTS public.repair_guide_parts (
    guide_id UUID REFERENCES public.repair_guides(id) ON DELETE CASCADE,
    part_id UUID REFERENCES public.repair_parts(id) ON DELETE CASCADE,
    PRIMARY KEY (guide_id, part_id)
);

-- 8. Fix repair_requests table columns and constraints
DO $$ 
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'repair_requests' AND column_name = 'device_id') THEN
        ALTER TABLE public.repair_requests ADD COLUMN device_id UUID REFERENCES public.repair_devices(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'repair_requests' AND column_name = 'guide_id') THEN
        ALTER TABLE public.repair_requests ADD COLUMN guide_id UUID REFERENCES public.repair_guides(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'repair_requests' AND column_name = 'assigned_store_id') THEN
        ALTER TABLE public.repair_requests ADD COLUMN assigned_store_id UUID REFERENCES public.stores(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'repair_requests' AND column_name = 'tracking_id') THEN
        ALTER TABLE public.repair_requests ADD COLUMN tracking_id TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'repair_requests' AND column_name = 'estimated_cost') THEN
        ALTER TABLE public.repair_requests ADD COLUMN estimated_cost NUMERIC(10, 2);
    END IF;
END $$;

-- 9. RLS POLICIES

-- Enable RLS on all tables
ALTER TABLE public.repair_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_guide_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_guide_parts ENABLE ROW LEVEL SECURITY;

-- DROP OLD POLICIES TO AVOID CONFLICTS
DROP POLICY IF EXISTS "Anyone can view repair categories" ON public.repair_categories;
DROP POLICY IF EXISTS "Anyone can view repair devices" ON public.repair_devices;
DROP POLICY IF EXISTS "Anyone can view repair guides" ON public.repair_guides;
DROP POLICY IF EXISTS "Anyone can view repair steps" ON public.repair_steps;
DROP POLICY IF EXISTS "Anyone can view repair tools" ON public.repair_tools;
DROP POLICY IF EXISTS "Anyone can view repair parts" ON public.repair_parts;
DROP POLICY IF EXISTS "Anyone can view guide tools" ON public.repair_guide_tools;
DROP POLICY IF EXISTS "Anyone can view guide parts" ON public.repair_guide_parts;

-- Public Select Policies
CREATE POLICY "Anyone can view repair categories" ON public.repair_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view repair devices" ON public.repair_devices FOR SELECT USING (true);
CREATE POLICY "Anyone can view repair guides" ON public.repair_guides FOR SELECT USING (published = true);
CREATE POLICY "Anyone can view repair steps" ON public.repair_steps FOR SELECT USING (true);
CREATE POLICY "Anyone can view repair tools" ON public.repair_tools FOR SELECT USING (true);
CREATE POLICY "Anyone can view repair parts" ON public.repair_parts FOR SELECT USING (true);
CREATE POLICY "Anyone can view guide tools" ON public.repair_guide_tools FOR SELECT USING (true);
CREATE POLICY "Anyone can view guide parts" ON public.repair_guide_parts FOR SELECT USING (true);

-- Admin Manage Policies
CREATE POLICY "Admins manage repair categories" ON public.repair_categories FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage repair devices" ON public.repair_devices FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage repair guides" ON public.repair_guides FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage repair steps" ON public.repair_steps FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage repair tools" ON public.repair_tools FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage repair parts" ON public.repair_parts FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage guide tools" ON public.repair_guide_tools FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage guide parts" ON public.repair_guide_parts FOR ALL USING (public.is_admin());

-- Store Owner policies for repair_requests
DROP POLICY IF EXISTS "Admins and Store Owners manage repair requests" ON public.repair_requests;
CREATE POLICY "Admins and Store Owners manage repair requests"
ON public.repair_requests
FOR ALL
TO authenticated
USING (
    public.is_admin() OR 
    (public.is_store_owner() AND assigned_store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
);

-- 10. Triggers for Tracking ID
CREATE OR REPLACE FUNCTION generate_repair_tracking_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'TR-';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_repair_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_repair_tracking_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_repair_tracking_id ON public.repair_requests;
CREATE TRIGGER tr_set_repair_tracking_id
BEFORE INSERT ON public.repair_requests
FOR EACH ROW
EXECUTE FUNCTION set_repair_tracking_id();

-- 11. Sample Data (Optional, but good for testing)
INSERT INTO public.repair_devices (name, slug, brand, model_number, image, summary) 
VALUES ('iPhone 13', 'iphone-13', 'Apple', 'A2482', 'https://images.ifixit.com/igi/O4X6P6rR2m6S3W2R.medium', 'Apple flagship 2021')
ON CONFLICT (slug) DO NOTHING;
