-- Populate slug from name for all stores missing slug
UPDATE public.stores
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Also populate seo_slug if missing
UPDATE public.stores
SET seo_slug = slug
WHERE (seo_slug IS NULL OR seo_slug = '') AND slug IS NOT NULL;

-- Verify R.K. Mobile Repairing
-- Should get slug: 'rk-mobile-repairing' (dots removed)
-- But URL uses 'r-k-mobile-repairing' — fix it specifically
UPDATE public.stores
SET slug = 'r-k-mobile-repairing', seo_slug = 'r-k-mobile-repairing'
WHERE id = '93a5bea6-bcdf-4d26-bbf8-2bd1d1869881';
