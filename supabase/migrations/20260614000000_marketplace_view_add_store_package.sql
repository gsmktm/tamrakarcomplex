-- Rebuild public_marketplace_items to expose store package_slug, is_featured,
-- is_verified, logo_url, slug, seo_slug so the frontend can enforce contact
-- visibility and tier-based sort without extra round-trips.

DROP VIEW IF EXISTS public.public_marketplace_items;

CREATE VIEW public.public_marketplace_items AS
SELECT
  'store_product'::text                             AS source_type,
  sp.id,
  sp.store_id,
  s.name                                            AS store_name,
  s.slug                                            AS store_slug,
  s.seo_slug                                        AS store_seo_slug,
  s.logo_url                                        AS store_logo_url,
  s.is_verified                                     AS store_is_verified,
  s.is_featured                                     AS store_is_featured,
  COALESCE(s.package_slug, 'free')                  AS store_package_slug,
  sp.catalog_product_id,
  COALESCE(sp.discount_price, sp.price_sale, sp.price)::numeric AS price,
  COALESCE(sp.stock_quantity, sp.stock, 0)::integer AS stock,
  sp.status,
  sp.created_by,
  sp.created_at,
  sp.updated_at,
  sp.title,
  sp.brand,
  sp.model,
  NULL::text                                        AS description,
  s.location,
  CASE
    WHEN sp.product_type IN ('new_phone', 'used_phone', 'phone') THEN 'mobile'
    ELSE sp.product_type
  END                                               AS category,
  sp.condition,
  sp.images,
  -- Tier sort weight: diamond=4 gold=3 silver=2 free=1
  CASE COALESCE(s.package_slug, 'free')
    WHEN 'diamond' THEN 4
    WHEN 'gold'    THEN 3
    WHEN 'silver'  THEN 2
    ELSE 1
  END +
  CASE WHEN s.is_featured THEN 1 ELSE 0 END         AS tier_weight
FROM public.store_products sp
LEFT JOIN public.stores s ON s.id = sp.store_id
WHERE sp.status = 'active'
  AND COALESCE(sp.stock_quantity, sp.stock, 0) > 0

UNION ALL

SELECT
  'user_listing'::text                              AS source_type,
  sl.id,
  sl.store_id,
  s.name                                            AS store_name,
  s.slug                                            AS store_slug,
  s.seo_slug                                        AS store_seo_slug,
  s.logo_url                                        AS store_logo_url,
  s.is_verified                                     AS store_is_verified,
  s.is_featured                                     AS store_is_featured,
  COALESCE(s.package_slug, 'free')                  AS store_package_slug,
  sl.catalog_product_id,
  sl.price::numeric                                 AS price,
  1::integer                                        AS stock,
  sl.status,
  sl.user_id                                        AS created_by,
  sl.created_at,
  sl.updated_at,
  sl.title,
  sl.brand,
  sl.model,
  sl.description,
  sl.location,
  sl.listing_type                                   AS category,
  sl.condition,
  to_jsonb(sl.images)                               AS images,
  CASE COALESCE(s.package_slug, 'free')
    WHEN 'diamond' THEN 4
    WHEN 'gold'    THEN 3
    WHEN 'silver'  THEN 2
    ELSE 1
  END +
  CASE WHEN s.is_featured THEN 1 ELSE 0 END         AS tier_weight
FROM public.sell_listings sl
LEFT JOIN public.stores s ON s.id = sl.store_id
WHERE sl.status = 'active';

GRANT SELECT ON public.public_marketplace_items TO anon, authenticated;
