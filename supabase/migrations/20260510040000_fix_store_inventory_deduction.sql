-- Fix: Inventory Deduction on Order Creation
-- 
-- PROBLEM: The old trigger (20260506020000) tried to deduct from inventory_items table,
-- but actual store inventory is in store_products(stock_quantity).
-- This trigger properly deducts from store_products when an order_item is created.
--
-- SCHEMA:
--   order_items has: store_id, product_id, quantity
--   store_products has: id, store_id, stock_quantity
--   Need to join: order_items.store_id & product_id → store_products

-- 1. Create function to deduct store inventory on order
CREATE OR REPLACE FUNCTION public.deduct_store_inventory_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id uuid;
  v_quantity integer;
  v_store_id uuid;
BEGIN
  -- Extract values from order_item
  v_product_id := NEW.product_id;
  v_quantity := NEW.quantity;
  v_store_id := NEW.store_id;

  -- Deduct from store_products (actual store inventory)
  -- Only if product is linked to a store via order_item.store_id
  IF v_store_id IS NOT NULL THEN
    UPDATE public.store_products
    SET stock_quantity = GREATEST(0, stock_quantity - v_quantity),
        updated_at = now()
    WHERE store_id = v_store_id
      AND id = (
        -- Find the store_product that corresponds to this order item
        -- Match by catalog_product_id if available
        SELECT store_products.id FROM public.store_products
        WHERE store_products.store_id = v_store_id
          AND (
            -- Try to match via catalog_product_id first (if order_items has it)
            (NEW.catalog_product_id IS NOT NULL 
             AND store_products.catalog_product_id = NEW.catalog_product_id)
            -- Fallback: match via product data
            OR store_products.id = v_product_id
          )
        LIMIT 1
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create trigger for order_items INSERT
DROP TRIGGER IF EXISTS trg_deduct_store_inventory_on_order ON public.order_items;
CREATE TRIGGER trg_deduct_store_inventory_on_order
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.deduct_store_inventory_on_order();

-- 3. Also handle order cancellation (restore inventory)
CREATE OR REPLACE FUNCTION public.restore_store_inventory_on_order_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Restore inventory if order_item is deleted (order cancelled)
  IF TG_OP = 'DELETE' THEN
    IF OLD.store_id IS NOT NULL THEN
      UPDATE public.store_products
      SET stock_quantity = stock_quantity + OLD.quantity,
          updated_at = now()
      WHERE store_id = OLD.store_id
        AND id = (
          SELECT store_products.id FROM public.store_products
          WHERE store_products.store_id = OLD.store_id
            AND (
              (OLD.catalog_product_id IS NOT NULL 
               AND store_products.catalog_product_id = OLD.catalog_product_id)
              OR store_products.id = OLD.product_id
            )
          LIMIT 1
        );
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Trigger for order_items DELETE (restoration)
DROP TRIGGER IF EXISTS trg_restore_store_inventory_on_delete ON public.order_items;
CREATE TRIGGER trg_restore_store_inventory_on_delete
AFTER DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.restore_store_inventory_on_order_cancel();

-- 5. Add comment for documentation
COMMENT ON FUNCTION public.deduct_store_inventory_on_order()
IS 'Deducts stock from store_products when an order_item is created. Uses store_id and catalog_product_id matching.';

COMMENT ON FUNCTION public.restore_store_inventory_on_order_cancel()
IS 'Restores stock to store_products when an order_item is deleted (order cancelled).';
