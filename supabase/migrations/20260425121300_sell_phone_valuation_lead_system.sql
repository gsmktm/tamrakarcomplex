-- Migration: Complete Sell Your Phone valuation and lead system

-- 1. valuation_rules table
CREATE TABLE IF NOT EXISTS public.valuation_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_product_id uuid REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  base_price decimal(10,2) NOT NULL,
  storage_adjustments jsonb DEFAULT '{}'::jsonb, -- e.g. {"64GB": 0.9, "128GB": 1.0, "256GB": 1.1}
  condition_factors jsonb DEFAULT '{}'::jsonb, -- e.g. {"new": 1.0, "used": 0.8, "refurbished": 0.7}
  defect_adjustments jsonb DEFAULT '{}'::jsonb, -- e.g. {"screen_crack": -5000, "battery_weak": -2000}
  age_depreciation jsonb DEFAULT '{}'::jsonb, -- e.g. {"0-6": 1.0, "6-12": 0.95, "12-24": 0.9}
  demand_factor decimal(3,2) DEFAULT 1.00,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(catalog_product_id)
);

-- 2. sell_phone_leads table
CREATE TABLE IF NOT EXISTS public.sell_phone_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  brand text NOT NULL,
  model text NOT NULL,
  storage text,
  condition text CHECK (condition IN ('new', 'used', 'refurbished', 'open_box')),
  defects jsonb DEFAULT '[]'::jsonb,
  age_months integer DEFAULT 0,
  quoted_value decimal(10,2),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text NOT NULL,
  imei text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'inspection_booked', 'completed', 'rejected', 'cancelled')),
  source text DEFAULT 'website',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. store_lead_preferences table
CREATE TABLE IF NOT EXISTS public.store_lead_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  accepts_brands jsonb DEFAULT '[]'::jsonb,
  accepts_conditions jsonb DEFAULT '["new", "used", "refurbished"]'::jsonb,
  max_quote_amount decimal(10,2),
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(store_id)
);

-- 4. Add popularity tracking to catalog_products (if not exists)
ALTER TABLE public.catalog_products
ADD COLUMN IF NOT EXISTS admin_pinned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS popularity_score decimal(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS search_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_popularity_update timestamp with time zone;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_valuation_rules_catalog_product_id ON public.valuation_rules(catalog_product_id);
CREATE INDEX IF NOT EXISTS idx_sell_phone_leads_assigned_store_id ON public.sell_phone_leads(assigned_store_id);
CREATE INDEX IF NOT EXISTS idx_sell_phone_leads_status ON public.sell_phone_leads(status);
CREATE INDEX IF NOT EXISTS idx_sell_phone_leads_created_at ON public.sell_phone_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_store_lead_preferences_store_id ON public.store_lead_preferences(store_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_popularity_score ON public.catalog_products(popularity_score DESC);

-- Row Level Security

-- valuation_rules: Staff and super admin only
ALTER TABLE public.valuation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff and super admin manage valuation rules" ON public.valuation_rules;
CREATE POLICY "Staff and super admin manage valuation rules" ON public.valuation_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- sell_phone_leads: Users see own leads, store admins see assigned leads, staff/suadmin see all
ALTER TABLE public.sell_phone_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own leads" ON public.sell_phone_leads;
CREATE POLICY "Users view own leads" ON public.sell_phone_leads
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Store admins view assigned leads" ON public.sell_phone_leads;
CREATE POLICY "Store admins view assigned leads" ON public.sell_phone_leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.store_admins sa ON sa.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND sa.store_id = sell_phone_leads.assigned_store_id
      AND ur.role = 'storeadmin'
    )
  );

DROP POLICY IF EXISTS "Staff and super admin manage all leads" ON public.sell_phone_leads;
CREATE POLICY "Staff and super admin manage all leads" ON public.sell_phone_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- store_lead_preferences: Store admins manage own, staff/suadmin manage all
ALTER TABLE public.store_lead_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store admins manage own lead preferences" ON public.store_lead_preferences;
CREATE POLICY "Store admins manage own lead preferences" ON public.store_lead_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.store_admins sa ON sa.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND sa.store_id = store_lead_preferences.store_id
      AND ur.role = 'storeadmin'
    )
  );

DROP POLICY IF EXISTS "Staff and super admin manage lead preferences" ON public.store_lead_preferences;
CREATE POLICY "Staff and super admin manage lead preferences" ON public.store_lead_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('staffadmin', 'suadmin')
    )
  );

-- Functions

