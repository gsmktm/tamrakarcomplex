-- Migration: Create multi-vendor marketplace structure
-- Updates sell_listings and creates listing_inquiries table

-- 1. Update sell_listings table for marketplace
ALTER TABLE public.sell_listings
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id),
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS model text,
ADD COLUMN IF NOT EXISTS condition text CHECK (condition IN ('new', 'used', 'refurbished', 'open_box')),
ADD COLUMN IF NOT EXISTS price decimal(10,2),
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS listing_type text CHECK (listing_type IN ('sell', 'buy', 'exchange', 'store_product')) DEFAULT 'sell',
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('draft', 'pending', 'active', 'sold', 'rejected', 'expired')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS catalog_product_id uuid REFERENCES public.catalog_products(id);

-- 2. Create listing_inquiries table
CREATE TABLE IF NOT EXISTS public.listing_inquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid REFERENCES public.sell_listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text,
  phone text,
  email text,
  message text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for sell_listings
CREATE INDEX IF NOT EXISTS idx_sell_listings_store_id ON public.sell_listings(store_id);
CREATE INDEX IF NOT EXISTS idx_sell_listings_user_id ON public.sell_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_sell_listings_status ON public.sell_listings(status);
CREATE INDEX IF NOT EXISTS idx_sell_listings_listing_type ON public.sell_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_sell_listings_is_featured ON public.sell_listings(is_featured);
CREATE INDEX IF NOT EXISTS idx_sell_listings_catalog_product_id ON public.sell_listings(catalog_product_id);
CREATE INDEX IF NOT EXISTS idx_sell_listings_price ON public.sell_listings(price);

-- Indexes for listing_inquiries
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_listing_id ON public.listing_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_user_id ON public.listing_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_status ON public.listing_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_created_at ON public.listing_inquiries(created_at);

-- Row Level Security (RLS) Policies

-- sell_listings: Public can read active listings
ALTER TABLE public.sell_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active listings" ON public.sell_listings;
CREATE POLICY "Public read active listings" ON public.sell_listings
  FOR SELECT USING (status = 'active');

-- Store admin can manage own store listings
DROP POLICY IF EXISTS "Store admin manage own store listings" ON public.sell_listings;
CREATE POLICY "Store admin manage own store listings" ON public.sell_listings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.store_admins sa ON sa.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND sa.store_id = sell_listings.store_id
      AND ur.role = 'storeadmin'
    )
  );

-- Public user can manage own listings
DROP POLICY IF EXISTS "User manage own listings" ON public.sell_listings;
CREATE POLICY "User manage own listings" ON public.sell_listings
  FOR ALL USING (
    user_id = auth.uid()
  );

-- Staff/super admin can manage all listings
DROP POLICY IF EXISTS "Staff admin manage all listings" ON public.sell_listings;
CREATE POLICY "Staff admin manage all listings" ON public.sell_listings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- listing_inquiries: Public can insert, admins can read
ALTER TABLE public.listing_inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert inquiry" ON public.listing_inquiries;
CREATE POLICY "Anyone can insert inquiry" ON public.listing_inquiries
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read inquiries" ON public.listing_inquiries;
CREATE POLICY "Admins read inquiries" ON public.listing_inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- Store admin can read inquiries for own store listings
DROP POLICY IF EXISTS "Store admin read own store inquiries" ON public.listing_inquiries;
CREATE POLICY "Store admin read own store inquiries" ON public.listing_inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.store_admins sa ON sa.user_id = ur.user_id
      JOIN public.sell_listings sl ON sl.id = listing_inquiries.listing_id
      WHERE ur.user_id = auth.uid()
      AND sa.store_id = sl.store_id
      AND ur.role = 'storeadmin'
    )
  );