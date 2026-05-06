CREATE TABLE IF NOT EXISTS public.seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_key text NOT NULL,
  path text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  keywords text[] DEFAULT '{}',
  og_image text,
  noindex boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_pages_route_key ON public.seo_pages(route_key);
CREATE INDEX IF NOT EXISTS idx_seo_pages_active_path ON public.seo_pages(is_active, path);

ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_seo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'suadmin'::public.app_role)
    OR public.has_staff_permission('content', 'edit')
    OR public.has_staff_permission('settings', 'edit');
$$;

DROP POLICY IF EXISTS "Public can read active SEO pages" ON public.seo_pages;
CREATE POLICY "Public can read active SEO pages"
ON public.seo_pages
FOR SELECT
USING (is_active = true OR public.can_manage_seo());

DROP POLICY IF EXISTS "SEO managers can insert pages" ON public.seo_pages;
CREATE POLICY "SEO managers can insert pages"
ON public.seo_pages
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_seo());

DROP POLICY IF EXISTS "SEO managers can update pages" ON public.seo_pages;
CREATE POLICY "SEO managers can update pages"
ON public.seo_pages
FOR UPDATE
TO authenticated
USING (public.can_manage_seo())
WITH CHECK (public.can_manage_seo());

DROP POLICY IF EXISTS "SEO managers can delete pages" ON public.seo_pages;
CREATE POLICY "SEO managers can delete pages"
ON public.seo_pages
FOR DELETE
TO authenticated
USING (public.can_manage_seo());

CREATE OR REPLACE FUNCTION public.touch_seo_pages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_seo_pages ON public.seo_pages;
CREATE TRIGGER trg_touch_seo_pages
BEFORE INSERT OR UPDATE ON public.seo_pages
FOR EACH ROW EXECUTE FUNCTION public.touch_seo_pages();

INSERT INTO public.seo_pages (route_key, path, title, description, keywords, og_image)
VALUES
  ('/mobile-price', '/mobile-price', 'Mobile Price in Nepal', 'Compare the latest mobile phone prices in Nepal with verified specs, availability, and store offers at Tamrakar Complex.', ARRAY['mobile price Nepal','smartphone price Nepal','Tamrakar Complex mobile price'], '/og-image.png'),
  ('/stores', '/stores', 'Tamrakar Complex Store Directory', 'Browse verified mobile, repair, gadget, and electronics stores inside Tamrakar Complex, Kathmandu.', ARRAY['Tamrakar Complex stores','mobile shops Kathmandu','electronics stores Nepal'], '/og-image.png'),
  ('/marketplace', '/marketplace', 'Buy and Sell Electronics in Nepal', 'Browse active marketplace listings for mobiles, laptops, tablets, and gadgets from verified sellers in Nepal.', ARRAY['marketplace Nepal','used phones Nepal','buy sell electronics Nepal'], '/og-image.png'),
  ('/sell-your-phone', '/sell-your-phone', 'Sell Your Phone in Nepal', 'Get an instant used phone valuation and start a fast, quote-led phone resale flow with Tamrakar Complex.', ARRAY['sell phone Nepal','phone valuation Nepal','sell used mobile Nepal'], '/og-image.png'),
  ('/repair', '/repair', 'Mobile Repair in Nepal', 'Book phone repair, track repair requests, and browse free device repair guides from Tamrakar Complex technicians.', ARRAY['mobile repair Nepal','phone repair Kathmandu','repair tracking'], '/og-image.png'),
  ('/news', '/news', 'Tech News Nepal', 'Read the latest gadget launches, mobile price updates, tech news, reviews, and guides from Tamrakar Complex.', ARRAY['tech news Nepal','gadget news Nepal','mobile price news'], '/og-image.png')
ON CONFLICT (path) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    keywords = EXCLUDED.keywords,
    og_image = EXCLUDED.og_image,
    is_active = true;

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
    UNION ALL SELECT 'https://tamrakarcomplex.com/stores', now(), 'daily', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/marketplace', now(), 'hourly', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/sell-your-phone', now(), 'weekly', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/repair', now(), 'weekly', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/news', now(), 'daily', 0.7, 'static'
  ),
  product_urls AS (
    SELECT 'https://tamrakarcomplex.com/product/' || p.slug AS loc,
      COALESCE(p.updated_at, p.created_at, now()) AS lastmod,
      'weekly'::text AS changefreq,
      CASE WHEN p.in_stock IS TRUE THEN 0.8 ELSE 0.5 END::numeric AS priority,
      'product'::text AS source_type
    FROM public.products p
    WHERE p.slug IS NOT NULL
      AND p.slug <> ''
      AND COALESCE(p.in_stock, true) IS TRUE
  ),
  brand_urls AS (
    SELECT 'https://tamrakarcomplex.com/mobile-price/brand/' || lower(regexp_replace(p.brand, '[^a-zA-Z0-9]+', '-', 'g')) AS loc,
      max(COALESCE(p.updated_at, p.created_at, now())) AS lastmod,
      'daily'::text AS changefreq,
      0.8::numeric AS priority,
      'brand'::text AS source_type
    FROM public.products p
    WHERE p.brand IS NOT NULL
      AND p.brand <> ''
      AND COALESCE(p.in_stock, true) IS TRUE
    GROUP BY lower(regexp_replace(p.brand, '[^a-zA-Z0-9]+', '-', 'g'))
  ),
  device_urls AS (
    SELECT 'https://tamrakarcomplex.com/repair/device/' || d.slug AS loc,
      COALESCE(d.updated_at, d.created_at, now()) AS lastmod,
      'monthly'::text AS changefreq,
      0.7::numeric AS priority,
      'repair_device'::text AS source_type
    FROM public.repair_devices d
    WHERE d.slug IS NOT NULL AND d.slug <> ''
  ),
  guide_urls AS (
    SELECT 'https://tamrakarcomplex.com/repair/guide/' || g.slug AS loc,
      COALESCE(g.updated_at, g.created_at, now()) AS lastmod,
      'monthly'::text AS changefreq,
      0.7::numeric AS priority,
      'repair_guide'::text AS source_type
    FROM public.repair_guides g
    WHERE g.slug IS NOT NULL AND g.slug <> ''
      AND COALESCE(g.published, true) IS TRUE
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
  UNION ALL SELECT * FROM device_urls
  UNION ALL SELECT * FROM guide_urls
  UNION ALL SELECT * FROM store_urls
  UNION ALL SELECT * FROM listing_urls
  UNION ALL SELECT * FROM article_urls
  ORDER BY priority DESC, loc ASC;
$$;
