-- Migration: Update sell_listings for multi-vendor marketplace
-- Adds necessary columns for store-based marketplace listings

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sell_listings_store_id ON public.sell_listings(store_id);
CREATE INDEX IF NOT EXISTS idx_sell_listings_user_id ON public.sell_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_sell_listings_status ON public.sell_listings(status);
CREATE INDEX IF NOT EXISTS idx_sell_listings_listing_type ON public.sell_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_sell_listings_is_featured ON public.sell_listings(is_featured);
CREATE INDEX IF NOT EXISTS idx_sell_listings_catalog_product_id ON public.sell_listings(catalog_product_id);