-- Calculate valuation based on rules
CREATE OR REPLACE FUNCTION public.calculate_device_valuation(
  p_catalog_product_id uuid,
  p_storage text,
  p_condition text,
  p_defects text[],
  p_age_months integer
) RETURNS decimal AS $$
DECLARE
  v_rules record;
  v_base_price decimal;
  v_storage_multiplier decimal := 1.0;
  v_condition_multiplier decimal := 1.0;
  v_defect_deduction decimal := 0;
  v_age_multiplier decimal := 1.0;
  v_final_price decimal;
BEGIN
  -- Get valuation rules
  SELECT * INTO v_rules FROM public.valuation_rules
  WHERE catalog_product_id = p_catalog_product_id AND active = true;

  IF NOT FOUND THEN
    -- Fallback to catalog product price
    SELECT price_npr INTO v_base_price FROM public.catalog_products
    WHERE id = p_catalog_product_id;
    RETURN COALESCE(v_base_price, 0);
  END IF;

  v_base_price := v_rules.base_price;

  -- Apply storage adjustment
  IF p_storage IS NOT NULL AND v_rules.storage_adjustments ? p_storage THEN
    v_storage_multiplier := (v_rules.storage_adjustments->>p_storage)::decimal;
  END IF;

  -- Apply condition factor
  IF p_condition IS NOT NULL AND v_rules.condition_factors ? p_condition THEN
    v_condition_multiplier := (v_rules.condition_factors->>p_condition)::decimal;
  END IF;

  -- Apply defect deductions
  IF p_defects IS NOT NULL THEN
    FOR i IN 1..array_length(p_defects, 1) LOOP
      IF v_rules.defect_adjustments ? p_defects[i] THEN
        v_defect_deduction := v_defect_deduction + (v_rules.defect_adjustments->>p_defects[i])::decimal;
      END IF;
    END LOOP;
  END IF;

  -- Apply age depreciation
  IF p_age_months IS NOT NULL THEN
    -- Simple age-based depreciation (this could be more sophisticated)
    v_age_multiplier := GREATEST(0.5, 1.0 - (p_age_months * 0.01));
  END IF;

  -- Calculate final price
  v_final_price := v_base_price * v_storage_multiplier * v_condition_multiplier * v_age_multiplier * v_rules.demand_factor + v_defect_deduction;

  RETURN GREATEST(0, v_final_price);
END;
$$ LANGUAGE plpgsql;

-- Function to assign lead to best store
CREATE OR REPLACE FUNCTION public.assign_lead_to_store(
  p_lead_id uuid,
  p_preferred_store_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_lead record;
  v_store_id uuid;
  v_package_slug text;
BEGIN
  -- Get lead details
  SELECT * INTO v_lead FROM public.sell_phone_leads WHERE id = p_lead_id;

  -- If preferred store specified, check if it accepts this lead
  IF p_preferred_store_id IS NOT NULL THEN
    SELECT store_id INTO v_store_id FROM public.store_lead_preferences
    WHERE store_id = p_preferred_store_id
    AND active = true
    AND (accepts_brands = '[]'::jsonb OR accepts_brands ? v_lead.brand)
    AND (accepts_conditions = '[]'::jsonb OR accepts_conditions ? v_lead.condition)
    AND (max_quote_amount IS NULL OR v_lead.quoted_value <= max_quote_amount);

    IF FOUND THEN
      UPDATE public.sell_phone_leads SET assigned_store_id = v_store_id WHERE id = p_lead_id;
      RETURN v_store_id;
    END IF;
  END IF;

  -- Find best available store based on package priority
  SELECT s.id INTO v_store_id
  FROM public.stores s
  JOIN public.store_lead_preferences slp ON slp.store_id = s.id
  WHERE slp.active = true
  AND (slp.accepts_brands = '[]'::jsonb OR slp.accepts_brands ? v_lead.brand)
  AND (slp.accepts_conditions = '[]'::jsonb OR slp.accepts_conditions ? v_lead.condition)
  AND (slp.max_quote_amount IS NULL OR v_lead.quoted_value <= slp.max_quote_amount)
  ORDER BY
    CASE s.package_slug
      WHEN 'diamond' THEN 4
      WHEN 'gold' THEN 3
      WHEN 'silver' THEN 2
      WHEN 'free' THEN 1
      ELSE 0
    END DESC,
    s.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.sell_phone_leads SET assigned_store_id = v_store_id WHERE id = p_lead_id;
    RETURN v_store_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;