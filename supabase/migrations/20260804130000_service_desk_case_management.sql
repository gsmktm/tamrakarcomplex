-- Complete the Service Desk edit model and enforce one authorization boundary
-- for platform admins and assigned store teams. Production may have a migration
-- ledger entry for unlock_requests even when the physical table is absent, so
-- recreate the canonical intake table before reconciling columns.

CREATE TABLE IF NOT EXISTS public.unlock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  brand text NOT NULL DEFAULT 'Unknown',
  model text NOT NULL DEFAULT 'Unknown',
  service_type text NOT NULL DEFAULT 'Unlock assessment',
  customer_name text NOT NULL DEFAULT 'Customer',
  customer_phone text NOT NULL DEFAULT '',
  customer_email text,
  imei text,
  serial_number text,
  network text,
  assigned_store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  quoted_price_npr numeric(12,2),
  payment_method text DEFAULT 'cash_at_store',
  payment_status text DEFAULT 'pending',
  urgency text DEFAULT 'standard',
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','cancelled','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.unlock_requests
  ADD COLUMN IF NOT EXISTS assigned_store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quoted_price_npr numeric(12,2),
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_unlock_requests_assigned_store_status
  ON public.unlock_requests (assigned_store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repair_requests_assigned_store_status
  ON public.repair_requests (assigned_store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sell_phone_leads_assigned_store_status
  ON public.sell_phone_leads (assigned_store_id, status, created_at DESC);

ALTER TABLE public.unlock_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create unlock requests" ON public.unlock_requests;
CREATE POLICY "Customers create unlock requests"
  ON public.unlock_requests FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own unlock requests" ON public.unlock_requests;
DROP POLICY IF EXISTS "Own unlock_requests" ON public.unlock_requests;
CREATE POLICY "Customers read own unlock requests"
  ON public.unlock_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Suadmins can manage all unlock requests" ON public.unlock_requests;
DROP POLICY IF EXISTS "Staffadmins can manage all unlock requests" ON public.unlock_requests;
CREATE POLICY "Platform admins manage unlock requests"
  ON public.unlock_requests FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.is_staff_admin())
  WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

DROP POLICY IF EXISTS "Store owners can view requests assigned to their store" ON public.unlock_requests;
DROP POLICY IF EXISTS "Store owners can update requests assigned to their store" ON public.unlock_requests;
CREATE POLICY "Assigned store teams read unlock requests"
  ON public.unlock_requests FOR SELECT TO authenticated
  USING (
    assigned_store_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.stores s WHERE s.id = assigned_store_id AND (s.owner_id = auth.uid() OR s.owner_user_id = auth.uid()))
      OR EXISTS (SELECT 1 FROM public.store_admins sa WHERE sa.store_id = assigned_store_id AND sa.user_id = auth.uid() AND sa.status = 'active')
      OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = assigned_store_id AND ss.user_id = auth.uid() AND ss.status = 'active')
    )
  );
CREATE POLICY "Assigned store teams update unlock requests"
  ON public.unlock_requests FOR UPDATE TO authenticated
  USING (
    assigned_store_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.stores s WHERE s.id = assigned_store_id AND (s.owner_id = auth.uid() OR s.owner_user_id = auth.uid()))
      OR EXISTS (SELECT 1 FROM public.store_admins sa WHERE sa.store_id = assigned_store_id AND sa.user_id = auth.uid() AND sa.status = 'active')
      OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = assigned_store_id AND ss.user_id = auth.uid() AND ss.status = 'active')
    )
  )
  WITH CHECK (assigned_store_id IS NOT NULL);

GRANT INSERT ON public.unlock_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.unlock_requests TO authenticated;
