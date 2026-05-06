
-- 1. Store Branches
CREATE TABLE IF NOT EXISTS public.store_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text NOT NULL,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Repair Requests
CREATE TABLE IF NOT EXISTS public.repair_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  device_model text NOT NULL,
  issue_description text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'diagnosing', 'repairing', 'ready', 'delivered', 'cancelled')),
  estimated_cost decimal(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Product Reviews
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- 4. Leads (Inquiries)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  created_at timestamptz DEFAULT now()
);

-- 5. Payouts (Store Earnings)
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  bank_details jsonb,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- 6. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.store_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Unified RLS Policies (Super Admin Bypasses Everything)
CREATE POLICY "Super Admin: Manage all branches" ON public.store_branches FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super Admin: Manage all repairs" ON public.repair_requests FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super Admin: Manage all reviews" ON public.product_reviews FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super Admin: Manage all leads" ON public.leads FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super Admin: Manage all payouts" ON public.payouts FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super Admin: Manage all audit logs" ON public.audit_logs FOR ALL TO authenticated USING (public.is_super_admin());

-- Store Owner Policies
CREATE POLICY "Store Owner: Manage own branches" ON public.store_branches FOR ALL TO authenticated 
  USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

CREATE POLICY "Store Owner: Manage own repairs" ON public.repair_requests FOR ALL TO authenticated 
  USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

CREATE POLICY "Store Owner: Manage own leads" ON public.leads FOR ALL TO authenticated 
  USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

CREATE POLICY "Store Owner: View own payouts" ON public.payouts FOR SELECT TO authenticated 
  USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- User Policies
CREATE POLICY "User: Manage own repairs" ON public.repair_requests FOR ALL TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "User: Manage own reviews" ON public.product_reviews FOR ALL TO authenticated 
  USING (user_id = auth.uid());

-- Public Policies
CREATE POLICY "Public: View active branches" ON public.store_branches FOR SELECT USING (is_active = true);
CREATE POLICY "Public: View product reviews" ON public.product_reviews FOR SELECT USING (true);
CREATE POLICY "Public: Insert leads" ON public.leads FOR INSERT WITH CHECK (true);

-- Seed some demo data
DO $$
DECLARE
  v_store_id uuid;
  v_user_id uuid := '00000000-0000-0000-0000-000000000004'; -- Demo User
BEGIN
  SELECT id INTO v_store_id FROM public.stores WHERE slug = 'tamrakar-demo-store' LIMIT 1;
  
  IF v_store_id IS NOT NULL THEN
    -- Branch
    INSERT INTO public.store_branches (store_id, name, location) VALUES (v_store_id, 'Tamrakar Branch 2', '2nd Floor, Shop #205');
    
    -- Lead
    INSERT INTO public.leads (store_id, name, email, message) VALUES (v_store_id, 'Test Customer', 'customer@gmail.com', 'Inquiry about iPhone price.');
    
    -- Repair
    INSERT INTO public.repair_requests (user_id, store_id, device_model, issue_description) 
    VALUES (v_user_id, v_store_id, 'iPhone 13', 'Screen cracked, need replacement.');
    
    -- Payout
    INSERT INTO public.payouts (store_id, amount, status) VALUES (v_store_id, 15000.00, 'pending');
  END IF;
END $$;
