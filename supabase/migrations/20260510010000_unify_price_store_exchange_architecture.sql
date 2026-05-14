-- Unify official prices, store products, marketplace output, and exchange routing.

ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.device_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.device_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS official_price numeric,
  ADD COLUMN IF NOT EXISTS market_price numeric,
  ADD COLUMN IF NOT EXISTS is_price_list_item boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS price_source text NOT NULL DEFAULT 'manual';

UPDATE public.catalog_products
SET
  official_price = COALESCE(official_price, price_npr),
  market_price = COALESCE(market_price, price_npr)
WHERE official_price IS NULL OR market_price IS NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_products_price_list
  ON public.catalog_products(is_price_list_item, verified, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_products_price_source
  ON public.catalog_products(price_source);

ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS catalog_product_id uuid REFERENCES public.catalog_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS stock integer,
  ADD COLUMN IF NOT EXISTS price_sale numeric,
  ADD COLUMN IF NOT EXISTS price_mrp numeric;

UPDATE public.store_products
SET
  stock = COALESCE(stock, stock_quantity),
  price_sale = COALESCE(price_sale, discount_price, price),
  price_mrp = COALESCE(price_mrp, price)
WHERE stock IS NULL OR price_sale IS NULL OR price_mrp IS NULL;

CREATE INDEX IF NOT EXISTS idx_store_products_catalog_product_id
  ON public.store_products(catalog_product_id);
CREATE INDEX IF NOT EXISTS idx_store_products_public_marketplace
  ON public.store_products(status, store_id, created_at DESC);

ALTER TABLE public.exchange_requests
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_email text;

CREATE INDEX IF NOT EXISTS idx_exchange_requests_store_id
  ON public.exchange_requests(store_id, created_at DESC);

ALTER TABLE public.store_exchange_requests
  ALTER COLUMN store_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_exchange_requests_store_id
  ON public.store_exchange_requests(store_id, created_at DESC);

DROP VIEW IF EXISTS public.public_marketplace_items;
CREATE VIEW public.public_marketplace_items AS
SELECT
  'store_product'::text AS source_type,
  sp.id,
  sp.store_id,
  s.name AS store_name,
  sp.catalog_product_id,
  COALESCE(sp.discount_price, sp.price_sale, sp.price)::numeric AS price,
  COALESCE(sp.stock_quantity, sp.stock, 0)::integer AS stock,
  sp.status,
  sp.created_by,
  sp.created_at,
  sp.updated_at,
  sp.title,
  sp.brand,
  sp.model,
  NULL::text AS description,
  s.location,
  CASE
    WHEN sp.product_type IN ('new_phone', 'used_phone', 'phone') THEN 'mobile'
    ELSE sp.product_type
  END AS category,
  sp.condition,
  sp.images
FROM public.store_products sp
LEFT JOIN public.stores s ON s.id = sp.store_id
WHERE sp.status = 'active'
  AND COALESCE(sp.stock_quantity, sp.stock, 0) > 0
UNION ALL
SELECT
  'user_listing'::text AS source_type,
  sl.id,
  sl.store_id,
  s.name AS store_name,
  sl.catalog_product_id,
  sl.price::numeric AS price,
  1::integer AS stock,
  sl.status,
  sl.user_id AS created_by,
  sl.created_at,
  sl.updated_at,
  sl.title,
  sl.brand,
  sl.model,
  sl.description,
  sl.location,
  sl.listing_type AS category,
  sl.condition,
  to_jsonb(sl.images) AS images
FROM public.sell_listings sl
LEFT JOIN public.stores s ON s.id = sl.store_id
WHERE sl.status = 'active';

GRANT SELECT ON public.public_marketplace_items TO anon, authenticated;

DROP POLICY IF EXISTS "Public create exchange_requests" ON public.exchange_requests;
CREATE POLICY "Public create exchange_requests"
ON public.exchange_requests FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage exchange_requests" ON public.exchange_requests;
CREATE POLICY "Staff manage exchange_requests"
ON public.exchange_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('suadmin', 'staffadmin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('suadmin', 'staffadmin', 'admin')
  )
);

DROP POLICY IF EXISTS "Store admins read own exchange_requests" ON public.exchange_requests;
CREATE POLICY "Store admins read own exchange_requests"
ON public.exchange_requests FOR SELECT
USING (
  store_id IS NOT NULL
  AND public.store_os_can_manage_store(store_id)
);

DROP POLICY IF EXISTS "Platform staff manage official price list" ON public.catalog_products;
CREATE POLICY "Platform staff manage official price list"
ON public.catalog_products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('suadmin', 'staffadmin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('suadmin', 'staffadmin', 'admin')
  )
);

CREATE OR REPLACE FUNCTION public.notify_exchange_request_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.store_id IS NOT NULL THEN
    INSERT INTO public.notifications (role, store_id, type, title, message, link, metadata)
    VALUES (
      'storeadmin',
      NEW.store_id,
      'exchange',
      'New exchange request',
      concat(coalesce(NEW.customer_name, 'Customer'), ' submitted an exchange request.'),
      '/storeadmin/exchange',
      jsonb_build_object('exchange_request_id', NEW.id)
    );
  ELSE
    INSERT INTO public.notifications (role, type, title, message, link, metadata)
    VALUES (
      'staffadmin',
      'exchange',
      'New official exchange request',
      concat(coalesce(NEW.customer_name, 'Customer'), ' submitted an official exchange request.'),
      '/suadmin/exchange',
      jsonb_build_object('exchange_request_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exchange_request_notifications ON public.exchange_requests;
CREATE TRIGGER trg_exchange_request_notifications
AFTER INSERT ON public.exchange_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_exchange_request_created();
