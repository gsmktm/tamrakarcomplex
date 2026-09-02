-- EMI Plans table
CREATE TABLE IF NOT EXISTS public.emi_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  duration_months integer NOT NULL DEFAULT 12,
  interest_rate numeric(5,2) NOT NULL DEFAULT 0,
  processing_fee numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emi_plans_status ON public.emi_plans(status);
CREATE INDEX IF NOT EXISTS idx_emi_plans_bank ON public.emi_plans(bank_name);

ALTER TABLE public.emi_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active emi plans" ON public.emi_plans;
CREATE POLICY "Public read active emi plans" ON public.emi_plans
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Admins manage emi plans" ON public.emi_plans;
CREATE POLICY "Admins manage emi plans" ON public.emi_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('suadmin', 'admin')
    )
  );

-- model_emi junction
CREATE TABLE IF NOT EXISTS public.model_emi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES public.phone_models(id) ON DELETE CASCADE,
  variant_id uuid,
  emi_plan_id uuid REFERENCES public.emi_plans(id) ON DELETE CASCADE,
  monthly_amount numeric(10,2),
  down_payment numeric(10,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.model_emi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read model emi" ON public.model_emi;
CREATE POLICY "Public read model emi" ON public.model_emi FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage model emi" ON public.model_emi;
CREATE POLICY "Admins manage model emi" ON public.model_emi
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('suadmin', 'admin')
    )
  );

-- Nepal bank seed data
INSERT INTO public.emi_plans (bank_name, duration_months, interest_rate, processing_fee, status)
VALUES
  ('NMB Bank', 6,  0.00, 500,  'active'),
  ('NMB Bank', 12, 0.00, 500,  'active'),
  ('NMB Bank', 18, 5.00, 500,  'active'),
  ('Global IME Bank', 6,  0.00, 400, 'active'),
  ('Global IME Bank', 12, 0.00, 400, 'active'),
  ('Global IME Bank', 24, 6.00, 400, 'active'),
  ('Nepal Investment Mega Bank', 6,  0.00, 500, 'active'),
  ('Nepal Investment Mega Bank', 12, 0.00, 500, 'active'),
  ('Himalayan Bank', 6,  0.00, 500, 'active'),
  ('Himalayan Bank', 12, 0.00, 500, 'active'),
  ('Kumari Bank', 6,  0.00, 400, 'active'),
  ('Kumari Bank', 12, 0.00, 400, 'active'),
  ('Prabhu Bank', 6,  0.00, 500, 'active'),
  ('Prabhu Bank', 12, 0.00, 500, 'active'),
  ('SBI Bank Nepal', 6,  0.00, 400, 'active'),
  ('SBI Bank Nepal', 12, 0.00, 400, 'active'),
  ('Machhapuchchhre Bank', 6,  0.00, 500, 'active'),
  ('Machhapuchchhre Bank', 12, 0.00, 500, 'active')
ON CONFLICT DO NOTHING;
