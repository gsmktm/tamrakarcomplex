-- Fix 1: Recreate can_manage_seo using is_super_admin (safe on prod)
CREATE OR REPLACE FUNCTION public.can_manage_seo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role::text IN ('suadmin', 'staffadmin')
      )
    )
  );
$$;

-- Fix 2: Re-apply RLS policies on seo_pages (idempotent)
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active SEO pages" ON public.seo_pages;
CREATE POLICY "Public can read active SEO pages"
ON public.seo_pages FOR SELECT
USING (is_active = true OR public.can_manage_seo());

DROP POLICY IF EXISTS "SEO managers can insert pages" ON public.seo_pages;
CREATE POLICY "SEO managers can insert pages"
ON public.seo_pages FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_seo());

DROP POLICY IF EXISTS "SEO managers can update pages" ON public.seo_pages;
CREATE POLICY "SEO managers can update pages"
ON public.seo_pages FOR UPDATE
TO authenticated
USING (public.can_manage_seo())
WITH CHECK (public.can_manage_seo());

DROP POLICY IF EXISTS "SEO managers can delete pages" ON public.seo_pages;
CREATE POLICY "SEO managers can delete pages"
ON public.seo_pages FOR DELETE
TO authenticated
USING (public.can_manage_seo());

-- Fix 3: Create generate_seo_sitemap RPC (was 404 — not deployed)
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
    SELECT 'https://tamrakarcomplex.com/'::text AS loc, now() AS lastmod, 'daily'::text AS changefreq, 1.0::numeric AS priority, 'static'::text AS source_type
    UNION ALL SELECT 'https://tamrakarcomplex.com/mobile-price', now(), 'daily', 0.9, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/stores',        now(), 'daily', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/marketplace',   now(), 'hourly', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/sell-your-phone', now(), 'weekly', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/repair',        now(), 'weekly', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/news',          now(), 'daily', 0.7, 'static'
  ),
  product_urls AS (
    SELECT 'https://tamrakarcomplex.com/product/' || p.slug AS loc,
      COALESCE(p.updated_at, p.created_at, now()) AS lastmod,
      'weekly'::text AS changefreq,
      CASE WHEN p.in_stock IS TRUE THEN 0.8 ELSE 0.5 END::numeric AS priority,
      'product'::text AS source_type
    FROM public.products p
    WHERE p.slug IS NOT NULL AND p.slug <> ''
      AND COALESCE(p.in_stock, true) IS TRUE
  ),
  brand_urls AS (
    SELECT 'https://tamrakarcomplex.com/mobile-price/brand/' || lower(regexp_replace(p.brand, '[^a-zA-Z0-9]+', '-', 'g')) AS loc,
      max(COALESCE(p.updated_at, p.created_at, now())) AS lastmod,
      'daily'::text AS changefreq,
      0.8::numeric AS priority,
      'brand'::text AS source_type
    FROM public.products p
    WHERE p.brand IS NOT NULL AND p.brand <> ''
      AND COALESCE(p.in_stock, true) IS TRUE
    GROUP BY lower(regexp_replace(p.brand, '[^a-zA-Z0-9]+', '-', 'g'))
  ),
  store_urls AS (
    SELECT 'https://tamrakarcomplex.com/stores/' || COALESCE(NULLIF(s.slug, ''), s.id::text) AS loc,
      COALESCE(s.updated_at, s.created_at, now()) AS lastmod,
      'weekly'::text AS changefreq,
      CASE WHEN COALESCE(s.subscription_status, '') = 'active' THEN 0.8 ELSE 0.5 END::numeric AS priority,
      'store'::text AS source_type
    FROM public.stores s
    WHERE (s.is_verified IS TRUE OR COALESCE(s.subscription_status, '') = 'active')
  ),
  listing_urls AS (
    SELECT 'https://tamrakarcomplex.com/marketplace/listing/' || l.id::text AS loc,
      COALESCE(l.updated_at, l.created_at, now()) AS lastmod,
      'daily'::text AS changefreq,
      0.6::numeric AS priority,
      'marketplace_listing'::text AS source_type
    FROM public.sell_listings l
    WHERE l.status = 'active'
  ),
  article_urls AS (
    SELECT 'https://tamrakarcomplex.com/article/' || a.slug AS loc,
      COALESCE(a.updated_at, a.created_at, now()) AS lastmod,
      'weekly'::text AS changefreq,
      CASE WHEN a.featured IS TRUE THEN 0.8 ELSE 0.6 END::numeric AS priority,
      'article'::text AS source_type
    FROM public.articles a
    WHERE a.slug IS NOT NULL AND a.slug <> ''
      AND COALESCE(a.published, true) IS TRUE
  )
  SELECT * FROM base
  UNION ALL SELECT * FROM product_urls
  UNION ALL SELECT * FROM brand_urls
  UNION ALL SELECT * FROM store_urls
  UNION ALL SELECT * FROM listing_urls
  UNION ALL SELECT * FROM article_urls
  ORDER BY priority DESC, loc ASC;
$$;

-- Grant execute to authenticated + anon so frontend RPC calls work
GRANT EXECUTE ON FUNCTION public.generate_seo_sitemap() TO authenticated, anon;
