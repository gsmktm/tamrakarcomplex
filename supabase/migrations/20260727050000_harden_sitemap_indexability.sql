-- Keep the public sitemap aligned with the same eligibility rules used by
-- product publishing and exact-path SEO records.
CREATE OR REPLACE FUNCTION public.generate_seo_sitemap()
RETURNS TABLE (
  loc text,
  lastmod timestamptz,
  changefreq text,
  priority numeric,
  source_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT 'https://tamrakarcomplex.com/'::text, now(), 'daily'::text, 1.0::numeric, 'static'::text
    UNION ALL SELECT 'https://tamrakarcomplex.com/cat/mobiles', now(), 'daily', 0.9, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/stores', now(), 'daily', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/marketplace', now(), 'hourly', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/sell-your-phone', now(), 'weekly', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/repair', now(), 'weekly', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/stores/article', now(), 'daily', 0.7, 'static'
  ),
  product_urls AS (
    SELECT 'https://tamrakarcomplex.com/product/' || p.slug,
      COALESCE(p.updated_at, p.created_at, now()), 'weekly'::text,
      0.8::numeric, 'product'::text
    FROM public.products p
    WHERE public.product_is_seo_eligible(p)
  ),
  brand_urls AS (
    SELECT 'https://tamrakarcomplex.com/cat/mobiles/' ||
        lower(regexp_replace(p.brand, '[^a-zA-Z0-9]+', '-', 'g')),
      max(COALESCE(p.updated_at, p.created_at, now())), 'daily'::text,
      0.8::numeric, 'brand'::text
    FROM public.products p
    WHERE public.product_is_seo_eligible(p)
    GROUP BY lower(regexp_replace(p.brand, '[^a-zA-Z0-9]+', '-', 'g'))
  ),
  device_urls AS (
    SELECT 'https://tamrakarcomplex.com/repair/device/' || d.slug,
      COALESCE(d.created_at, now()), 'monthly'::text, 0.7::numeric, 'repair_device'::text
    FROM public.repair_devices d
    WHERE COALESCE(btrim(d.slug), '') <> ''
  ),
  guide_urls AS (
    SELECT 'https://tamrakarcomplex.com/repair/guide/' || g.slug,
      COALESCE(g.updated_at, g.created_at, now()), 'monthly'::text,
      0.7::numeric, 'repair_guide'::text
    FROM public.repair_guides g
    WHERE COALESCE(btrim(g.slug), '') <> '' AND g.published IS TRUE
  ),
  store_urls AS (
    SELECT 'https://tamrakarcomplex.com/stores/' || COALESCE(NULLIF(s.slug, ''), s.id::text),
      COALESCE(s.updated_at, s.created_at, now()), 'weekly'::text,
      CASE WHEN COALESCE(s.subscription_status, '') = 'active' THEN 0.8 ELSE 0.5 END::numeric,
      'store'::text
    FROM public.stores s
    WHERE s.is_verified IS TRUE OR COALESCE(s.subscription_status, '') = 'active'
  ),
  listing_urls AS (
    SELECT 'https://tamrakarcomplex.com/marketplace/listing/' || l.id::text,
      COALESCE(l.updated_at, l.created_at, now()), 'daily'::text,
      0.6::numeric, 'marketplace_listing'::text
    FROM public.sell_listings l
    WHERE l.status = 'active'
  ),
  article_urls AS (
    SELECT 'https://tamrakarcomplex.com/stores/article/' || a.slug,
      COALESCE(a.updated_at, a.created_at, now()), 'weekly'::text,
      CASE WHEN a.featured IS TRUE THEN 0.8 ELSE 0.6 END::numeric, 'article'::text
    FROM public.articles a
    WHERE COALESCE(btrim(a.slug), '') <> '' AND a.published IS TRUE
  ),
  all_urls(loc, lastmod, changefreq, priority, source_type) AS (
    SELECT * FROM base
    UNION ALL SELECT * FROM product_urls
    UNION ALL SELECT * FROM brand_urls
    UNION ALL SELECT * FROM device_urls
    UNION ALL SELECT * FROM guide_urls
    UNION ALL SELECT * FROM store_urls
    UNION ALL SELECT * FROM listing_urls
    UNION ALL SELECT * FROM article_urls
  )
  SELECT u.*
  FROM all_urls u
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.seo_pages seo
    WHERE seo.path = regexp_replace(u.loc, '^https://tamrakarcomplex\.com', '')
      AND (seo.noindex IS TRUE OR seo.is_active IS FALSE)
  )
  ORDER BY u.priority DESC, u.loc ASC;
$$;

GRANT EXECUTE ON FUNCTION public.generate_seo_sitemap() TO anon, authenticated;
