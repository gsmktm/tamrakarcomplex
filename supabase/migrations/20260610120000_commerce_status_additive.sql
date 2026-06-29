-- ============================================================================
-- Commerce hardening — ADDITIVE status vocabulary + mandatory store_id + payouts
-- 2026-06-10. Safe/reversible: superset CHECKs (old values stay valid),
-- non-destructive backfills, guarded NOT NULL. No data loss.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. orders.order_status — ensure column exists, then expand CHECK constraint
--    Old values remain valid -> existing rows untouched.
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_status text DEFAULT 'pending'
    CHECK (order_status IN ('pending','confirmed','processing','shipped','delivered','completed','cancelled','refunded'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN (
    'pending', 'pending_payment', 'paid', 'confirmed', 'processing',
    'packed', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'
  ));

-- payment_status already pending/paid/failed/refunded — leave as is.

-- ---------------------------------------------------------------------------
-- 2. store_payouts.status — add payable, disputed (keep existing values)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='store_payouts'
  ) THEN
    ALTER TABLE public.store_payouts DROP CONSTRAINT IF EXISTS store_payouts_status_check;
    ALTER TABLE public.store_payouts
      ADD CONSTRAINT store_payouts_status_check
      CHECK (status IN (
        'pending', 'payable', 'processing', 'paid', 'disputed', 'failed', 'cancelled'
      ));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Non-destructive backfill: brand-new unpaid orders -> 'pending_payment'
--    (only touches rows still in the ambiguous legacy 'pending' state).
-- ---------------------------------------------------------------------------
UPDATE public.orders
   SET order_status = 'pending_payment'
 WHERE order_status = 'pending'
   AND payment_status = 'pending';

-- ---------------------------------------------------------------------------
-- 4. store_id mandatory for sellable products.
--    a) ensure a platform "house" store exists to absorb legacy null-store rows
--    b) backfill products.store_id
--    c) SET NOT NULL only if zero nulls remain (guarded — never fails hard)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_house_store uuid;
  v_remaining   bigint;
BEGIN
  -- Only run if products table has a store_id column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'store_id'
  ) THEN
    -- a) find or create the house store
    SELECT id INTO v_house_store FROM public.stores
      WHERE slug = 'tamrakar-complex-house' LIMIT 1;

    IF v_house_store IS NULL THEN
      INSERT INTO public.stores (name, slug, status)
      VALUES ('Tamrakar Complex', 'tamrakar-complex-house', 'active')
      ON CONFLICT (slug) DO NOTHING
      RETURNING id INTO v_house_store;

      IF v_house_store IS NULL THEN
        SELECT id INTO v_house_store FROM public.stores
          WHERE slug = 'tamrakar-complex-house' LIMIT 1;
      END IF;
    END IF;

    -- b) backfill
    IF v_house_store IS NOT NULL THEN
      UPDATE public.products
         SET store_id = v_house_store
       WHERE store_id IS NULL;
    END IF;

    -- c) guarded NOT NULL
    SELECT count(*) INTO v_remaining FROM public.products WHERE store_id IS NULL;
    IF v_remaining = 0 THEN
      BEGIN
        ALTER TABLE public.products ALTER COLUMN store_id SET NOT NULL;
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not set products.store_id NOT NULL: %', SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'Skipped products.store_id NOT NULL — % rows still null', v_remaining;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Payout aggregation: roll store_commissions -> one store_payouts row per
--    (order, store). Idempotent. Called after commissions are created.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_payouts(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  FOR v_row IN
    SELECT store_id,
           SUM(store_earning)   AS net_amount,
           SUM(commission_amount) AS commission_total,
           SUM(gross_amount)    AS gross_total
      FROM public.store_commissions
     WHERE order_id = p_order_id
     GROUP BY store_id
  LOOP
    -- one payout row per (order, store); upsert keeps it idempotent
    INSERT INTO public.store_payouts (order_id, store_id, amount, status)
    VALUES (p_order_id, v_row.store_id, v_row.net_amount, 'pending')
    ON CONFLICT (order_id, store_id) DO UPDATE
      SET amount = EXCLUDED.amount;
  END LOOP;
END;
$$;

-- Ensure the upsert target exists (unique per order+store). Guard if rows dupe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='store_payouts' AND column_name='order_id'
  ) THEN
    BEGIN
      ALTER TABLE public.store_payouts
        ADD CONSTRAINT store_payouts_order_store_uniq UNIQUE (order_id, store_id);
    EXCEPTION WHEN duplicate_table THEN NULL;
              WHEN duplicate_object THEN NULL;
              WHEN unique_violation THEN
                RAISE NOTICE 'store_payouts has duplicate (order_id,store_id) rows; dedupe before adding unique constraint';
              WHEN others THEN
                RAISE NOTICE 'store_payouts unique add skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Transition helper: when an order is delivered, its payouts become payable.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_payouts_payable_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_status = 'delivered' AND OLD.order_status IS DISTINCT FROM 'delivered' THEN
    UPDATE public.store_payouts
       SET status = 'payable'
     WHERE order_id = NEW.id
       AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payouts_payable_on_delivery ON public.orders;
CREATE TRIGGER trg_payouts_payable_on_delivery
  AFTER UPDATE OF order_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_payouts_payable_on_delivery();

COMMIT;
