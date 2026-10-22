-- Tamrakar Complex: campaign placement expansion + scheduled promotion safety.
-- This migration is staged in Git. Do not run against production until reviewed.
-- No offers or discounts are seeded: publication remains a human admin decision.

ALTER TABLE public.marketing_banners
  ADD COLUMN IF NOT EXISTS festival_key text,
  ADD COLUMN IF NOT EXISTS disclosure text NOT NULL DEFAULT 'Promotion',
  ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false;

-- Legacy campaigns remain stored, but new campaign placements are specific
-- to the section the user is browsing. DROP check only by its default name.
ALTER TABLE public.marketing_banners
  DROP CONSTRAINT IF EXISTS marketing_banners_placement_check;

ALTER TABLE public.marketing_banners
  ADD CONSTRAINT marketing_banners_placement_check
  CHECK (placement IN (
    'home_hero', 'home_mid', 'home_footer', 'marketplace_top',
    'category_top', 'store_directory', 'repair_top', 'product_inline',
    'sidebar_ad'
  ));

-- New/edited campaigns must have a positive window. NOT VALID preserves
-- legacy rows that may have inconsistent dates until they are audited.
ALTER TABLE public.marketing_banners
  ADD CONSTRAINT marketing_banners_valid_window
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
  NOT VALID;

-- Audience must not receive unreleased ads before the scheduled start.
ALTER TABLE public.marketing_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active banners" ON public.marketing_banners;
CREATE POLICY "Public read active banners"
  ON public.marketing_banners FOR SELECT TO anon, authenticated
  USING (
    is_active IS TRUE
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
  );

-- Existing "Admins manage all banners" policy remains unchanged.
-- Additional access depends on public.is_admin(), already used by admin UI.
CREATE INDEX IF NOT EXISTS marketing_banners_public_placement_idx
  ON public.marketing_banners (placement, sort_order, starts_at, ends_at)
  WHERE is_active IS TRUE;

GRANT SELECT ON public.marketing_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.marketing_banners TO authenticated;

COMMENT ON COLUMN public.marketing_banners.festival_key
  IS 'Marketing label: e.g. dashain, tihar, chhath, new_year, or general; no automatic discount applied.';
COMMENT ON COLUMN public.marketing_banners.is_sponsored
  IS 'True only for separately sponsored paid advertising placements.';
COMMENT ON COLUMN public.marketing_banners.disclosure
  IS 'Visible UI label explaining the nature of the campaign.';

NOTIFY pgrst, 'reload schema';
