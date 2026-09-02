-- Product SEO eligibility is enforced at the data boundary so edits, imports,
-- bulk actions, and API writes all behave consistently.
CREATE OR REPLACE FUNCTION public.product_is_seo_eligible(product public.products)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    product.in_stock IS true
    AND COALESCE(btrim(product.name), '') <> ''
    AND COALESCE(btrim(product.slug), '') <> ''
    AND COALESCE(btrim(product.description), '') <> ''
    AND COALESCE(btrim(product.image), '') <> ''
    AND COALESCE(btrim(product.brand), '') <> ''
    AND COALESCE(btrim(product.category), '') <> ''
    AND COALESCE(product.price_value, 0) > 0;
$$;

-- A product cannot be advertised as available until all Merchant/SEO identity
-- fields are complete. Editors can save drafts; they simply remain out of stock.
CREATE OR REPLACE FUNCTION public.enforce_product_publish_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.in_stock IS true AND NOT public.product_is_seo_eligible(NEW) THEN
    NEW.in_stock := false;
    NEW.featured := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_enforce_publish_eligibility ON public.products;
CREATE TRIGGER products_enforce_publish_eligibility
BEFORE INSERT OR UPDATE OF
  name, slug, description, image, brand, category, price_value, in_stock
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.enforce_product_publish_eligibility();

CREATE OR REPLACE FUNCTION public.sync_product_exact_path_seo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_path text;
  new_path text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND COALESCE(btrim(OLD.slug), '') <> '' THEN
    old_path := '/product/' || OLD.slug;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.seo_pages
    SET noindex = true, is_active = true, updated_at = now()
    WHERE path = old_path;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
     AND old_path IS NOT NULL
     AND old_path <> '/product/' || COALESCE(NEW.slug, '') THEN
    UPDATE public.seo_pages
    SET noindex = true, is_active = true, updated_at = now()
    WHERE path = old_path;
  END IF;

  IF COALESCE(btrim(NEW.slug), '') = '' THEN
    RETURN NEW;
  END IF;

  new_path := '/product/' || NEW.slug;

  IF public.product_is_seo_eligible(NEW) THEN
    INSERT INTO public.seo_pages (
      route_key, path, title, description, keywords, og_image,
      noindex, is_active, updated_at
    )
    VALUES (
      '/product/:slug',
      new_path,
      left(NEW.name || ' Price in Nepal', 70),
      left(NEW.description, 180),
      ARRAY[
        NEW.name || ' price in Nepal',
        NEW.brand || ' price in Nepal',
        NEW.category
      ],
      NEW.image,
      false,
      true,
      now()
    )
    ON CONFLICT (path) DO UPDATE SET
      -- Preserve manually authored SEO fields and only restore eligibility.
      noindex = false,
      is_active = true,
      updated_at = now();
  ELSE
    UPDATE public.seo_pages
    SET noindex = true, is_active = true, updated_at = now()
    WHERE path = new_path;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_sync_exact_path_seo ON public.products;
CREATE TRIGGER products_sync_exact_path_seo
AFTER INSERT OR UPDATE OF
  name, slug, description, image, brand, category, price_value, in_stock
OR DELETE
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_exact_path_seo();

-- Reconcile existing eligible records immediately. Manual SEO text is kept.
INSERT INTO public.seo_pages (
  route_key, path, title, description, keywords, og_image,
  noindex, is_active, updated_at
)
SELECT
  '/product/:slug',
  '/product/' || product.slug,
  left(product.name || ' Price in Nepal', 70),
  left(product.description, 180),
  ARRAY[
    product.name || ' price in Nepal',
    product.brand || ' price in Nepal',
    product.category
  ],
  product.image,
  false,
  true,
  now()
FROM public.products product
WHERE public.product_is_seo_eligible(product)
ON CONFLICT (path) DO UPDATE SET
  noindex = false,
  is_active = true,
  updated_at = now();
