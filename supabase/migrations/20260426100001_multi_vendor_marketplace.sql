-- Multi-Vendor Marketplace Schema Enhancement
-- Transforms sell_listings into a comprehensive store-based marketplace

-- 1. Update sell_listings table structure
ALTER TABLE public.sell_listings
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS catalog_product_id uuid,
  ADD COLUMN IF NOT EXISTS listing_type text DEFAULT 'sell' CHECK (listing_type IN ('sell', 'buy', 'exchange', 'store_product')),
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejected_reason text;

-- Make user_id nullable since stores also list
ALTER TABLE public.sell_listings
  ALTER COLUMN user_id DROP NOT NULL;

-- Update status constraint to include new states
ALTER TABLE public.sell_listings
  DROP CONSTRAINT IF EXISTS sell_listings_status_check,
  ADD CONSTRAINT sell_listings_status_check CHECK (status IN ('draft', 'pending', 'active', 'sold', 'rejected', 'expired'));

-- Add indexes for marketplace queries
CREATE INDEX IF NOT EXISTS idx_sell_listings_store_id ON public.sell_listings(store_id);
CREATE INDEX IF NOT EXISTS idx_sell_listings_listing_type ON public.sell_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_sell_listings_is_featured ON public.sell_listings(is_featured);
CREATE INDEX IF NOT EXISTS idx_sell_listings_status ON public.sell_listings(status);
CREATE INDEX IF NOT EXISTS idx_sell_listings_created_at ON public.sell_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sell_listings_price ON public.sell_listings(price);

-- Add comments
COMMENT ON COLUMN public.sell_listings.store_id IS 'Store that listed this product (NULL for user listings)';
COMMENT ON COLUMN public.sell_listings.catalog_product_id IS 'Link to store catalog product if applicable';
COMMENT ON COLUMN public.sell_listings.listing_type IS 'Type of listing: sell, buy, exchange, or store_product';
COMMENT ON COLUMN public.sell_listings.is_featured IS 'Whether this listing is featured (requires Gold+ package)';
COMMENT ON COLUMN public.sell_listings.rejected_reason IS 'Reason if listing was rejected by admin';

-- 2. Create listing_inquiries table
CREATE TABLE IF NOT EXISTS public.listing_inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.sell_listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  message text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'contacted', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT listing_inquiries_pkey PRIMARY KEY (id)
);

-- Enable RLS on listing_inquiries
ALTER TABLE public.listing_inquiries ENABLE ROW LEVEL SECURITY;

-- Create indexes for listing_inquiries
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_listing_id ON public.listing_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_user_id ON public.listing_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_status ON public.listing_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_created_at ON public.listing_inquiries(created_at DESC);

-- Add comments
COMMENT ON TABLE public.listing_inquiries IS 'Inquiries and messages from interested buyers about listings';
COMMENT ON COLUMN public.listing_inquiries.listing_id IS 'Reference to the listing being inquired about';
COMMENT ON COLUMN public.listing_inquiries.user_id IS 'User making the inquiry (NULL if anonymous)';
COMMENT ON COLUMN public.listing_inquiries.status IS 'Status of the inquiry: new, viewed, contacted, closed';

-- 3. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sell_listings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_inquiries TO authenticated;
