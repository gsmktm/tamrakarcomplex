-- Migration: Atomic order creation via a single DB function.
-- Replaces the two-step (insert order, then insert items) pattern in Checkout.tsx
-- so that a failed item insert rolls back the order row automatically.

CREATE OR REPLACE FUNCTION public.create_order(
  p_user_id        uuid,
  p_total_amount   numeric,
  p_payment_method text,
  p_shipping_address jsonb,
  p_contact_info   jsonb,
  p_items          jsonb   -- [{ product_id, quantity, price, product_name }]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  -- Insert the parent order row
  INSERT INTO public.orders (
    user_id,
    total_amount,
    payment_method,
    status,
    payment_status,
    shipping_address,
    contact_info
  )
  VALUES (
    p_user_id,
    p_total_amount,
    p_payment_method,
    'pending',
    'pending',
    p_shipping_address,
    p_contact_info
  )
  RETURNING id INTO v_order_id;

  -- Insert all line items in one statement
  INSERT INTO public.order_items (
    order_id,
    product_id,
    quantity,
    price,
    product_name
  )
  SELECT
    v_order_id,
    (item ->> 'product_id')::uuid,
    (item ->> 'quantity')::int,
    (item ->> 'price')::numeric,
    item ->> 'product_name'
  FROM jsonb_array_elements(p_items) AS item;

  RETURN v_order_id;
END;
$$;

-- Grant execute to authenticated users so they can call it via supabase.rpc()
GRANT EXECUTE ON FUNCTION public.create_order(uuid, numeric, text, jsonb, jsonb, jsonb)
  TO authenticated;
