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
  v_rule public.valuation_rules%ROWTYPE;
  v_base numeric;
  v_storage_factor numeric := 1;
  v_condition_factor numeric := 0.68;
  v_age_factor numeric;
  v_deductions numeric := 0;
  v_defect text;
BEGIN
  IF p_catalog_product_id IS NULL THEN RETURN 0; END IF;

  SELECT * INTO v_rule
  FROM public.valuation_rules
  WHERE catalog_product_id = p_catalog_product_id AND active = true
  LIMIT 1;

  IF FOUND THEN
    v_base := v_rule.base_price;
    IF v_rule.storage_adjustments ? COALESCE(p_storage, '') THEN
      v_storage_factor := LEAST(1.5, GREATEST(0.5, (v_rule.storage_adjustments ->> p_storage)::numeric));
    END IF;
    IF v_rule.condition_factors ? lower(COALESCE(p_condition, 'used')) THEN
      v_condition_factor := LEAST(1, GREATEST(0.2, (v_rule.condition_factors ->> lower(COALESCE(p_condition, 'used')))::numeric));
    END IF;
    FOREACH v_defect IN ARRAY COALESCE(p_defects, ARRAY[]::text[]) LOOP
      IF v_rule.defect_adjustments ? v_defect THEN
        v_deductions := v_deductions + abs((v_rule.defect_adjustments ->> v_defect)::numeric);
      END IF;
    END LOOP;
  ELSE
    SELECT price_npr INTO v_base FROM public.catalog_products WHERE id = p_catalog_product_id AND is_active = true;
    v_storage_factor := CASE upper(COALESCE(p_storage, '')) WHEN '1TB' THEN 1.14 WHEN '512GB' THEN 1.08 WHEN '256GB' THEN 1.04 ELSE 1 END;
    v_condition_factor := CASE lower(COALESCE(p_condition, 'used')) WHEN 'new' THEN 0.92 WHEN 'brand_new' THEN 0.92 WHEN 'like_new' THEN 0.82 WHEN 'open_box' THEN 0.82 WHEN 'refurbished' THEN 0.62 WHEN 'fair' THEN 0.52 WHEN 'poor' THEN 0.40 ELSE 0.68 END;
    FOREACH v_defect IN ARRAY COALESCE(p_defects, ARRAY[]::text[]) LOOP
      v_deductions := v_deductions + CASE v_defect WHEN 'screen_crack' THEN 8000 WHEN 'battery_weak' THEN 4000 WHEN 'camera_issue' THEN 5000 WHEN 'face_id_fail' THEN 6000 WHEN 'speaker_issue' THEN 2000 WHEN 'buttons_issue' THEN 1500 ELSE 0 END;
    END LOOP;
  END IF;

  IF COALESCE(v_base, 0) <= 0 THEN RETURN 0; END IF;
  v_base := LEAST(2000000, GREATEST(5000, v_base));
  v_age_factor := GREATEST(0.5, 1 - LEAST(GREATEST(COALESCE(p_age_months, 0), 0), 48) * 0.01);

  RETURN GREATEST(5000, round(
    v_base * v_storage_factor * v_condition_factor * v_age_factor *
    LEAST(1.5, GREATEST(0.5, COALESCE(v_rule.demand_factor, 1))) - v_deductions
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_device_valuation(uuid,text,text,text[],integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_device_valuation(uuid,text,text,text[],integer) TO anon, authenticated;
