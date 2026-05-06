-- Migration: Add new fields to stores table for enhanced directory

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS complex_zone text CHECK (complex_zone IN ('inside', 'outside')) DEFAULT 'inside',
ADD COLUMN IF NOT EXISTS floor text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS package_slug text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_marketplace_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS marketplace_commission decimal(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS theme_slug text DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
ADD COLUMN IF NOT EXISTS payout_settings jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS opening_hours jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS services_json jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS social_links_json jsonb DEFAULT '{}';

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_complex_zone ON public.stores(complex_zone);
CREATE INDEX IF NOT EXISTS idx_stores_package_slug ON public.stores(package_slug);
CREATE INDEX IF NOT EXISTS idx_stores_is_verified ON public.stores(is_verified);
CREATE INDEX IF NOT EXISTS idx_stores_is_featured ON public.stores(is_featured);
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);

-- Update existing stores to have slugs if missing
UPDATE public.stores SET slug = id WHERE slug IS NULL;

-- Ensure all stores have a package_slug
UPDATE public.stores SET package_slug = 'free' WHERE package_slug IS NULL;