-- Make the valuation RPC safe for empty defects and ensure products without a
-- custom rule receive a used-device estimate rather than their full retail price.

CREATE TABLE IF NOT EXISTS public.valuation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_product_id uuid UNIQUE REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  base_price numeric(12,2) NOT NULL,
  storage_adjustments jsonb DEFAULT '{}'::jsonb,
  condition_factors jsonb DEFAULT '{}'::jsonb,
  defect_adjustments jsonb DEFAULT '{}'::jsonb,
  age_depreciation jsonb DEFAULT '{}'::jsonb,
  demand_factor numeric(4,2) DEFAULT 1,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sell_phone_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  brand text NOT NULL,
  model text NOT NULL,
  storage text,
  condition text CHECK (condition IN ('new', 'like_new', 'used', 'fair', 'refurbished', 'open_box')),
  defects jsonb DEFAULT '[]'::jsonb,
  age_months integer DEFAULT 0,
  quoted_value numeric(12,2),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text NOT NULL,
  imei text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'inspection_booked', 'completed', 'rejected', 'cancelled')),
  source text DEFAULT 'website',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_valuation_rules_catalog_product_id ON public.valuation_rules(catalog_product_id);
CREATE INDEX IF NOT EXISTS idx_sell_phone_leads_status ON public.sell_phone_leads(status);
CREATE INDEX IF NOT EXISTS idx_sell_phone_leads_created_at ON public.sell_phone_leads(created_at DESC);

ALTER TABLE public.valuation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_phone_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public submit sell phone leads" ON public.sell_phone_leads;
CREATE POLICY "Public submit sell phone leads" ON public.sell_phone_leads
  FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS "Users read own sell phone leads" ON public.sell_phone_leads;
CREATE POLICY "Users read own sell phone leads" ON public.sell_phone_leads
  FOR SELECT TO authenticated USING (user_id = auth.uid());

GRANT INSERT ON public.sell_phone_leads TO anon, authenticated;
GRANT SELECT ON public.sell_phone_leads TO authenticated;

CREATE OR REPLACE FUNCTION public.calculate_device_valuation(
  p_catalog_product_id uuid,
  p_storage text,
  p_condition text,
  p_defects text[],
  p_age_months integer
) RETURNS decimal
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rules public.valuation_rules%ROWTYPE;
  v_base_price decimal;
  v_storage_multiplier decimal := 1.0;
  v_condition_multiplier decimal := 0.68;
  v_defect_deduction decimal := 0;
  v_age_multiplier decimal := 1.0;
  v_defect text;
  v_final_price decimal;
BEGIN
  SELECT *
  INTO v_rules
  FROM public.valuation_rules
  WHERE catalog_product_id = p_catalog_product_id
    AND active = true
  LIMIT 1;

  IF FOUND THEN
    v_base_price := v_rules.base_price;

    IF p_storage IS NOT NULL AND v_rules.storage_adjustments ? p_storage THEN
      v_storage_multiplier := (v_rules.storage_adjustments ->> p_storage)::decimal;
    END IF;

    IF p_condition IS NOT NULL AND v_rules.condition_factors ? p_condition THEN
      v_condition_multiplier := (v_rules.condition_factors ->> p_condition)::decimal;
    END IF;

    FOREACH v_defect IN ARRAY COALESCE(p_defects, ARRAY[]::text[])
    LOOP
      IF v_rules.defect_adjustments ? v_defect THEN
        v_defect_deduction :=
          v_defect_deduction + (v_rules.defect_adjustments ->> v_defect)::decimal;
      END IF;
    END LOOP;

    v_age_multiplier := GREATEST(
      0.5,
      1.0 - (LEAST(GREATEST(COALESCE(p_age_months, 0), 0), 48) * 0.01)
    );

    v_final_price :=
      v_base_price *
      v_storage_multiplier *
      v_condition_multiplier *
      v_age_multiplier *
      COALESCE(v_rules.demand_factor, 1.0) +
      v_defect_deduction;
  ELSE
    SELECT price_npr
    INTO v_base_price
    FROM public.catalog_products
    WHERE id = p_catalog_product_id;

    IF COALESCE(v_base_price, 0) <= 0 THEN
      RETURN 0;
    END IF;

    v_storage_multiplier := CASE p_storage
      WHEN '1TB' THEN 1.14
      WHEN '512GB' THEN 1.08
      WHEN '256GB' THEN 1.04
      ELSE 1.0
    END;

    v_condition_multiplier := CASE lower(COALESCE(p_condition, 'used'))
      WHEN 'new' THEN 0.92
      WHEN 'brand_new' THEN 0.92
      WHEN 'like_new' THEN 0.82
      WHEN 'open_box' THEN 0.82
      WHEN 'fair' THEN 0.52
      WHEN 'poor' THEN 0.52
      ELSE 0.68
    END;

    FOREACH v_defect IN ARRAY COALESCE(p_defects, ARRAY[]::text[])
    LOOP
      v_defect_deduction := v_defect_deduction + CASE v_defect
        WHEN 'screen_crack' THEN 8000
        WHEN 'battery_weak' THEN 4000
        WHEN 'camera_issue' THEN 5000
        WHEN 'face_id_fail' THEN 6000
        WHEN 'speaker_issue' THEN 2000
        WHEN 'buttons_issue' THEN 1500
        ELSE 0
      END;
    END LOOP;

    v_age_multiplier := GREATEST(
      0.5,
      1.0 - (LEAST(GREATEST(COALESCE(p_age_months, 0), 0), 48) * 0.01)
    );

    v_final_price :=
      v_base_price *
      v_storage_multiplier *
      v_condition_multiplier *
      v_age_multiplier -
      v_defect_deduction;
  END IF;

  RETURN GREATEST(5000, round(v_final_price));
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_device_valuation(uuid, text, text, text[], integer)
TO anon, authenticated;
