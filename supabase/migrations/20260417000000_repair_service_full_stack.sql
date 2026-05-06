-- Full Stack Repair Service Database Schema
-- Based on iFixit structure for mobile repair

-- 1. Repair Categories (Hierarchy: Computer -> Laptop -> MacBook Pro)
CREATE TABLE IF NOT EXISTS public.repair_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.repair_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Repair Devices (e.g., iPhone 13, Samsung S21)
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
    meta_data JSONB DEFAULT '{}', -- Store extra iFixit info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Repair Guides (e.g., Screen Replacement, Battery Replacement)
CREATE TABLE IF NOT EXISTS public.repair_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES public.repair_devices(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image TEXT,
    summary TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'difficult', 'very_difficult')),
    time_estimate TEXT, -- e.g., '30-60 minutes'
    guide_type TEXT NOT NULL DEFAULT 'repair', -- 'repair', 'teardown', 'upgrade'
    author TEXT DEFAULT 'iFixit / Tech Team',
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Repair Steps
CREATE TABLE IF NOT EXISTS public.repair_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID REFERENCES public.repair_guides(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    images JSONB DEFAULT '[]', -- Array of image URLs
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(guide_id, step_number)
);

-- 5. Repair Tools
CREATE TABLE IF NOT EXISTS public.repair_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    url TEXT, -- Link to buy or detail
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Guide Tools Junction
CREATE TABLE IF NOT EXISTS public.repair_guide_tools (
    guide_id UUID REFERENCES public.repair_guides(id) ON DELETE CASCADE,
    tool_id UUID REFERENCES public.repair_tools(id) ON DELETE CASCADE,
    PRIMARY KEY (guide_id, tool_id)
);

-- 7. Repair Parts
CREATE TABLE IF NOT EXISTS public.repair_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT,
    image TEXT,
    estimated_price NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Guide Parts Junction
CREATE TABLE IF NOT EXISTS public.repair_guide_parts (
    guide_id UUID REFERENCES public.repair_guides(id) ON DELETE CASCADE,
    part_id UUID REFERENCES public.repair_parts(id) ON DELETE CASCADE,
    PRIMARY KEY (guide_id, part_id)
);

-- 9. Enhance repair_requests to link to guides
ALTER TABLE public.repair_requests 
ADD COLUMN IF NOT EXISTS guide_id UUID REFERENCES public.repair_guides(id),
ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES public.repair_devices(id),
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'smartphone',
ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'emergency')),
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS assigned_store_id UUID REFERENCES public.stores(id),
ADD COLUMN IF NOT EXISTS tracking_id TEXT UNIQUE;

-- Enable RLS on all new tables
ALTER TABLE public.repair_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_guide_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_guide_parts ENABLE ROW LEVEL SECURITY;

-- Policies for Public Access (Read)
CREATE POLICY "Anyone can view repair categories" ON public.repair_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view repair devices" ON public.repair_devices FOR SELECT USING (true);
CREATE POLICY "Anyone can view repair guides" ON public.repair_guides FOR SELECT USING (published = true);
CREATE POLICY "Anyone can view repair steps" ON public.repair_steps FOR SELECT USING (true);
CREATE POLICY "Anyone can view repair tools" ON public.repair_tools FOR SELECT USING (true);
CREATE POLICY "Anyone can view repair parts" ON public.repair_parts FOR SELECT USING (true);
CREATE POLICY "Anyone can view guide tools" ON public.repair_guide_tools FOR SELECT USING (true);
CREATE POLICY "Anyone can view guide parts" ON public.repair_guide_parts FOR SELECT USING (true);

-- Policies for Admins (Manage)
CREATE POLICY "Admins can manage repair categories" ON public.repair_categories FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage repair devices" ON public.repair_devices FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage repair guides" ON public.repair_guides FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage repair steps" ON public.repair_steps FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage repair tools" ON public.repair_tools FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage repair parts" ON public.repair_parts FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage guide tools" ON public.repair_guide_tools FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage guide parts" ON public.repair_guide_parts FOR ALL USING (public.is_admin());

-- Update repair_requests policies for Store Owners
-- Store owners should be able to see repair requests assigned to their store
DROP POLICY IF EXISTS "Admins can manage all repair requests." ON public.repair_requests;
CREATE POLICY "Admins and Store Owners manage repair requests"
ON public.repair_requests
FOR ALL
TO authenticated
USING (
    public.is_super_admin() OR public.is_staff_admin() OR
    (public.is_store_owner() AND assigned_store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
);

-- Add triggers for updated_at
CREATE TRIGGER update_repair_categories_updated_at BEFORE UPDATE ON public.repair_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_repair_devices_updated_at BEFORE UPDATE ON public.repair_devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_repair_guides_updated_at BEFORE UPDATE ON public.repair_guides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
