-- =============================================
-- EXCHANGE VALUES SEED — 2026-06-11
-- Derived from current market price (NPR)
-- good:    40–50%   (mint / fully working)
-- average: 25–35%   (minor scratches / working)
-- poor:    10–20%   (cracked / damaged)
-- Runs after 20260611000001 (variants + prices exist)
-- =============================================

INSERT INTO exchange_values
  (model_id, variant_id, min_value, max_value, condition_grade, status)
SELECT
  pv.model_id,
  pv.id,
  ROUND(pvp.regular_price * 0.40)::INTEGER,
  ROUND(pvp.regular_price * 0.50)::INTEGER,
  'good',
  'active'
FROM phone_variant_prices pvp
JOIN phone_variants pv ON pv.id = pvp.variant_id
WHERE pvp.is_default = true
ON CONFLICT (model_id, variant_id, condition_grade) DO UPDATE
  SET min_value = EXCLUDED.min_value,
      max_value = EXCLUDED.max_value,
      updated_at = now();

INSERT INTO exchange_values
  (model_id, variant_id, min_value, max_value, condition_grade, status)
SELECT
  pv.model_id,
  pv.id,
  ROUND(pvp.regular_price * 0.25)::INTEGER,
  ROUND(pvp.regular_price * 0.35)::INTEGER,
  'average',
  'active'
FROM phone_variant_prices pvp
JOIN phone_variants pv ON pv.id = pvp.variant_id
WHERE pvp.is_default = true
ON CONFLICT (model_id, variant_id, condition_grade) DO UPDATE
  SET min_value = EXCLUDED.min_value,
      max_value = EXCLUDED.max_value,
      updated_at = now();

INSERT INTO exchange_values
  (model_id, variant_id, min_value, max_value, condition_grade, status)
SELECT
  pv.model_id,
  pv.id,
  ROUND(pvp.regular_price * 0.10)::INTEGER,
  ROUND(pvp.regular_price * 0.20)::INTEGER,
  'poor',
  'active'
FROM phone_variant_prices pvp
JOIN phone_variants pv ON pv.id = pvp.variant_id
WHERE pvp.is_default = true
ON CONFLICT (model_id, variant_id, condition_grade) DO UPDATE
  SET min_value = EXCLUDED.min_value,
      max_value = EXCLUDED.max_value,
      updated_at = now();
