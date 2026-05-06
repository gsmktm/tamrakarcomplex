CREATE OR REPLACE FUNCTION public.normalize_price_value(p_price text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p_price, ''), '[^0-9]', '', 'g'), '')::integer
$$;

CREATE OR REPLACE FUNCTION public.set_product_price_value()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.price_value := public.normalize_price_value(NEW.price);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_products_price_value ON public.products;
CREATE TRIGGER set_products_price_value
BEFORE INSERT OR UPDATE OF price ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_product_price_value();

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_price_value ON public.products(price_value);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage articles" ON public.articles;
CREATE POLICY "Admins can manage articles"
ON public.articles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
