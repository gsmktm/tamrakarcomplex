-- Keep the sell/valuation catalog connected to the canonical mobile price list.
-- Catalog imports intentionally focus on device metadata and may not carry a
-- Nepal price. Without this bridge calculate_device_valuation returns 0 and
-- the client has to fall back to an offline estimate.

WITH matched_prices AS (
  SELECT
    catalog.id AS catalog_product_id,
    COALESCE(
      MIN(COALESCE(prices.sale_price, prices.regular_price))
        FILTER (WHERE phone_variant.storage = device_variant.storage),
      MIN(COALESCE(prices.sale_price, prices.regular_price))
    ) AS price_npr
  FROM public.catalog_products catalog
  JOIN public.device_models device_model
    ON device_model.id = catalog.model_id
  LEFT JOIN public.device_variants device_variant
    ON device_variant.id = catalog.variant_id
  JOIN public.phone_models phone_model
    ON phone_model.slug = device_model.slug
  JOIN public.phone_variants phone_variant
    ON phone_variant.model_id = phone_model.id
   AND phone_variant.status = 'active'
  JOIN public.phone_variant_prices prices
    ON prices.variant_id = phone_variant.id
   AND prices.is_default = true
  WHERE catalog.is_active = true
  GROUP BY catalog.id
)
UPDATE public.catalog_products catalog
SET
  price_npr = matched_prices.price_npr,
  price_text = concat('Rs. ', trim(to_char(matched_prices.price_npr, 'FM999,999,999'))),
  is_price_list_item = true,
  updated_at = now()
FROM matched_prices
WHERE catalog.id = matched_prices.catalog_product_id
  AND matched_prices.price_npr > 0;

