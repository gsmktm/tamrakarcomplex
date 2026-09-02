-- Production hardening for the settlement chain.
-- Defense in depth for double-settlement: verify-payment already guards with
-- rows-affected checks, and store_commissions has UNIQUE(order_id, store_id),
-- but create_order_commissions INSERTs without conflict handling — a second
-- call for the same order raises a unique-violation that surfaces as
-- "Payment captured but commission calculation failed". Make both settlement
-- RPCs idempotent so replays are harmless no-ops.

CREATE OR REPLACE FUNCTION public.create_order_commissions(p_order_id uuid) RETURNS void AS $$
DECLARE
  v_order record;
  v_item record;
  v_store_amount decimal := 0;
  v_commission_amount decimal := 0;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;

  -- Process each order item
  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.store_id IS NOT NULL THEN
      -- Calculate commission for this store
      v_store_amount := v_item.total_price;
      v_commission_amount := public.calculate_store_commission(v_item.store_id, v_store_amount);

      -- Insert commission record (idempotent: replayed settlement is a no-op)
      INSERT INTO public.store_commissions (
        order_id,
        store_id,
        gross_amount,
        commission_percent,
        commission_amount,
        store_earning
      ) VALUES (
        p_order_id,
        v_item.store_id,
        v_store_amount,
        (v_commission_amount / v_store_amount * 100),
        v_commission_amount,
        v_store_amount - v_commission_amount
      ) ON CONFLICT (order_id, store_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Align commission materialization with payout materialization: both are
-- called by the service role (verify-payment) after a verified settlement.
-- Authenticated clients have no legitimate reason to write commission rows.
REVOKE ALL ON FUNCTION public.create_order_commissions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_commissions(uuid) TO service_role;
COMMENT ON FUNCTION public.create_order_commissions(uuid) IS
  'Service-role-only commission materialization called after verified payment.';
