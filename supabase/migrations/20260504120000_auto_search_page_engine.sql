-- Automatic search-to-page generation engine
-- Captures customer searches, normalizes intent, matches real data, and creates
-- controlled SEO landing pages without thin/spam sitemap exposure.

ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS structured_data jsonb;
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS canonical_url text;
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false;
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS route_key text;
ALTER TABLE public.seo_pages ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  raw_query text NOT NULL,
  normalized_query text NOT NULL,
  normalized_parts jsonb NOT NULL DEFAULT '{}'::jsonb,
  intent text NOT NULL DEFAULT 'general',
  source_path text,
  matched_products_count integer NOT NULL DEFAULT 0,
  matched_stores_count integer NOT NULL DEFAULT 0,
  matched_repairs_count integer NOT NULL DEFAULT 0,
  matched_listings_count integer NOT NULL DEFAULT 0,
  auto_page_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_query_created ON public.search_logs(normalized_query, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_intent_created ON public.search_logs(intent, created_at DESC);

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert search logs" ON public.search_logs;
CREATE POLICY "Anyone can insert search logs"
ON public.search_logs
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read search logs" ON public.search_logs;
CREATE POLICY "Admins can read search logs"
ON public.search_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('suadmin', 'staffadmin', 'admin')
  )
);

CREATE TABLE IF NOT EXISTS public.auto_search_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_key text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  path text NOT NULL UNIQUE,
  primary_query text NOT NULL,
  normalized_query text NOT NULL,
  normalized_parts jsonb NOT NULL DEFAULT '{}'::jsonb,
  intent text NOT NULL DEFAULT 'general',
  quality_score integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  meta_description text NOT NULL,
  h1 text NOT NULL,
  intro text NOT NULL,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  structured_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  social_share jsonb NOT NULL DEFAULT '{}'::jsonb,
  og_image text NOT NULL DEFAULT '/og-image.png',
  canonical_url text,
  robots_noindex boolean NOT NULL DEFAULT true,
  sitemap_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  needs_refresh boolean NOT NULL DEFAULT false,
  refresh_reason text,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  call_clicks integer NOT NULL DEFAULT 0,
  whatsapp_clicks integer NOT NULL DEFAULT 0,
  bookings integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  content_refreshed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_search_pages_active_path ON public.auto_search_pages(status, path);
CREATE INDEX IF NOT EXISTS idx_auto_search_pages_sitemap ON public.auto_search_pages(sitemap_enabled, robots_noindex, quality_score);

ALTER TABLE public.auto_search_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active auto search pages" ON public.auto_search_pages;
CREATE POLICY "Public can read active auto search pages"
ON public.auto_search_pages
FOR SELECT
USING (status = 'active');

DROP POLICY IF EXISTS "Admins can manage auto search pages" ON public.auto_search_pages;
CREATE POLICY "Admins can manage auto search pages"
ON public.auto_search_pages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('suadmin', 'staffadmin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('suadmin', 'staffadmin', 'admin')
  )
);

CREATE TABLE IF NOT EXISTS public.auto_search_page_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.auto_search_pages(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('impression', 'click', 'conversion', 'call', 'whatsapp', 'booking')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_search_page_metrics_page_event ON public.auto_search_page_metrics(page_id, event_type, created_at DESC);

ALTER TABLE public.auto_search_page_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert auto search metrics" ON public.auto_search_page_metrics;
CREATE POLICY "Anyone can insert auto search metrics"
ON public.auto_search_page_metrics
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read auto search metrics" ON public.auto_search_page_metrics;
CREATE POLICY "Admins can read auto search metrics"
ON public.auto_search_page_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('suadmin', 'staffadmin', 'admin')
  )
);

