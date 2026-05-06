-- Migration: Production-safe payment, commission, and payout system

-- 1. orders table (enhanced)
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  total_amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cod', 'esewa', 'khalti', 'fonepay', 'bank')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  order_status text DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded')),
  shipping_address jsonb DEFAULT '{}',
  contact_info jsonb DEFAULT '{}',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid, -- Legacy support
  catalog_product_id uuid REFERENCES public.catalog_products(id) ON DELETE SET NULL,
  store_inventory_id uuid REFERENCES public.store_inventory(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_sku text,
  quantity integer NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('esewa', 'khalti', 'fonepay', 'bank', 'cod')),
  provider_transaction_id text,
  amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  raw_response jsonb DEFAULT '{}',
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. store_commissions table
CREATE TABLE IF NOT EXISTS public.store_commissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  gross_amount decimal(10,2) NOT NULL,
  commission_percent decimal(5,2) NOT NULL,
  commission_amount decimal(10,2) NOT NULL,
  store_earning decimal(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'paid', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. store_payouts table
CREATE TABLE IF NOT EXISTS public.store_payouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  payout_method text CHECK (payout_method IN ('bank', 'esewa', 'khalti', 'fonepay', 'cash')),
  payout_details jsonb DEFAULT '{}',
  reference_ids uuid[] DEFAULT '{}', -- Links to commissions/orders
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_catalog_product_id ON public.order_items(catalog_product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store_id ON public.order_items(store_id);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE INDEX IF NOT EXISTS idx_store_commissions_order_id ON public.store_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_store_commissions_store_id ON public.store_commissions(store_id);
CREATE INDEX IF NOT EXISTS idx_store_commissions_status ON public.store_commissions(status);

CREATE INDEX IF NOT EXISTS idx_store_payouts_store_id ON public.store_payouts(store_id);
CREATE INDEX IF NOT EXISTS idx_store_payouts_status ON public.store_payouts(status);
CREATE INDEX IF NOT EXISTS idx_store_payouts_created_at ON public.store_payouts(created_at);

-- Row Level Security (RLS) Policies

-- orders: Users can see own orders, store admins own store orders, staff/suadmin all
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Store admins can view store orders" ON public.orders;
CREATE POLICY "Store admins can view store orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.store_admins sa ON sa.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND sa.store_id = orders.store_id
      AND ur.role = 'storeadmin'
    )
  );

DROP POLICY IF EXISTS "Staff and super admin can view all orders" ON public.orders;
CREATE POLICY "Staff and super admin can view all orders" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- order_items: Same as orders
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
    )
  );

-- Similar policies for store admins and staff/suadmin

-- payments: Only staff/suadmin can view, system inserts
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff and super admin can manage payments" ON public.payments;
CREATE POLICY "Staff and super admin can manage payments" ON public.payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- store_commissions: Store admins see own, staff/suadmin see all
ALTER TABLE public.store_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store admins can view own commissions" ON public.store_commissions;
CREATE POLICY "Store admins can view own commissions" ON public.store_commissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.store_admins sa ON sa.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND sa.store_id = store_commissions.store_id
      AND ur.role = 'storeadmin'
    )
  );

DROP POLICY IF EXISTS "Staff and super admin can manage commissions" ON public.store_commissions;
CREATE POLICY "Staff and super admin can manage commissions" ON public.store_commissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- store_payouts: Store admins see own, staff/suadmin see all
ALTER TABLE public.store_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store admins can view own payouts" ON public.store_payouts;
CREATE POLICY "Store admins can view own payouts" ON public.store_payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.store_admins sa ON sa.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND sa.store_id = store_payouts.store_id
      AND ur.role = 'storeadmin'
    )
  );

DROP POLICY IF EXISTS "Staff and super admin can manage payouts" ON public.store_payouts;
CREATE POLICY "Staff and super admin can manage payouts" ON public.store_payouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- Functions for commission calculation
CREATE OR REPLACE FUNCTION public.calculate_store_commission(
  p_store_id uuid,
  p_order_amount decimal
) RETURNS decimal AS $$
DECLARE
  v_commission_percent decimal;
  v_package_slug text;
BEGIN
  -- Get store's package
  SELECT package_slug, marketplace_commission 
  INTO v_package_slug, v_commission_percent
  FROM public.stores 
  WHERE id = p_store_id;

  -- If store has explicit commission set, use it
  IF v_commission_percent IS NOT NULL THEN
    RETURN (p_order_amount * v_commission_percent / 100);
  END IF;

  -- Otherwise use package defaults
  v_commission_percent := CASE v_package_slug
    WHEN 'diamond' THEN 5
    WHEN 'gold' THEN 7
    WHEN 'silver' THEN 10
    ELSE 12 -- default commission
  END;

  RETURN (p_order_amount * v_commission_percent / 100);
END;
$$ LANGUAGE plpgsql;

-- Function to create commission records
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

      -- Insert commission record
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
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;