-- Repair the records surfaced by Growth > SEO without manufacturing claims.
-- Unverified synthetic catalog rows are quarantined from storefronts, sitemap,
-- Merchant feeds, and indexing until a seller confirms a real SKU and price.

UPDATE public.products
SET image = CASE name
  WHEN 'Acer Nitro V' THEN 'https://images.acer.com/is/image/acer/acer-laptop-nitro-v15-anv15-52-agw-banner%3ASecondary-Hero-S'
  WHEN 'Redmi Note 13 Pro+' THEN 'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-pro-plus.jpg'
  WHEN 'iPhone 15 Pro Max' THEN 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg'
  ELSE image
END,
updated_at = now()
WHERE name IN ('Acer Nitro V', 'Redmi Note 13 Pro+', 'iPhone 15 Pro Max')
  AND (image IS NULL OR btrim(image) = '');

-- Keep the known canonical S24 Ultra record and quarantine randomized copies.
UPDATE public.products
SET in_stock = false,
    featured = false,
    description = COALESCE(
      NULLIF(btrim(description), ''),
      'This catalog record is withheld from sale while its exact model, variant, image, seller, and price are verified.'
    ),
    updated_at = now()
WHERE name = 'Samsung Galaxy S24 Ultra'
  AND slug <> 'samsung-galaxy-s24-ultra';

-- These names/rows had mismatched handset images and widely inconsistent prices.
-- Do not represent them as purchasable inventory until an administrator verifies
-- the precise commercial model and replaces the placeholder record.
UPDATE public.products
SET in_stock = false,
    featured = false,
    description = COALESCE(
      NULLIF(btrim(description), ''),
      'This catalog record is withheld from sale while its exact model, variant, image, seller, and price are verified.'
    ),
    updated_at = now()
WHERE name IN (
  'Xiaomi 13 Pro Plus',
  'Vivo V29 Pro SE',
  'Realme GT Neo 3 Lite',
  'Motorola Edge 40 Pro SE',
  'Xiaomi Poco X5 Pro Max',
  'ZTE Nubia Z60 Ultra Max',
  'Honor 90 Plus',
  'Lenovo Legion Y70 Plus',
  'Oppo Find X7 Ultra Plus',
  'Huawei Mate 60 Pro 5G',
  'Sony Xperia 10 IV SE',
  'Xiaomi Redmi Note 11 5G',
  'Nokia G42 Plus',
  'Infinix GT 10 Pro 5G',
  'Lenovo Legion Y70 Max'
);

-- Exact-path noindex records make quarantined URLs explicit even when visited
-- directly. Existing rows are updated by the unique path constraint.
INSERT INTO public.seo_pages (
  route_key, path, title, description, keywords, og_image,
  noindex, is_active, updated_at
)
SELECT
  '/product/:slug',
  '/product/' || p.slug,
  p.name || ' — Listing Under Verification',
  'This listing is temporarily unavailable while its product identity, image, price, stock, and seller details are verified.',
  ARRAY[p.name, 'listing verification'],
  COALESCE(NULLIF(p.image, ''), '/og-image.png'),
  true,
  true,
  now()
FROM public.products p
WHERE p.in_stock IS false
  AND (
    p.name IN (
      'Xiaomi 13 Pro Plus', 'Vivo V29 Pro SE', 'Realme GT Neo 3 Lite',
      'Motorola Edge 40 Pro SE', 'Xiaomi Poco X5 Pro Max',
      'ZTE Nubia Z60 Ultra Max', 'Honor 90 Plus', 'Lenovo Legion Y70 Plus',
      'Oppo Find X7 Ultra Plus', 'Huawei Mate 60 Pro 5G',
      'Sony Xperia 10 IV SE', 'Xiaomi Redmi Note 11 5G', 'Nokia G42 Plus',
      'Infinix GT 10 Pro 5G', 'Lenovo Legion Y70 Max'
    )
    OR (p.name = 'Samsung Galaxy S24 Ultra' AND p.slug <> 'samsung-galaxy-s24-ultra')
  )
ON CONFLICT (path) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  keywords = EXCLUDED.keywords,
  og_image = EXCLUDED.og_image,
  noindex = true,
  is_active = true,
  updated_at = now();

-- Complete missing blog metadata from each article's own title and excerpt.
-- Existing editorial SEO values are deliberately preserved.
UPDATE public.articles
SET meta_title = CASE
      WHEN meta_title IS NULL OR btrim(meta_title) = ''
        THEN left(title || ' | Tamrakar Complex', 70)
      ELSE meta_title
    END,
    meta_description = CASE
      WHEN meta_description IS NULL OR btrim(meta_description) = ''
        THEN left(
          COALESCE(NULLIF(btrim(excerpt), ''), 'Read the latest Nepal-focused technology article and practical buying guidance.')
          || ' Updated with context for Nepal readers.',
          180
        )
      ELSE meta_description
    END,
    updated_at = now()
WHERE published IS true
  AND (
    meta_title IS NULL OR btrim(meta_title) = ''
    OR meta_description IS NULL OR btrim(meta_description) = ''
  );

-- Reuse the existing image from the duplicate editorial topic when available.
UPDATE public.articles target
SET image = source.image,
    og_image = COALESCE(NULLIF(target.og_image, ''), source.image),
    updated_at = now()
FROM public.articles source
WHERE target.id <> source.id
  AND target.title = source.title
  AND (target.image IS NULL OR btrim(target.image) = '')
  AND source.image IS NOT NULL
  AND btrim(source.image) <> '';

-- Last-resort editorial image avoids broken social cards without pretending to
-- be a photograph of a specific product.
UPDATE public.articles
SET image = COALESCE(NULLIF(image, ''), '/og-image.png'),
    og_image = COALESCE(NULLIF(og_image, ''), NULLIF(image, ''), '/og-image.png'),
    updated_at = now()
WHERE published IS true
  AND (
    image IS NULL OR btrim(image) = ''
    OR og_image IS NULL OR btrim(og_image) = ''
  );
