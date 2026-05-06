-- ============================================================
-- MARKETING & CAMPAIGN MANAGER
-- Allows admins to manage platform-wide banners and promos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.marketing_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  link_url text,
  button_text text DEFAULT 'Shop Now',
  placement text DEFAULT 'home_hero' CHECK (placement IN ('home_hero', 'marketplace_top', 'sidebar_ad', 'category_top')),
  is_active boolean DEFAULT true,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  sort_order integer DEFAULT 0,
  background_color text,
  text_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_banners ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read active banners" ON public.marketing_banners FOR SELECT USING (is_active = true AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "Admins manage all banners" ON public.marketing_banners FOR ALL USING (public.is_admin());

-- Seed Banners
INSERT INTO public.marketing_banners (title, subtitle, image_url, link_url, button_text, background_color) VALUES 
('Upgrade to iPhone 15 Pro', 'Experience the titanium design and A17 Pro chip.', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=2070&auto=format&fit=crop', '/product/iphone-15-pro', 'View Deals', '#000000'),
('New Samsung S24 Series', 'Galaxy AI is here. Unleash your creativity.', 'https://images.unsplash.com/photo-1706316715694-8716886e33a4?q=80&w=2070&auto=format&fit=crop', '/search/samsung-s24', 'Pre-order Now', '#f0f0f0'),
('Repair Specialists', 'Quick screen replacement and battery service at Tamrakar.', 'https://images.unsplash.com/photo-1591405351990-4726e331f141?q=80&w=2070&auto=format&fit=crop', '/repair', 'Book Repair', '#1e40af');

NOTIFY pgrst, 'reload schema';
