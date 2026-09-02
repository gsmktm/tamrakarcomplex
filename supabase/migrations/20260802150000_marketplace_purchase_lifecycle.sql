-- Marketplace commerce bridge: store_products -> cart -> orders -> per-store fulfillment.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS store_product_id uuid REFERENCES public.store_products(id),
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id),
  ADD COLUMN IF NOT EXISTS unit_price numeric,
  ADD COLUMN IF NOT EXISTS total_price numeric,
  ADD COLUMN IF NOT EXISTS product_sku text,
  ADD COLUMN IF NOT EXISTS catalog_product_id uuid,
  ADD COLUMN IF NOT EXISTS store_inventory_id uuid;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_released_at timestamptz;

UPDATE public.order_items SET
  source_type = CASE WHEN store_product_id IS NOT NULL THEN 'store_product' ELSE 'product' END,
  unit_price = COALESCE(unit_price, price),
  total_price = COALESCE(total_price, price * quantity)
WHERE unit_price IS NULL OR total_price IS NULL;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_source_type_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_source_type_check
  CHECK (source_type IN ('product','store_product','catalog_product'));
CREATE INDEX IF NOT EXISTS idx_order_items_store_product ON public.order_items(store_product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store_order ON public.order_items(store_id, order_id);

CREATE TABLE IF NOT EXISTS public.store_order_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','packed','shipped','delivered','cancelled')),
  tracking_reference text,
  notes text,
  confirmed_at timestamptz,
  packed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, store_id)
);

INSERT INTO public.store_order_fulfillments(order_id, store_id, status)
SELECT DISTINCT oi.order_id, oi.store_id,
  CASE WHEN o.order_status IN ('confirmed','processing','packed','shipped','delivered','cancelled') THEN o.order_status ELSE 'pending' END
FROM public.order_items oi JOIN public.orders o ON o.id=oi.order_id
WHERE oi.store_id IS NOT NULL
ON CONFLICT (order_id,store_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_store_order_fulfillment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.store_id IS NOT NULL THEN
    INSERT INTO public.store_order_fulfillments(order_id,store_id,status)
    VALUES(NEW.order_id,NEW.store_id,'pending') ON CONFLICT(order_id,store_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_ensure_store_order_fulfillment ON public.order_items;
CREATE TRIGGER trg_ensure_store_order_fulfillment AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.ensure_store_order_fulfillment();

CREATE OR REPLACE FUNCTION public.release_cancelled_order_inventory()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_item record;
BEGIN
  IF NEW.inventory_released_at IS NULL AND (
    NEW.order_status='cancelled' OR NEW.payment_status IN ('failed','refunded')
  ) THEN
    FOR v_item IN SELECT store_product_id, sum(quantity)::integer qty FROM public.order_items
      WHERE order_id=NEW.id AND store_product_id IS NOT NULL GROUP BY store_product_id
    LOOP
      UPDATE public.store_products SET
        stock_quantity=COALESCE(stock_quantity,0)+v_item.qty,
        stock=COALESCE(stock,stock_quantity,0)+v_item.qty,
        updated_at=now()
      WHERE id=v_item.store_product_id;
    END LOOP;
    NEW.inventory_released_at=now();
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_release_cancelled_order_inventory ON public.orders;
CREATE TRIGGER trg_release_cancelled_order_inventory BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.release_cancelled_order_inventory();

ALTER TABLE public.store_order_fulfillments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers view order fulfillments" ON public.store_order_fulfillments;
CREATE POLICY "Customers view order fulfillments" ON public.store_order_fulfillments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.user_id=auth.uid()));
DROP POLICY IF EXISTS "Store admins view own fulfillments" ON public.store_order_fulfillments;
CREATE POLICY "Store admins view own fulfillments" ON public.store_order_fulfillments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND
  (s.owner_id=auth.uid() OR s.owner_user_id=auth.uid() OR EXISTS
    (SELECT 1 FROM public.store_admins sa WHERE sa.store_id=s.id AND sa.user_id=auth.uid() AND sa.status='active'))));
DROP POLICY IF EXISTS "Store admins update own fulfillments" ON public.store_order_fulfillments;
CREATE POLICY "Store admins update own fulfillments" ON public.store_order_fulfillments FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND
  (s.owner_id=auth.uid() OR s.owner_user_id=auth.uid() OR EXISTS
    (SELECT 1 FROM public.store_admins sa WHERE sa.store_id=s.id AND sa.user_id=auth.uid() AND sa.status='active'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND
  (s.owner_id=auth.uid() OR s.owner_user_id=auth.uid() OR EXISTS
    (SELECT 1 FROM public.store_admins sa WHERE sa.store_id=s.id AND sa.user_id=auth.uid() AND sa.status='active'))));
DROP POLICY IF EXISTS "Admins manage fulfillments" ON public.store_order_fulfillments;
CREATE POLICY "Admins manage fulfillments" ON public.store_order_fulfillments FOR ALL TO authenticated
USING (public.is_super_admin() OR public.has_role(auth.uid(),'staffadmin'))
WITH CHECK (public.is_super_admin() OR public.has_role(auth.uid(),'staffadmin'));

COMMENT ON TABLE public.store_order_fulfillments IS
  'Per-store fulfillment state for multi-store orders; payment remains order-level.';
