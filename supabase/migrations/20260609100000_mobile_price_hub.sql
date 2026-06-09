-- =============================================
-- MOBILE PRICE HUB — 2026-06-09
-- =============================================

-- 1. ALTER phone_models — add SEO + metadata columns
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS market_status TEXT DEFAULT 'available';
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS is_upcoming BOOLEAN DEFAULT false;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS is_top_rated BOOLEAN DEFAULT false;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS overview_content TEXT;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS launch_date_nepal DATE;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS user_rating_avg NUMERIC(3,2) DEFAULT 0;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS user_rating_count INTEGER DEFAULT 0;

-- 2. ALTER phone_specs — add key_specs highlight + expert_rating
ALTER TABLE phone_specs ADD COLUMN IF NOT EXISTS key_specs JSONB;
ALTER TABLE phone_specs ADD COLUMN IF NOT EXISTS expert_rating NUMERIC(3,1);

-- 3. retailers
CREATE TABLE IF NOT EXISTS retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo TEXT,
  website TEXT,
  is_affiliate BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. phone_variant_prices — master price table
CREATE TABLE IF NOT EXISTS phone_variant_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES phone_variants(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES retailers(id) ON DELETE SET NULL,
  regular_price INTEGER NOT NULL,
  sale_price INTEGER,
  currency TEXT DEFAULT 'NPR',
  buy_url TEXT,
  stock_status TEXT DEFAULT 'in_stock',
  emi_available BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT sale_price_check CHECK (sale_price IS NULL OR sale_price < regular_price)
);

-- 5. price_history — immutable trigger log
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES phone_variants(id) ON DELETE CASCADE,
  old_price INTEGER,
  new_price INTEGER NOT NULL,
  changed_by UUID,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. expert_scores — one row per model
CREATE TABLE IF NOT EXISTS expert_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE UNIQUE,
  design_score NUMERIC(3,1),
  display_score NUMERIC(3,1),
  performance_score NUMERIC(3,1),
  software_score NUMERIC(3,1),
  camera_score NUMERIC(3,1),
  battery_score NUMERIC(3,1),
  value_score NUMERIC(3,1),
  review_post_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. model_images — per-model gallery
CREATE TABLE IF NOT EXISTS model_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. model_user_reviews
CREATE TABLE IF NOT EXISTS model_user_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  user_id UUID,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. emi_plans
CREATE TABLE IF NOT EXISTS emi_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  duration_months INTEGER NOT NULL,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  processing_fee NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. model_emi
CREATE TABLE IF NOT EXISTS model_emi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES phone_variants(id) ON DELETE CASCADE,
  emi_plan_id UUID REFERENCES emi_plans(id) ON DELETE CASCADE,
  monthly_amount INTEGER NOT NULL,
  down_payment INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Trigger: log price changes to price_history
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.regular_price IS DISTINCT FROM NEW.regular_price THEN
    INSERT INTO price_history (model_id, variant_id, old_price, new_price, changed_by)
    VALUES (NEW.model_id, NEW.variant_id, OLD.regular_price, NEW.regular_price, auth.uid());
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_price_history ON phone_variant_prices;
CREATE TRIGGER trg_price_history
  BEFORE UPDATE ON phone_variant_prices
  FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- 12. Indexes for FK columns (performance)
CREATE INDEX IF NOT EXISTS idx_pvp_model    ON phone_variant_prices(model_id);
CREATE INDEX IF NOT EXISTS idx_pvp_variant  ON phone_variant_prices(variant_id);
CREATE INDEX IF NOT EXISTS idx_ph_model     ON price_history(model_id);
CREATE INDEX IF NOT EXISTS idx_mi_model     ON model_images(model_id);
CREATE INDEX IF NOT EXISTS idx_mur_model    ON model_user_reviews(model_id);
CREATE INDEX IF NOT EXISTS idx_me_model     ON model_emi(model_id);

-- 13. RLS — public read, admin write
ALTER TABLE phone_variant_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_prices" ON phone_variant_prices FOR SELECT USING (true);
CREATE POLICY "auth_write_prices" ON phone_variant_prices FOR ALL TO authenticated USING (public.is_admin());

ALTER TABLE expert_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_expert" ON expert_scores FOR SELECT USING (true);
CREATE POLICY "auth_write_expert" ON expert_scores FOR ALL TO authenticated USING (public.is_admin());

ALTER TABLE model_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_images" ON model_images FOR SELECT USING (true);
CREATE POLICY "auth_write_images" ON model_images FOR ALL TO authenticated USING (public.is_admin());

ALTER TABLE model_user_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_approved_reviews" ON model_user_reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "auth_write_reviews" ON model_user_reviews FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "users_insert_own_review" ON model_user_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');

ALTER TABLE emi_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_emi_plans" ON emi_plans FOR SELECT USING (status = 'active');
CREATE POLICY "auth_write_emi_plans" ON emi_plans FOR ALL TO authenticated USING (public.is_admin());

ALTER TABLE model_emi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_model_emi" ON model_emi FOR SELECT USING (true);
CREATE POLICY "auth_write_model_emi" ON model_emi FOR ALL TO authenticated USING (public.is_admin());

ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_retailers" ON retailers FOR SELECT USING (status = 'active');
CREATE POLICY "auth_write_retailers" ON retailers FOR ALL TO authenticated USING (public.is_admin());

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_history" ON price_history FOR SELECT USING (true);
