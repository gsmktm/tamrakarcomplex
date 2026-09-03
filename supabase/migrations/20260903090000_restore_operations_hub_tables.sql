-- Hotfix: restore operations-hub tables lost to drift / never created.
--
-- 1. marketing_banners: defined in 20260506050000 (recorded as applied; DDL
--    never landed via manual application). CampaignManager's entire data
--    layer queries this table — every load 404s without it.
-- 2. emi_model_links: used by EmiPlanManager's model-linking feature but was
--    never created by any migration. Join column expectations from the UI:
--    id, model_id -> phone_models(id), emi_plan_id -> emi_plans(id), created_at.
-- 3. stores.theme columns from 20260430010000 (drifted): custom_design_json and
--    featured_product_ids are referenced by 20260903100000's trigger and by
--    StoreThemeBuilder, but never landed on this database.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS theme_color text,
  ADD COLUMN IF NOT EXISTS banner_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_design_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS featured_product_ids jsonb DEFAULT '[]'::jsonb;

-- Store-directory columns from 20260425120600 (drifted) plus complex_zone
-- expected by the directory filters.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS payout_settings jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS services_json jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS complex_zone text DEFAULT 'outside',
  ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_complex_zone ON public.stores(complex_zone);
CREATE INDEX IF NOT EXISTS idx_stores_package_slug ON public.stores(package_slug);
CREATE INDEX IF NOT EXISTS idx_stores_is_verified ON public.stores(is_verified);
CREATE INDEX IF NOT EXISTS idx_stores_is_featured ON public.stores(is_featured);
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);

CREATE UNIQUE INDEX IF NOT EXISTS stores_slug_unique
  ON public.stores (slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.marketing_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  link_url text,
  button_text text DEFAULT 'Shop Now',
  placement text DEFAULT 'home_hero' CHECK (placement IN ('home_hero', 'marketplace_top', 'sidebar_ad', 'category_top')),
  is_active boolean DEFAULT true,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  sort_order integer DEFAULT 0,
  background_color text,
  text_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.marketing_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active banners" ON public.marketing_banners;
CREATE POLICY "Public read active banners" ON public.marketing_banners
  FOR SELECT USING (is_active = true AND (ends_at IS NULL OR ends_at > now()));
DROP POLICY IF EXISTS "Admins manage all banners" ON public.marketing_banners;
CREATE POLICY "Admins manage all banners" ON public.marketing_banners
  FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.emi_model_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.phone_models(id) ON DELETE CASCADE,
  emi_plan_id uuid NOT NULL REFERENCES public.emi_plans(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, emi_plan_id)
);

ALTER TABLE public.emi_model_links ENABLE ROW LEVEL SECURITY;

-- EMI plan visibility is public (marketing content); writes are admin-only.
DROP POLICY IF EXISTS "Anyone can read EMI model links" ON public.emi_model_links;
CREATE POLICY "Anyone can read EMI model links" ON public.emi_model_links
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage EMI model links" ON public.emi_model_links;
CREATE POLICY "Admins manage EMI model links" ON public.emi_model_links
  FOR ALL USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_emi_model_links_plan ON public.emi_model_links (emi_plan_id);
CREATE INDEX IF NOT EXISTS idx_emi_model_links_model ON public.emi_model_links (model_id);

-- 4. device_verifications: from 20260501000000 (drifted) — CatalogOverview
--    counts pending verifications and the Verification tab lists them.
CREATE TABLE IF NOT EXISTS public.device_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imei text,
  brand text,
  model text,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  result jsonb,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.device_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own verifications" ON public.device_verifications;
CREATE POLICY "Users can read their own verifications" ON public.device_verifications
  FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage verifications" ON public.device_verifications;
CREATE POLICY "Admins manage verifications" ON public.device_verifications
  FOR ALL TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_device_verifications_status ON public.device_verifications (status);
