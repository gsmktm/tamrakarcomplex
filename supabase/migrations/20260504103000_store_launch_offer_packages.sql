-- 90-day launch offer package assignment for existing stores.
-- Real paid renewals continue by extending subscription_end_date.
-- Once subscription_end_date passes, app entitlement logic treats the store as Basic.

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS package_slug text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

UPDATE public.stores
SET
  package_slug = CASE
    WHEN abs(hashtext(coalesce(slug, id::text, name))) % 100 < 8 THEN 'diamond'
    WHEN abs(hashtext(coalesce(slug, id::text, name))) % 100 < 33 THEN 'gold'
    WHEN abs(hashtext(coalesce(slug, id::text, name))) % 100 < 78 THEN 'silver'
    ELSE 'free'
  END,
  subscription_status = CASE
    WHEN abs(hashtext(coalesce(slug, id::text, name))) % 100 < 78 THEN 'active'
    ELSE 'inactive'
  END,
  subscription_end_date = CASE
    WHEN abs(hashtext(coalesce(slug, id::text, name))) % 100 < 78
      THEN '2026-08-02T00:00:00+05:45'::timestamptz
    ELSE subscription_end_date
  END,
  is_featured = CASE
    WHEN abs(hashtext(coalesce(slug, id::text, name))) % 100 < 33 THEN true
    ELSE coalesce(is_featured, false)
  END,
  updated_at = now()
WHERE
  coalesce(package_slug, 'free') = 'free'
  AND coalesce(subscription_status, 'inactive') IN ('inactive', 'expired', 'cancelled')
  AND coalesce(status, 'active') = 'active';
