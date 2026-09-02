-- One Master ID: phone_models.id is canonical for all mobile modules
-- Additive only — no drops, no data loss

-- 1. sell_listings: add model_id → phone_models
ALTER TABLE public.sell_listings
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.phone_models(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sell_listings_model_id ON public.sell_listings(model_id);

-- 2. products: add model_id + brand_id FKs
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.phone_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_model_id ON public.products(model_id);

-- 3. store_products: ensure brand_id FK properly set (column exists, just add index)
CREATE INDEX IF NOT EXISTS idx_store_products_model_id ON public.store_products(model_id);
CREATE INDEX IF NOT EXISTS idx_store_products_brand_id ON public.store_products(brand_id);

-- 4. Unified mobile catalog view — single source of truth for browse/search/compare
DROP VIEW IF EXISTS public.mobile_catalog_view;
CREATE VIEW public.mobile_catalog_view AS
SELECT
  pm.id                         AS model_id,
  pm.name                       AS model_name,
  pm.slug                       AS model_slug,
  pm.model_number,
  pm.image                      AS model_image,
  pm.status,
  pm.market_status,
  pm.is_featured,
  pm.is_upcoming,
  pm.is_top_rated,
  pm.release_year,
  pm.launch_date_nepal,
  pm.seo_title,
  pm.seo_description,
  pm.user_rating_avg,
  pm.user_rating_count,
  b.id                          AS brand_id,
  b.name                        AS brand_name,
  b.slug                        AS brand_slug,
  b.logo                        AS brand_logo,
  ps.id                         AS series_id,
  ps.name                       AS series_name,
  ps.slug                       AS series_slug,
  -- lowest in-stock price from store_products
  (
    SELECT MIN(COALESCE(sp.discount_price, sp.price_sale, sp.price))
    FROM public.store_products sp
    WHERE sp.model_id = pm.id
      AND sp.status = 'active'
      AND COALESCE(sp.stock_quantity, sp.stock, 0) > 0
  )                             AS store_min_price,
  -- exchange value (best offer)
  (
    SELECT MAX(ev.max_value)
    FROM public.exchange_values ev
    WHERE ev.model_id = pm.id
  )                             AS exchange_max_value,
  -- repair available?
  (
    SELECT COUNT(*) > 0
    FROM public.repair_services rs
    WHERE rs.model_id = pm.id
  )                             AS repair_available,
  -- unlocking available?
  (
    SELECT COUNT(*) > 0
    FROM public.unlocking_services us
    WHERE us.model_id = pm.id
  )                             AS unlocking_available,
  -- specs summary
  (
    SELECT jsonb_build_object(
      'battery', psp.battery,
      'display', psp.display,
      'camera', psp.camera,
      'os', psp.os,
      'processor', psp.processor,
      'key_specs', psp.key_specs
    )
    FROM public.phone_specs psp
    WHERE psp.model_id = pm.id
    LIMIT 1
  )                             AS specs_summary
FROM public.phone_models pm
LEFT JOIN public.brands b ON b.id = pm.brand_id
LEFT JOIN public.phone_series ps ON ps.id = pm.series_id;

GRANT SELECT ON public.mobile_catalog_view TO anon, authenticated;

-- 5. Backfill sell_listings.model_id from catalog_product_id where possible
-- catalog_product_id in sell_listings was used as phone_models.id historically
-- Safe: only update rows where catalog_product_id is a valid phone_models uuid
UPDATE public.sell_listings sl
SET model_id = sl.catalog_product_id::uuid
WHERE sl.model_id IS NULL
  AND sl.catalog_product_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.phone_models pm
    WHERE pm.id = sl.catalog_product_id::uuid
  );

-- 6. Function: get_model_ecosystem — all module data for one master model
CREATE OR REPLACE FUNCTION public.get_model_ecosystem(p_model_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'model',       (SELECT row_to_json(mcv.*) FROM public.mobile_catalog_view mcv WHERE mcv.model_id = p_model_id),
    'variants',    COALESCE((SELECT jsonb_agg(row_to_json(v.*)) FROM public.phone_variants v WHERE v.model_id = p_model_id), '[]'),
    'store_count', (SELECT COUNT(*) FROM public.store_products WHERE model_id = p_model_id AND status = 'active'),
    'used_count',  (SELECT COUNT(*) FROM public.used_phone_listings WHERE model_id = p_model_id AND status = 'approved'),
    'sell_count',  (SELECT COUNT(*) FROM public.sell_listings WHERE model_id = p_model_id AND status = 'active')
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_model_ecosystem(uuid) TO anon, authenticated;
