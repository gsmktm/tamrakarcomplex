-- Migration: Schema Normalization Updates
-- Adds aliases to brands and typical_price_range to device_models

ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS canonical_name text;

-- Update device_models
ALTER TABLE public.device_models
ADD COLUMN IF NOT EXISTS typical_price_range jsonb DEFAULT '{"min": 0, "max": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS launch_year integer,
ADD COLUMN IF NOT EXISTS popular boolean DEFAULT false;

-- Create an index for popular models
CREATE INDEX IF NOT EXISTS idx_device_models_popular ON public.device_models(popular) WHERE popular = true;

-- Update device_variants
ALTER TABLE public.device_variants
ADD COLUMN IF NOT EXISTS typical_price numeric;

-- Ensure brands active column exists
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
