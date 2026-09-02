-- Keep incomplete or synthetic inventory out of search, Merchant feeds, and
-- customer purchase flows. A missing factual description must be verified by
-- an editor; manufacturing copy would create a misrepresentation risk.
UPDATE public.products
SET in_stock = false,
    featured = false,
    updated_at = now()
WHERE in_stock IS true
  AND (
    slug IS NULL OR btrim(slug) = ''
    OR description IS NULL OR btrim(description) = ''
    OR image IS NULL OR btrim(image) = ''
    OR brand IS NULL OR btrim(brand) = ''
    OR category IS NULL OR btrim(category) = ''
    OR price_value IS NULL OR price_value <= 0
  );

-- Existing manual SEO text is preserved. Only its indexability changes when
-- the backing product is not eligible for sale.
UPDATE public.seo_pages seo
SET noindex = true,
    is_active = true,
    updated_at = now()
FROM public.products product
WHERE seo.path = '/product/' || product.slug
  AND product.in_stock IS NOT true;

-- Create only missing exact-path records for published articles. Existing
-- manual records win through ON CONFLICT DO NOTHING.
INSERT INTO public.seo_pages (
  route_key,
  path,
  title,
  description,
  keywords,
  og_image,
  noindex,
  is_active,
  updated_at
)
SELECT
  '/stores/article/:slug',
  '/stores/article/' || article.slug,
  left(COALESCE(NULLIF(btrim(article.meta_title), ''), article.title), 70),
  left(
    COALESCE(
      NULLIF(btrim(article.meta_description), ''),
      NULLIF(btrim(article.excerpt), ''),
      'Read ' || article.title || ' from Tamrakar Complex.'
    ),
    180
  ),
  ARRAY['tech Nepal', 'Tamrakar Complex', article.title],
  COALESCE(NULLIF(btrim(article.og_image), ''), NULLIF(btrim(article.image), ''), '/og-image.png'),
  false,
  true,
  now()
FROM public.articles article
WHERE article.published IS true
  AND article.slug IS NOT NULL
  AND btrim(article.slug) <> ''
  AND article.title IS NOT NULL
  AND btrim(article.title) <> ''
ON CONFLICT (path) DO NOTHING;
