-- Add marketplace fields to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_marketplace_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS marketplace_commission NUMERIC(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'maintenance')),
ADD COLUMN IF NOT EXISTS theme_slug TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS payout_settings JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.stores.is_featured IS 'Whether the store is featured on the homepage/directory';
COMMENT ON COLUMN public.stores.is_marketplace_enabled IS 'Whether the store can list products in the marketplace';
COMMENT ON COLUMN public.stores.marketplace_commission IS 'Percentage commission taken by the marketplace (e.g. 10.00 for 10%)';
COMMENT ON COLUMN public.stores.status IS 'Current status of the store (active, suspended, maintenance)';
COMMENT ON COLUMN public.stores.theme_slug IS 'The visual theme applied to the store page';
COMMENT ON COLUMN public.stores.payout_settings IS 'Settings for payouts (e.g. bank details, schedule)';