CREATE OR REPLACE FUNCTION public.auto_search_slugify(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' FROM regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.track_auto_search_page_event(
  p_page_id uuid,
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event_type NOT IN ('impression', 'click', 'conversion', 'call', 'whatsapp', 'booking') THEN
    RETURN;
  END IF;

  INSERT INTO public.auto_search_page_metrics(page_id, event_type, metadata)
  VALUES (p_page_id, p_event_type, coalesce(p_metadata, '{}'::jsonb));

  UPDATE public.auto_search_pages
  SET
    impressions = impressions + CASE WHEN p_event_type = 'impression' THEN 1 ELSE 0 END,
    clicks = clicks + CASE WHEN p_event_type = 'click' THEN 1 ELSE 0 END,
    conversions = conversions + CASE WHEN p_event_type = 'conversion' THEN 1 ELSE 0 END,
    call_clicks = call_clicks + CASE WHEN p_event_type = 'call' THEN 1 ELSE 0 END,
    whatsapp_clicks = whatsapp_clicks + CASE WHEN p_event_type = 'whatsapp' THEN 1 ELSE 0 END,
    bookings = bookings + CASE WHEN p_event_type = 'booking' THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE id = p_page_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_search_and_build_auto_page(
  p_query text,
  p_source_path text DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw text := left(coalesce(p_query, ''), 180);
  v_query text := trim(regexp_replace(lower(coalesce(p_query, '')), '\s+', ' ', 'g'));
  v_core text;
  v_intent text := 'general';
  v_brand text;
  v_condition text;
  v_storage text;
  v_budget numeric;
  v_slug text;
  v_intent_key text;
  v_quality integer := 0;
  v_product_count integer := 0;
  v_store_count integer := 0;
  v_repair_count integer := 0;
  v_listing_count integer := 0;
  v_sections jsonb := '{}'::jsonb;
  v_faqs jsonb := '[]'::jsonb;
  v_structured jsonb := '[]'::jsonb;
  v_social jsonb := '{}'::jsonb;
  v_page_id uuid;
  v_title text;
  v_description text;
  v_h1 text;
  v_intro text;
  v_noindex boolean := true;
  v_sitemap boolean := false;
BEGIN
  IF char_length(v_query) < 2 OR v_query ~ 'https?://' OR v_query ~ '[<>{}]' THEN
    INSERT INTO public.search_logs(raw_query, normalized_query, intent, source_path, session_id)
    VALUES (v_raw, v_query, 'rejected', p_source_path, p_session_id);
    RETURN jsonb_build_object('created', false, 'reason', 'weak_or_spam_query');
  END IF;

  v_brand := CASE
    WHEN v_query ~ '\b(iphone|apple|macbook|ipad|airpods)\b' THEN 'Apple'
    WHEN v_query ~ '\bsamsung|galaxy\b' THEN 'Samsung'
    WHEN v_query ~ '\b(xiaomi|redmi|poco|mi )\b' THEN 'Xiaomi'
    WHEN v_query ~ '\boneplus\b' THEN 'OnePlus'
    WHEN v_query ~ '\boppo\b' THEN 'Oppo'
    WHEN v_query ~ '\bvivo\b' THEN 'Vivo'
    WHEN v_query ~ '\brealme\b' THEN 'Realme'
    ELSE NULL
  END;

  v_intent := CASE
    WHEN v_query ~ '\b(repair|screen|display|battery|charging|camera|speaker|unlock|frp|mdm|icloud)\b' THEN 'repair'
    WHEN v_query ~ '\b(used|second hand|pre owned|old)\b' THEN 'used'
    WHEN v_query ~ '\b(exchange|swap|trade)\b' THEN 'exchange'
    WHEN v_query ~ '\b(sell|valuation|value|estimate)\b' THEN 'sell'
    WHEN v_query ~ '\b(price|rate|cost|rs|budget|under|below)\b' THEN 'price'
    WHEN v_query ~ '\b(store|shop|dealer|tamrakar|new road|newroad)\b' THEN 'store'
    ELSE 'product'
  END;

  v_condition := CASE
    WHEN v_query ~ '\b(new|brand new)\b' THEN 'new'
    WHEN v_query ~ '\b(used|second hand|pre owned|old)\b' THEN 'used'
    WHEN v_query ~ '\b(refurbished|open box)\b' THEN 'refurbished'
    ELSE NULL
  END;

  v_storage := (regexp_match(v_query, '([0-9]{2,4})\s?(gb|tb)'))[1] || upper((regexp_match(v_query, '([0-9]{2,4})\s?(gb|tb)'))[2]);
  v_budget := nullif(regexp_replace(coalesce((regexp_match(v_query, '(?:under|below|budget|rs\.?)\s*([0-9,]{4,9})'))[1], ''), '[^0-9]', '', 'g'), '')::numeric;

  v_core := trim(regexp_replace(v_query, '\b(price|rate|cost|buy|new|used|second|hand|repair|service|exchange|sell|valuation|value|phone|mobile|in|nepal|kathmandu|new|road|newroad|tamrakar|complex|under|below|budget|rs)\b', ' ', 'g'));
  v_core := trim(regexp_replace(v_core, '\s+', ' ', 'g'));
  IF char_length(v_core) < 2 THEN
    v_core := v_query;
  END IF;

  WITH matched AS (
    SELECT id, name, slug, image_url, price_npr, price_text, updated_at
    FROM public.catalog_products
    WHERE coalesce(is_active, true) IS TRUE
      AND (
        lower(name) LIKE '%' || v_core || '%'
        OR (v_brand IS NOT NULL AND lower(name) LIKE '%' || lower(v_brand) || '%')
      )
    ORDER BY coalesce(price_npr, 0) DESC NULLS LAST, updated_at DESC NULLS LAST
    LIMIT 8
  )
  SELECT count(*), coalesce(jsonb_agg(to_jsonb(matched)), '[]'::jsonb)
  INTO v_product_count, v_sections
  FROM matched;
  v_sections := jsonb_build_object('products', coalesce(v_sections, '[]'::jsonb));

  WITH matched AS (
    SELECT id, coalesce(slug, id::text) AS slug, name, location, phone, whatsapp, logo_url, is_verified, services
    FROM public.stores
    WHERE (
      lower(name) LIKE '%' || v_core || '%'
      OR lower(location) LIKE '%' || v_core || '%'
      OR lower(coalesce(array_to_string(services, ' '), '')) LIKE '%' || v_core || '%'
      OR (v_brand IS NOT NULL AND lower(coalesce(array_to_string(services, ' '), '') || ' ' || name) LIKE '%' || lower(v_brand) || '%')
    )
    ORDER BY is_verified DESC, updated_at DESC NULLS LAST
    LIMIT 8
  )
  SELECT count(*), v_sections || jsonb_build_object('stores', coalesce(jsonb_agg(to_jsonb(matched)), '[]'::jsonb))
  INTO v_store_count, v_sections
  FROM matched;

  WITH matched AS (
    SELECT id, title, description, device_brand, issue_type, estimated_price, store_id, updated_at
    FROM public.repair_services
    WHERE coalesce(is_active, true) IS TRUE
      AND (
        lower(title) LIKE '%' || v_core || '%'
        OR lower(coalesce(description, '')) LIKE '%' || v_core || '%'
        OR lower(coalesce(device_brand, '')) LIKE '%' || v_core || '%'
        OR lower(coalesce(issue_type, '')) LIKE '%' || v_core || '%'
        OR (v_brand IS NOT NULL AND lower(coalesce(device_brand, '')) LIKE '%' || lower(v_brand) || '%')
      )
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 8
  )
  SELECT count(*), v_sections || jsonb_build_object('repairs', coalesce(jsonb_agg(to_jsonb(matched)), '[]'::jsonb))
  INTO v_repair_count, v_sections
  FROM matched;

  WITH matched AS (
    SELECT id, title, description, price, currency, condition, category, brand, model, images, location, updated_at
    FROM public.sell_listings
    WHERE status = 'active'
      AND (
        lower(title) LIKE '%' || v_core || '%'
        OR lower(coalesce(brand, '')) LIKE '%' || v_core || '%'
        OR lower(coalesce(model, '')) LIKE '%' || v_core || '%'
        OR lower(coalesce(category, '')) LIKE '%' || v_core || '%'
        OR (v_brand IS NOT NULL AND lower(coalesce(brand, '') || ' ' || title) LIKE '%' || lower(v_brand) || '%')
      )
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 8
  )
  SELECT count(*), v_sections || jsonb_build_object('listings', coalesce(jsonb_agg(to_jsonb(matched)), '[]'::jsonb))
  INTO v_listing_count, v_sections
  FROM matched;

  IF (v_product_count + v_store_count + v_repair_count + v_listing_count) = 0 THEN
    INSERT INTO public.search_logs(raw_query, normalized_query, normalized_parts, intent, source_path, session_id)
    VALUES (
      v_raw,
      v_query,
      jsonb_build_object('brand', v_brand, 'category', NULL, 'condition', v_condition, 'storage', v_storage, 'budget', v_budget, 'intent', v_intent),
      v_intent,
      p_source_path,
      p_session_id
    );
    RETURN jsonb_build_object('created', false, 'reason', 'no_real_data_match');
  END IF;

  v_quality := least(100,
    20
    + (least(v_product_count, 4) * 10)
    + (least(v_store_count, 3) * 8)
    + (least(v_repair_count, 3) * 8)
    + (least(v_listing_count, 3) * 8)
    + CASE WHEN v_brand IS NOT NULL THEN 10 ELSE 0 END
    + CASE WHEN v_intent <> 'general' THEN 10 ELSE 0 END
  );
  v_noindex := v_quality < 70;
  v_sitemap := v_quality >= 70;
  v_slug := left(public.auto_search_slugify(v_intent || '-' || v_core), 90);
  v_intent_key := md5(v_intent || '|' || coalesce(v_brand, '') || '|' || v_core || '|' || coalesce(v_condition, '') || '|' || coalesce(v_storage, '') || '|' || coalesce(v_budget::text, ''));

  v_h1 := initcap(v_core) || CASE
    WHEN v_intent = 'price' THEN ' Price in Nepal'
    WHEN v_intent = 'repair' THEN ' Repair Services in Kathmandu'
    WHEN v_intent = 'used' THEN ' Used Phones in Nepal'
    WHEN v_intent = 'store' THEN ' Stores in Tamrakar Complex'
    WHEN v_intent = 'exchange' THEN ' Exchange Options in Nepal'
    WHEN v_intent = 'sell' THEN ' Valuation and Selling Options'
    ELSE ' at Tamrakar Complex'
  END;
  v_title := left(v_h1 || ' | Tamrakar Complex', 68);
  v_description := left('Find real TamrakarComplex.com matches for ' || v_raw || ': available products, stores, repair services, used listings, prices, and enquiry actions from current database data.', 155);
  v_intro := 'This page is generated from live TamrakarComplex.com search demand and current platform data. Prices, stock, services, and stores shown here come from available database records only.';
  v_faqs := jsonb_build_array(
    jsonb_build_object('question', 'Are the prices and stores on this page real?', 'answer', 'Yes. This page only displays prices, stores, listings, and service data that already exists in the TamrakarComplex.com database.'),
    jsonb_build_object('question', 'Why can a generated page be noindex?', 'answer', 'If the page does not have enough useful real data yet, TamrakarComplex.com keeps it out of search indexes until quality improves.'),
    jsonb_build_object('question', 'How often is this page refreshed?', 'answer', 'The page is marked for refresh when product price, stock, store, listing, or repair service data changes.')
  );
  v_social := jsonb_build_object(
    'facebook_title', v_title,
    'facebook_description', v_description,
    'share_text', 'Compare real Tamrakar Complex matches for ' || v_raw || '.'
  );
  v_structured := jsonb_build_array(
    jsonb_build_object(
      '@context', 'https://schema.org',
      '@type', 'BreadcrumbList',
      'itemListElement', jsonb_build_array(
        jsonb_build_object('@type', 'ListItem', 'position', 1, 'name', 'Home', 'item', 'https://tamrakarcomplex.com/'),
        jsonb_build_object('@type', 'ListItem', 'position', 2, 'name', v_h1, 'item', 'https://tamrakarcomplex.com/search/' || v_slug)
      )
    ),
    jsonb_build_object(
      '@context', 'https://schema.org',
      '@type', 'FAQPage',
      'mainEntity', (
        SELECT jsonb_agg(jsonb_build_object('@type', 'Question', 'name', item->>'question', 'acceptedAnswer', jsonb_build_object('@type', 'Answer', 'text', item->>'answer')))
        FROM jsonb_array_elements(v_faqs) AS item
      )
    )
  );

  INSERT INTO public.auto_search_pages (
    intent_key, slug, path, primary_query, normalized_query, normalized_parts, intent, quality_score,
    title, meta_description, h1, intro, sections, faqs, structured_data, social_share,
    og_image, canonical_url, robots_noindex, sitemap_enabled, status, needs_refresh, refresh_reason,
    content_refreshed_at
  )
  VALUES (
    v_intent_key,
    v_slug,
    '/search/' || v_slug,
    v_raw,
    v_query,
    jsonb_build_object('brand', v_brand, 'category', NULL, 'condition', v_condition, 'storage', v_storage, 'budget', v_budget, 'intent', v_intent),
    v_intent,
    v_quality,
    v_title,
    v_description,
    v_h1,
    v_intro,
    v_sections,
    v_faqs,
    v_structured,
    v_social,
    '/functions/v1/auto-search-og?slug=' || v_slug,
    'https://tamrakarcomplex.com/search/' || v_slug,
    v_noindex,
    v_sitemap,
    'active',
    false,
    NULL,
    now()
  )
  ON CONFLICT (intent_key) DO UPDATE
  SET
    primary_query = EXCLUDED.primary_query,
    normalized_query = EXCLUDED.normalized_query,
    normalized_parts = EXCLUDED.normalized_parts,
    quality_score = EXCLUDED.quality_score,
    title = EXCLUDED.title,
    meta_description = EXCLUDED.meta_description,
    h1 = EXCLUDED.h1,
    intro = EXCLUDED.intro,
    sections = EXCLUDED.sections,
    faqs = EXCLUDED.faqs,
    structured_data = EXCLUDED.structured_data,
    social_share = EXCLUDED.social_share,
    robots_noindex = EXCLUDED.robots_noindex,
    sitemap_enabled = EXCLUDED.sitemap_enabled,
    status = 'active',
    needs_refresh = false,
    refresh_reason = NULL,
    content_refreshed_at = now(),
    updated_at = now()
  RETURNING id INTO v_page_id;

  INSERT INTO public.seo_pages(path, route_key, title, description, keywords, og_image, canonical_url, structured_data, noindex, is_active)
  VALUES (
    '/search/' || v_slug,
    '/search/:slug',
    v_title,
    v_description,
    ARRAY[v_raw, v_intent || ' Nepal', 'Tamrakar Complex'],
    '/functions/v1/auto-search-og?slug=' || v_slug,
    'https://tamrakarcomplex.com/search/' || v_slug,
    v_structured,
    v_noindex,
    true
  )
  ON CONFLICT (path) DO UPDATE
  SET title = EXCLUDED.title,
      description = EXCLUDED.description,
      keywords = EXCLUDED.keywords,
      og_image = EXCLUDED.og_image,
      canonical_url = EXCLUDED.canonical_url,
      structured_data = EXCLUDED.structured_data,
      noindex = EXCLUDED.noindex,
      is_active = true,
      updated_at = now();

  INSERT INTO public.search_logs(
    raw_query, normalized_query, normalized_parts, intent, source_path, session_id,
    matched_products_count, matched_stores_count, matched_repairs_count, matched_listings_count, auto_page_id
  )
  VALUES (
    v_raw,
    v_query,
    jsonb_build_object('brand', v_brand, 'category', NULL, 'condition', v_condition, 'storage', v_storage, 'budget', v_budget, 'intent', v_intent),
    v_intent,
    p_source_path,
    p_session_id,
    v_product_count,
    v_store_count,
    v_repair_count,
    v_listing_count,
    v_page_id
  );

  RETURN jsonb_build_object(
    'created', true,
    'page_id', v_page_id,
    'path', '/search/' || v_slug,
    'slug', v_slug,
    'quality_score', v_quality,
    'noindex', v_noindex,
    'sitemap_enabled', v_sitemap,
    'matched_counts', jsonb_build_object('products', v_product_count, 'stores', v_store_count, 'repairs', v_repair_count, 'listings', v_listing_count)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_auto_search_pages_for_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed_text text;
BEGIN
  v_changed_text := coalesce(
    to_jsonb(NEW)->>'name',
    to_jsonb(NEW)->>'title',
    to_jsonb(NEW)->>'model',
    to_jsonb(NEW)->>'brand',
    to_jsonb(NEW)->>'device_brand',
    ''
  );

  UPDATE public.auto_search_pages
  SET needs_refresh = true,
      refresh_reason = TG_TABLE_NAME || ' changed',
      updated_at = now()
  WHERE status = 'active'
    AND (
      v_changed_text <> ''
      AND (
        lower(primary_query) LIKE '%' || lower(v_changed_text) || '%'
        OR lower(normalized_query) LIKE '%' || lower(v_changed_text) || '%'
      )
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_search_refresh_catalog_products ON public.catalog_products;
CREATE TRIGGER trg_auto_search_refresh_catalog_products
AFTER INSERT OR UPDATE OF name, price_npr, price_text, is_active, updated_at ON public.catalog_products
FOR EACH ROW EXECUTE FUNCTION public.mark_auto_search_pages_for_refresh();

DROP TRIGGER IF EXISTS trg_auto_search_refresh_stores ON public.stores;
CREATE TRIGGER trg_auto_search_refresh_stores
AFTER INSERT OR UPDATE OF name, location, services, updated_at ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.mark_auto_search_pages_for_refresh();

DROP TRIGGER IF EXISTS trg_auto_search_refresh_repair_services ON public.repair_services;
CREATE TRIGGER trg_auto_search_refresh_repair_services
AFTER INSERT OR UPDATE OF title, estimated_price, is_active, updated_at ON public.repair_services
FOR EACH ROW EXECUTE FUNCTION public.mark_auto_search_pages_for_refresh();

DROP TRIGGER IF EXISTS trg_auto_search_refresh_sell_listings ON public.sell_listings;
CREATE TRIGGER trg_auto_search_refresh_sell_listings
AFTER INSERT OR UPDATE OF title, price, status, updated_at ON public.sell_listings
FOR EACH ROW EXECUTE FUNCTION public.mark_auto_search_pages_for_refresh();

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
      coalesce(p.updated_at, p.created_at, now()) AS lastmod,
      'weekly'::text AS changefreq,
      CASE WHEN coalesce(p.is_active, true) IS TRUE THEN 0.8 ELSE 0.5 END::numeric AS priority,
      'product'::text AS source_type
    FROM public.catalog_products p
    WHERE p.slug IS NOT NULL
      AND p.slug <> ''
      AND coalesce(p.is_active, true) IS TRUE
  ),
  store_urls AS (
    SELECT 'https://tamrakarcomplex.com/stores/' || coalesce(nullif(s.slug, ''), s.id::text) AS loc,
      coalesce(s.updated_at, s.created_at, now()) AS lastmod,
      'weekly'::text AS changefreq,
      CASE WHEN coalesce(s.subscription_status, '') = 'active' THEN 0.8 ELSE 0.5 END::numeric AS priority,
      'store'::text AS source_type
    FROM public.stores s
    WHERE coalesce(s.is_verified, false) IS TRUE OR coalesce(s.subscription_status, '') = 'active'
  ),
  device_urls AS (
    SELECT 'https://tamrakarcomplex.com/repair/device/' || d.slug AS loc,
      coalesce(d.updated_at, d.created_at, now()) AS lastmod,
      'monthly'::text AS changefreq,
      0.7::numeric AS priority,
      'repair_device'::text AS source_type
    FROM public.repair_devices d
    WHERE d.slug IS NOT NULL AND d.slug <> ''
  ),
  guide_urls AS (
    SELECT 'https://tamrakarcomplex.com/repair/guide/' || g.slug AS loc,
      coalesce(g.updated_at, g.created_at, now()) AS lastmod,
      'monthly'::text AS changefreq,
      0.7::numeric AS priority,
      'repair_guide'::text AS source_type
    FROM public.repair_guides g
    WHERE g.slug IS NOT NULL AND g.slug <> ''
      AND coalesce(g.published, true) IS TRUE
  ),
  listing_urls AS (
    SELECT 'https://tamrakarcomplex.com/marketplace/listing/' || l.id::text AS loc,
      coalesce(l.updated_at, l.created_at, now()) AS lastmod,
      'daily'::text AS changefreq,
      0.6::numeric AS priority,
      'marketplace_listing'::text AS source_type
    FROM public.sell_listings l
    WHERE l.status = 'active'
  ),
  article_urls AS (
    SELECT 'https://tamrakarcomplex.com/article/' || a.slug AS loc,
      coalesce(a.updated_at, a.created_at, now()) AS lastmod,
      'weekly'::text AS changefreq,
      CASE WHEN a.featured IS TRUE THEN 0.8 ELSE 0.6 END::numeric AS priority,
      'article'::text AS source_type
    FROM public.articles a
    WHERE a.slug IS NOT NULL AND a.slug <> ''
      AND coalesce(a.published, true) IS TRUE
  ),
  auto_search_urls AS (
    SELECT 'https://tamrakarcomplex.com/search/' || p.slug AS loc,
      coalesce(p.content_refreshed_at, p.updated_at, p.created_at, now()) AS lastmod,
      'daily'::text AS changefreq,
      CASE WHEN p.quality_score >= 85 THEN 0.75 ELSE 0.6 END::numeric AS priority,
      'auto_search_page'::text AS source_type
    FROM public.auto_search_pages p
    WHERE p.status = 'active'
      AND p.sitemap_enabled IS TRUE
      AND p.robots_noindex IS FALSE
      AND p.quality_score >= 70
  )
  SELECT * FROM base
  UNION ALL SELECT * FROM product_urls
  UNION ALL SELECT * FROM store_urls
  UNION ALL SELECT * FROM device_urls
  UNION ALL SELECT * FROM guide_urls
  UNION ALL SELECT * FROM listing_urls
  UNION ALL SELECT * FROM article_urls
  UNION ALL SELECT * FROM auto_search_urls
  ORDER BY priority DESC, loc ASC;
$$;

GRANT EXECUTE ON FUNCTION public.log_search_and_build_auto_page(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_auto_search_page_event(uuid, text, jsonb) TO anon, authenticated;
