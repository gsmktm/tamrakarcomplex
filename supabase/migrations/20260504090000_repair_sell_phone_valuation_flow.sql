-- Align sell-phone valuation tables used by /sell-your-phone, admin lead views,
-- and product-page valuation CTAs.

ALTER TABLE public.sell_phone_leads
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS storage text,
  ADD COLUMN IF NOT EXISTS defects jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS age_months integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quoted_value numeric,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS imei text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.sell_phone_leads
SET
  brand = COALESCE(brand, device_brand),
  model = COALESCE(model, device_model),
  quoted_value = COALESCE(quoted_value, asking_price),
  customer_name = COALESCE(customer_name, name),
  customer_phone = COALESCE(customer_phone, phone),
  customer_email = COALESCE(customer_email, ''),
  defects = COALESCE(defects, '[]'::jsonb),
  source = COALESCE(source, 'website')
WHERE brand IS NULL
   OR model IS NULL
   OR quoted_value IS NULL
   OR customer_name IS NULL
   OR customer_phone IS NULL
   OR customer_email IS NULL
   OR defects IS NULL
   OR source IS NULL;

ALTER TABLE public.sell_phone_leads DROP CONSTRAINT IF EXISTS sell_phone_leads_condition_check;
ALTER TABLE public.sell_phone_leads
  ADD CONSTRAINT sell_phone_leads_condition_check
  CHECK (condition IS NULL OR condition IN ('new', 'like_new', 'used', 'fair', 'refurbished', 'open_box'));

ALTER TABLE public.sell_phone_leads DROP CONSTRAINT IF EXISTS sell_phone_leads_status_check;
ALTER TABLE public.sell_phone_leads
  ADD CONSTRAINT sell_phone_leads_status_check
  CHECK (status IN ('new', 'contacted', 'inspection_booked', 'scheduled', 'completed', 'rejected', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_sell_phone_leads_assigned_store_id ON public.sell_phone_leads(assigned_store_id);
CREATE INDEX IF NOT EXISTS idx_sell_phone_leads_status ON public.sell_phone_leads(status);
CREATE INDEX IF NOT EXISTS idx_sell_phone_leads_created_at ON public.sell_phone_leads(created_at);

ALTER TABLE public.leads_quotes
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS device jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS defects jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quoted_value numeric,
  ADD COLUMN IF NOT EXISTS quote_amount numeric,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS device_brand text,
  ADD COLUMN IF NOT EXISTS device_model text,
  ADD COLUMN IF NOT EXISTS partner_store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_store uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.leads_quotes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.leads_quotes ALTER COLUMN device DROP NOT NULL;
ALTER TABLE public.leads_quotes ALTER COLUMN type DROP NOT NULL;
ALTER TABLE public.leads_quotes ALTER COLUMN defects TYPE jsonb USING to_jsonb(defects);

UPDATE public.leads_quotes
SET
  quoted_value = COALESCE(quoted_value, quote_amount),
  quote_amount = COALESCE(quote_amount, quoted_value),
  device_brand = COALESCE(device_brand, device->>'brand'),
  device_model = COALESCE(device_model, device->>'model'),
  assigned_store = COALESCE(assigned_store, partner_store_id),
  partner_store_id = COALESCE(partner_store_id, assigned_store),
  defects = COALESCE(defects, '[]'::jsonb),
  device = COALESCE(device, '{}'::jsonb),
  type = COALESCE(type, 'cash')
WHERE quoted_value IS NULL
   OR quote_amount IS NULL
   OR device_brand IS NULL
   OR device_model IS NULL
   OR assigned_store IS NULL
   OR partner_store_id IS NULL
   OR defects IS NULL
   OR device IS NULL
   OR type IS NULL;

DROP POLICY IF EXISTS "Public can create sell phone leads" ON public.sell_phone_leads;
CREATE POLICY "Public can create sell phone leads"
ON public.sell_phone_leads FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users view own leads" ON public.sell_phone_leads;
CREATE POLICY "Users view own leads"
ON public.sell_phone_leads FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Store admins view assigned leads" ON public.sell_phone_leads;
CREATE POLICY "Store admins view assigned leads"
ON public.sell_phone_leads FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.store_admins sa
    WHERE sa.user_id = auth.uid()
      AND sa.store_id = sell_phone_leads.assigned_store_id
  )
);
