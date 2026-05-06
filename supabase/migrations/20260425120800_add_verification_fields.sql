-- Add verification fields to device_catalog
ALTER TABLE device_catalog ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE device_catalog ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE device_catalog ADD COLUMN IF NOT EXISTS source_site text;
ALTER TABLE device_catalog ADD COLUMN IF NOT EXISTS last_verified_at timestamp with time zone;
ALTER TABLE device_catalog ADD COLUMN IF NOT EXISTS model_year integer;
ALTER TABLE device_catalog ADD COLUMN IF NOT EXISTS storage_options jsonb DEFAULT '[]'::jsonb;