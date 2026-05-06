-- Store Directory + Package Control Enhancement
-- Add missing fields to stores table for complete store management

-- First, add package_slug if it doesn't exist
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS package_slug text DEFAULT 'free'
  CHECK (package_slug IN ('free', 'silver', 'gold', 'diamond'));

-- Add slug field (URL-friendly identifier)
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS slug text;

-- Create unique index on slug (allowing NULL)
CREATE UNIQUE INDEX IF NOT EXISTS stores_slug_unique 
  ON public.stores(slug) 
  WHERE slug IS NOT NULL;

-- Add complex_zone field
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS complex_zone text DEFAULT 'inside'
  CHECK (complex_zone IN ('inside', 'outside'));

-- Add floor field
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS floor text;

-- Add address field (more detailed than location)
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS address text;

-- Add whatsapp field
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS whatsapp text;

-- Add cover_image_url field
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Add services_json field (JSON array of services)
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS services_json jsonb DEFAULT '[]'::jsonb;

-- Add social_links_json field
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS social_links_json jsonb DEFAULT '{}'::jsonb;

-- Ensure subscription_status has proper defaults
ALTER TABLE public.stores
  ALTER COLUMN subscription_status SET DEFAULT 'inactive';

-- Add column comments for documentation
COMMENT ON COLUMN public.stores.package_slug IS 'Store subscription package: free, silver, gold, or diamond';
COMMENT ON COLUMN public.stores.slug IS 'URL-friendly identifier for the store';
COMMENT ON COLUMN public.stores.complex_zone IS 'Store location within complex: inside or outside';
COMMENT ON COLUMN public.stores.floor IS 'Floor or location within the complex';
COMMENT ON COLUMN public.stores.address IS 'Detailed address of the store';
COMMENT ON COLUMN public.stores.whatsapp IS 'WhatsApp contact number';
COMMENT ON COLUMN public.stores.cover_image_url IS 'Cover image URL for store profile';
COMMENT ON COLUMN public.stores.services_json IS 'JSON array of services offered';
COMMENT ON COLUMN public.stores.social_links_json IS 'JSON object of social media links';
COMMENT ON COLUMN public.stores.is_featured IS 'Whether the store is featured on homepage/directory';
COMMENT ON COLUMN public.stores.is_marketplace_enabled IS 'Whether store can list products in marketplace';
COMMENT ON COLUMN public.stores.marketplace_commission IS 'Commission percentage taken by marketplace';
COMMENT ON COLUMN public.stores.status IS 'Store status: active, suspended, or maintenance';
COMMENT ON COLUMN public.stores.theme_slug IS 'Visual theme applied to store page';
COMMENT ON COLUMN public.stores.payout_settings IS 'Payout configuration as JSON';
COMMENT ON COLUMN public.stores.subscription_status IS 'Subscription status: active, inactive, pending, or expired';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_package_slug ON public.stores(package_slug);
CREATE INDEX IF NOT EXISTS idx_stores_subscription_status ON public.stores(subscription_status);
CREATE INDEX IF NOT EXISTS idx_stores_is_featured ON public.stores(is_featured);
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores(owner_id);
