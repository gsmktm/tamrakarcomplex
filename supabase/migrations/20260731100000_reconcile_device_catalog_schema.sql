-- Reconcile production drift: the migration ledger contains device_catalog,
-- but the hosted table was removed while valuation UI/RPC code still uses it.
CREATE TABLE IF NOT EXISTS public.device_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  variant text,
  storage text,
  ram text,
  color text,
  canonical_slug text UNIQUE,
  release_year integer,
  base_price_npr numeric,
  image_url text,
  spec_keys jsonb DEFAULT '{}'::jsonb,
  specifications jsonb DEFAULT '{}'::jsonb,
  storage_options jsonb DEFAULT '[]'::jsonb,
  verified boolean NOT NULL DEFAULT false,
  source_url text,
  source_site text,
  last_verified_at timestamptz,
  model_year integer,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_catalog_brand_model
  ON public.device_catalog (lower(brand), lower(model));
CREATE INDEX IF NOT EXISTS idx_device_catalog_verified
  ON public.device_catalog (verified, updated_at DESC);

ALTER TABLE public.device_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Device Catalog: Viewable by everyone" ON public.device_catalog;
CREATE POLICY "Device Catalog: Viewable by everyone"
  ON public.device_catalog FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Device Catalog: Admins manage all" ON public.device_catalog;
CREATE POLICY "Device Catalog: Admins manage all"
  ON public.device_catalog FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.is_staff_admin())
  WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

GRANT SELECT ON public.device_catalog TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.device_catalog TO authenticated;

-- Preserve the current public catalog as the initial model source. Product
-- names remain intact in model; brand is inferred only when no normalized
-- brand relation is available in this legacy hosted schema.
INSERT INTO public.device_catalog (
  brand,
  model,
  canonical_slug,
  release_year,
  model_year,
  base_price_npr,
  image_url,
  specifications,
  verified,
  source_url,
  source_site,
  last_verified_at,
  created_at,
  updated_at
)
SELECT
  initcap(split_part(trim(cp.name), ' ', 1)),
  trim(cp.name),
  cp.slug,
  cp.release_year,
  cp.release_year,
  cp.price_npr,
  cp.image_url,
  COALESCE(cp.specs_json, '{}'::jsonb),
  COALESCE(cp.verified, false),
  cp.source_url,
  cp.source_site,
  CASE WHEN COALESCE(cp.verified, false) THEN COALESCE(cp.updated_at, now()) ELSE NULL END,
  COALESCE(cp.created_at, now()),
  COALESCE(cp.updated_at, now())
FROM public.catalog_products cp
WHERE NULLIF(trim(cp.name), '') IS NOT NULL
  AND NULLIF(trim(cp.slug), '') IS NOT NULL
ON CONFLICT (canonical_slug) DO UPDATE SET
  model = EXCLUDED.model,
  release_year = EXCLUDED.release_year,
  model_year = EXCLUDED.model_year,
  base_price_npr = EXCLUDED.base_price_npr,
  image_url = EXCLUDED.image_url,
  specifications = EXCLUDED.specifications,
  verified = EXCLUDED.verified,
  source_url = EXCLUDED.source_url,
  source_site = EXCLUDED.source_site,
  last_verified_at = EXCLUDED.last_verified_at,
  updated_at = EXCLUDED.updated_at;

