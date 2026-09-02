-- Canonical SEO defaults for public commerce, store, repair, and article routes.
-- Keeps /suadmin/growth?tab=seo "Missing SEO" aligned with frontend route templates.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_key text NOT NULL,
  path text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  keywords text[] DEFAULT '{}',
  og_image text,
  canonical_url text,
  structured_data jsonb,
  noindex boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS route_key text;
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}';
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS og_image text;
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS canonical_url text;
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS structured_data jsonb;
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false;
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DELETE FROM public.seo_pages a
USING public.seo_pages b
WHERE a.path = b.path
  AND a.ctid < b.ctid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'seo_pages'
      AND indexname = 'seo_pages_path_key'
  ) THEN
    CREATE UNIQUE INDEX seo_pages_path_key ON public.seo_pages(path);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('suadmin', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_seo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('staffadmin', 'seo_manager')
    )
  );
$$;

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

INSERT INTO public.seo_pages (route_key, path, title, description, keywords, og_image, noindex, is_active)
VALUES
  (
    '/cat/mobiles',
    '/cat/mobiles',
    'Mobile Price in Nepal 2026',
    'Compare the latest mobile phone prices in Nepal with verified specs, availability, EMI plans, and store offers at Tamrakar Complex.',
    ARRAY['mobile price Nepal','smartphone price Nepal','mobile price in Nepal 2026','Tamrakar Complex mobile price'],
    '/og-image.png',
    false,
    true
  ),
  (
    '/cat/mobiles/:brand',
    '/cat/mobiles/:brand',
    '{brand} Mobile Price in Nepal',
    'Check the latest {brand} mobile prices in Nepal with specs, variants, and buying options from Tamrakar Complex.',
    ARRAY['{brand} price Nepal','{brand} mobile price','buy {brand} Nepal'],
    '/og-image.png',
    false,
    true
  ),
  (
    '/product/:slug',
    '/product/:slug',
    '{name} Price in Nepal',
    'Check {name} price in Nepal, specifications, availability, and genuine buying options at Tamrakar Complex.',
    ARRAY['{name} price Nepal','buy {name} Nepal','Tamrakar Complex'],
    '/og-image.png',
    false,
    true
  ),
  (
    '/stores',
    '/stores',
    'Tamrakar Complex Store Directory',
    'Browse verified mobile, repair, gadget, and electronics stores inside Tamrakar Complex, Kathmandu.',
    ARRAY['Tamrakar Complex stores','mobile shops Kathmandu','electronics stores Nepal'],
    '/og-image.png',
    false,
    true
  ),
  (
    '/stores/:slug',
    '/stores/:slug',
    '{name} Store at Tamrakar Complex',
    'View {name} contact details, services, opening hours, products, and offers at Tamrakar Complex.',
    ARRAY['{name}','Tamrakar Complex store','mobile shop Kathmandu'],
    '/og-image.png',
    false,
    true
  ),
  (
    '/marketplace',
    '/marketplace',
    'Buy and Sell Electronics in Nepal',
    'Browse active marketplace listings for mobiles, laptops, tablets, and gadgets from verified sellers in Nepal.',
    ARRAY['marketplace Nepal','used phones Nepal','buy sell electronics Nepal'],
    '/og-image.png',
    false,
    true
  ),
  (
    '/marketplace/listing/:id',
    '/marketplace/listing/:id',
    '{title} for Sale in Nepal',
    'View price, condition, location, and contact details for {title} on Tamrakar Complex Marketplace.',
    ARRAY['{title}','used gadget Nepal','marketplace listing Nepal'],
    '/og-image.png',
    false,
    true
  ),
  (
    '/sell-your-phone',
    '/sell-your-phone',
    'Sell Your Phone in Nepal',
    'Get an instant used phone valuation and start a fast, quote-led phone resale flow with Tamrakar Complex.',
    ARRAY['sell phone Nepal','phone valuation Nepal','sell used mobile Nepal'],
    '/og-image.png',
    false,
    true
  ),
  (
    '/repair',
    '/repair',
    'Mobile Repair in Nepal',
    'Book phone repair, track repair requests, and browse free device repair guides from Tamrakar Complex technicians.',
    ARRAY['mobile repair Nepal','phone repair Kathmandu','repair tracking'],
    '/og-image.png',
    false,
    true
  ),
  (
    '/repair/device/:slug',
    '/repair/device/:slug',
    '{name} Repair Guide and Service',
    'Find {name} repair guides, parts, tools, and professional repair service options at Tamrakar Complex.',
    ARRAY['{name} repair','phone repair guide','Tamrakar repair'],
    '/og-image.png',
    false,
    true
  ),
  (
    '/stores/article',
    '/stores/article',
    'Tech News Nepal',
    'Read the latest gadget launches, mobile price updates, tech news, reviews, and guides from Tamrakar Complex.',
    ARRAY['tech news Nepal','gadget news Nepal','mobile price news'],
    '/og-image.png',
    false,
    true
  ),
  (
    '/stores/article/:slug',
    '/stores/article/:slug',
    '{title}',
    'Read {title} from Tamrakar Complex with practical tech news, guides, reviews, and buying advice.',
    ARRAY['tech article Nepal','gadget guide','Tamrakar Complex news'],
    '/og-image.png',
    false,
    true
  )
ON CONFLICT (path) DO UPDATE
SET route_key = EXCLUDED.route_key,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    keywords = EXCLUDED.keywords,
    og_image = EXCLUDED.og_image,
    noindex = false,
    is_active = true,
    updated_at = now();

-- Keep legacy paths as active redirect-friendly metadata, but remove them from canonical route templates.
UPDATE public.seo_pages
SET route_key = '/cat/mobiles',
    title = 'Mobile Price in Nepal 2026',
    description = 'Compare the latest mobile phone prices in Nepal with verified specs, availability, EMI plans, and store offers at Tamrakar Complex.',
    keywords = ARRAY['mobile price Nepal','smartphone price Nepal','mobile price in Nepal 2026','Tamrakar Complex mobile price'],
    og_image = COALESCE(NULLIF(og_image, ''), '/og-image.png'),
    is_active = true,
    noindex = false,
    updated_at = now()
WHERE path = '/mobile-price';

UPDATE public.seo_pages
SET route_key = '/stores/article',
    title = 'Tech News Nepal',
    description = 'Read the latest gadget launches, mobile price updates, tech news, reviews, and guides from Tamrakar Complex.',
    keywords = ARRAY['tech news Nepal','gadget news Nepal','mobile price news'],
    og_image = COALESCE(NULLIF(og_image, ''), '/og-image.png'),
    is_active = true,
    noindex = false,
    updated_at = now()
WHERE path = '/news';

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
    UNION ALL SELECT 'https://tamrakarcomplex.com/cat/mobiles', now(), 'daily', 0.9, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/stores', now(), 'daily', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/marketplace', now(), 'hourly', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/sell-your-phone', now(), 'weekly', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/repair', now(), 'weekly', 0.8, 'static'
    UNION ALL SELECT 'https://tamrakarcomplex.com/stores/article', now(), 'daily', 0.7, 'static'
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
    SELECT 'https://tamrakarcomplex.com/cat/mobiles/' || lower(regexp_replace(p.brand, '[^a-zA-Z0-9]+', '-', 'g')) AS loc,
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
      COALESCE(d.created_at, now()) AS lastmod,
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
    SELECT 'https://tamrakarcomplex.com/stores/article/' || a.slug AS loc,
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

GRANT EXECUTE ON FUNCTION public.generate_seo_sitemap() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_seo() TO authenticated;
