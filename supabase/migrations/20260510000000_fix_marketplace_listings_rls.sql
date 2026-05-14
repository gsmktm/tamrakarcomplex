-- Fix: Enable RLS and create policies for marketplace_listings table

-- Enable RLS
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public read active marketplace listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Store admin manage listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "User manage own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Staff manage all listings" ON public.marketplace_listings;

-- Policy 1: Public can read active listings
CREATE POLICY "Public read active marketplace listings" ON public.marketplace_listings
  FOR SELECT
  USING (status = 'active');

-- Policy 2: Store admins can manage their store's listings
CREATE POLICY "Store admin manage listings" ON public.marketplace_listings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.store_admins sa
      WHERE sa.store_id = marketplace_listings.store_id
      AND sa.user_id = auth.uid()
    )
  );

-- Policy 3: Users can manage their own listings
CREATE POLICY "User manage own listings" ON public.marketplace_listings
  FOR ALL
  USING (
    owner_user_id = auth.uid()
  );

-- Policy 4: Staff/super admin can manage all listings
CREATE POLICY "Staff manage all listings" ON public.marketplace_listings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_store_id ON public.marketplace_listings(store_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_owner_user_id ON public.marketplace_listings(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON public.marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_price ON public.marketplace_listings(price);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created_at ON public.marketplace_listings(created_at);
