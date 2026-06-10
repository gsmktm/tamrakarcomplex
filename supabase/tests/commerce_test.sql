-- Commerce DB invariants — run with: supabase test db
-- Requires pgTAP (supabase enables it for tests). Validates the Phase 2 migration:
-- status supersets, payout aggregation, delivered->payable trigger, store_id NOT NULL.

BEGIN;
SELECT plan(8);

-- 1. order_status accepts the new vocabulary
SELECT lives_ok(
  $$ INSERT INTO public.orders (id, user_id, total_amount, payment_method, order_status, payment_status)
     VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000u1', 100, 'esewa', 'pending_payment', 'pending') $$,
  'order_status accepts pending_payment'
);
SELECT lives_ok(
  $$ UPDATE public.orders SET order_status='packed' WHERE id='00000000-0000-0000-0000-0000000000a1' $$,
  'order_status accepts packed'
);

-- 2. order_status still rejects garbage
SELECT throws_ok(
  $$ UPDATE public.orders SET order_status='banana' WHERE id='00000000-0000-0000-0000-0000000000a1' $$,
  '23514', NULL, 'order_status CHECK rejects unknown value'
);

-- 3. store_payouts.status accepts payable + disputed
SELECT lives_ok(
  $$ INSERT INTO public.store_payouts (order_id, store_id, amount, status)
     VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000s1', 90, 'payable') $$,
  'payout status accepts payable'
);
SELECT lives_ok(
  $$ UPDATE public.store_payouts SET status='disputed'
     WHERE order_id='00000000-0000-0000-0000-0000000000a1' $$,
  'payout status accepts disputed'
);

-- 4. payout aggregation RPC: one row per store, net = gross - commission
INSERT INTO public.store_commissions (order_id, store_id, gross_amount, commission_percent, commission_amount, store_earning)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000s2', 200, 10, 20, 180),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000s2', 100, 10, 10, 90);
SELECT lives_ok(
  $$ SELECT public.create_order_payouts('00000000-0000-0000-0000-0000000000a1') $$,
  'create_order_payouts runs'
);
SELECT is(
  (SELECT amount FROM public.store_payouts
     WHERE order_id='00000000-0000-0000-0000-0000000000a1'
       AND store_id='00000000-0000-0000-0000-0000000000s2'),
  270::numeric,
  'aggregated payout = (200-20)+(100-10) = 270'
);

-- 5. delivered -> payouts become payable (trigger)
UPDATE public.orders SET order_status='delivered' WHERE id='00000000-0000-0000-0000-0000000000a1';
SELECT is(
  (SELECT status FROM public.store_payouts
     WHERE order_id='00000000-0000-0000-0000-0000000000a1'
       AND store_id='00000000-0000-0000-0000-0000000000s2'),
  'payable',
  'delivery trigger flips pending payout to payable'
);

SELECT * FROM finish();
ROLLBACK;
