-- Hotfix: comprehensive drift reconciliation batch 3.
--
-- Remaining frontend-referenced tables from the platform audit: unlock
-- catalog (useRepair), store operating system (store_repair_requests),
-- marketplace listing variants (ListingDetail/useMarketplaceListings/
-- useModelHub), analytics events, auto-search pages, user rewards and
-- activity history, and the repair-diagnostics catalog helpers.

CREATE TABLE IF NOT EXISTS public.unlock_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  variant text,
  release_year integer,
  supported_features text[],
  is_premium boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.unlock_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read unlock_catalog" ON public.unlock_catalog;
CREATE POLICY "Allow public read unlock_catalog" ON public.unlock_catalog FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow suadmin manage unlock_catalog" ON public.unlock_catalog;
CREATE POLICY "Allow suadmin manage unlock_catalog" ON public.unlock_catalog
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'suadmin')
  );
CREATE INDEX IF NOT EXISTS idx_unlock_catalog_brand_model ON public.unlock_catalog(brand, model);

CREATE TABLE IF NOT EXISTS public.store_repair_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  device_brand text,
  device_model text,
  issue_description text NOT NULL,
  estimated_price numeric,
  repair_status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_repair_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store members manage repair requests" ON public.store_repair_requests FOR ALL USING (
  public.is_admin() OR public.is_repair_store_admin(store_id)
);
CREATE INDEX IF NOT EXISTS idx_store_repair_requests_store ON public.store_repair_requests(store_id, repair_status);

-- Marketplace listing variants: ListingDetail queries marketplace_listings
-- by id; the browse hook queries public_marketplace_items; the model hub
-- queries used_phone_listings. These mirror sell_listings content, so each
-- is created as a compatible standalone table.
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  title text NOT NULL,
  brand text,
  model text,
  category text,
  price numeric NOT NULL,
  condition text,
  description text,
  images jsonb DEFAULT '[]',
  location text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active listings" ON public.marketplace_listings FOR SELECT USING (true);
CREATE POLICY "Admins manage listings" ON public.marketplace_listings FOR ALL USING (public.is_admin());

-- public_marketplace_items already exists on this database as a VIEW with
-- all columns the browse hook needs (title/brand/model/category/condition/
-- images/location/price/status/...) — no table creation here; creating one
-- would shadow the view.

CREATE TABLE IF NOT EXISTS public.used_phone_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid,
  seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  brand text,
  model text,
  storage text,
  condition text,
  price numeric NOT NULL,
  description text,
  images jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.used_phone_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved used listings" ON public.used_phone_listings FOR SELECT USING (true);
CREATE POLICY "Admins manage used listings" ON public.used_phone_listings FOR ALL USING (public.is_admin());

-- Analytics + SEO + rewards cluster
CREATE TABLE IF NOT EXISTS public.auto_search_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  template_key text NOT NULL,
  entity_type text,
  entity_id text,
  title text,
  meta_description text,
  content jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.auto_search_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads published pages" ON public.auto_search_pages FOR SELECT USING (status = 'published');
CREATE POLICY "Admins manage pages" ON public.auto_search_pages FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points numeric DEFAULT 0,
  lifetime_points numeric DEFAULT 0,
  tier text DEFAULT 'bronze',
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own rewards" ON public.user_rewards FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage rewards" ON public.user_rewards FOR ALL USING (public.is_admin());

-- Unified activity history is created as a VIEW (see batch 4) mirroring the
-- canonical 20260424050000 definition; no table here.
