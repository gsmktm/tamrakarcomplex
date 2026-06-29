-- Fix: expert_scores missing overall_score and verdict columns
ALTER TABLE public.expert_scores
  ADD COLUMN IF NOT EXISTS overall_score NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS verdict TEXT;

-- Back-fill overall_score as average of component scores where available
UPDATE public.expert_scores
SET overall_score = ROUND(
  (COALESCE(design_score, 0) + COALESCE(display_score, 0) + COALESCE(performance_score, 0) +
   COALESCE(camera_score, 0) + COALESCE(battery_score, 0) + COALESCE(software_score, 0) +
   COALESCE(value_score, 0)) /
  NULLIF(
    (CASE WHEN design_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN display_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN performance_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN camera_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN battery_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN software_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN value_score IS NOT NULL THEN 1 ELSE 0 END), 0
  )::numeric, 1
)
WHERE overall_score IS NULL;

-- Performance indexes: phone_models hot filter columns
CREATE INDEX IF NOT EXISTS idx_phone_models_status        ON public.phone_models (status);
CREATE INDEX IF NOT EXISTS idx_phone_models_market_status ON public.phone_models (market_status);
CREATE INDEX IF NOT EXISTS idx_phone_models_is_featured   ON public.phone_models (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_phone_models_is_upcoming   ON public.phone_models (is_upcoming)  WHERE is_upcoming  = true;
CREATE INDEX IF NOT EXISTS idx_phone_models_is_top_rated  ON public.phone_models (is_top_rated) WHERE is_top_rated = true;
CREATE INDEX IF NOT EXISTS idx_phone_models_brand_status  ON public.phone_models (brand_id, status);

-- Composite index for the min-price hot path: model_id + stock_status
CREATE INDEX IF NOT EXISTS idx_pvp_model_stock ON public.phone_variant_prices (model_id, stock_status);

-- RLS: model_user_reviews — allow owners to update/delete their own reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'model_user_reviews' AND policyname = 'users_update_own_review'
  ) THEN
    CREATE POLICY "users_update_own_review" ON public.model_user_reviews
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'model_user_reviews' AND policyname = 'users_delete_own_review'
  ) THEN
    CREATE POLICY "users_delete_own_review" ON public.model_user_reviews
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
