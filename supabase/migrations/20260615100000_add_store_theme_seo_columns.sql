-- Add missing store columns for theme, SEO, and display
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS theme_slug text DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS meta_keywords text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS opening_hours jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS banner_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS floor text,
  ADD COLUMN IF NOT EXISTS block text,
  ADD COLUMN IF NOT EXISTS opening_hours_text text DEFAULT '10:00 AM – 8:00 PM (Sun–Fri)',
  ADD COLUMN IF NOT EXISTS theme_color text DEFAULT '#2563eb';
