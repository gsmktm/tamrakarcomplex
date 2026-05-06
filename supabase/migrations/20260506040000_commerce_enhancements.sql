-- ============================================================
-- COMMERCE ENHANCEMENTS: VARIANTS & CALCULATIONS
-- Adds support for variants and total calculations in orders.
-- ============================================================

-- 1. Update order_items to support variants
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS total numeric GENERATED ALWAYS AS (price * quantity) STORED;

-- 2. Update cart_items to support variants
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE;

-- 3. Trigger to calculate order total_amount automatically
CREATE OR REPLACE FUNCTION public.update_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.orders
  SET total_amount = (SELECT COALESCE(SUM(total), 0) FROM public.order_items WHERE order_id = COALESCE(NEW.order_id, OLD.order_id))
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_order_total ON public.order_items;
CREATE TRIGGER trg_update_order_total
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

-- 4. RPC to complete checkout from cart
-- This is a critical missing "full stack" function
CREATE OR REPLACE FUNCTION public.complete_checkout(
  p_user_id uuid,
  p_cart_id uuid,
  p_payment_method text,
  p_shipping_address jsonb,
  p_contact_info jsonb
) RETURNS uuid AS $$
DECLARE
  v_order_id uuid;
  v_item record;
BEGIN
  -- 1. Create Order
  INSERT INTO public.orders (user_id, payment_method, shipping_address, contact_info, total_amount)
  VALUES (p_user_id, p_payment_method, p_shipping_address, p_contact_info, 0)
  RETURNING id INTO v_order_id;

  -- 2. Move items from cart to order
  FOR v_item IN (SELECT * FROM public.cart_items WHERE cart_id = p_cart_id) LOOP
    INSERT INTO public.order_items (order_id, product_id, variant_id, quantity, price, product_name)
    SELECT 
      v_order_id, 
      v_item.product_id, 
      v_item.variant_id, 
      v_item.quantity, 
      COALESCE((SELECT price FROM public.product_variants WHERE id = v_item.variant_id), (SELECT price FROM public.products WHERE id = v_item.product_id)),
      (SELECT name FROM public.products WHERE id = v_item.product_id);
  END LOOP;

  -- 3. Clear cart
  DELETE FROM public.cart_items WHERE cart_id = p_cart_id;
  
  -- 4. Return order ID
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
