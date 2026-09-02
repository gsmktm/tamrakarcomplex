-- store_reviews table
CREATE TABLE IF NOT EXISTS public.store_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_store_reviews_store_id ON public.store_reviews(store_id);
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active reviews" ON public.store_reviews;
CREATE POLICY "Public read active reviews" ON public.store_reviews FOR SELECT USING (status = 'active');
GRANT SELECT ON public.store_reviews TO anon, authenticated;

-- store_accessories table
CREATE TABLE IF NOT EXISTS public.store_accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text,
  category text,
  brand text,
  price numeric,
  stock_quantity integer NOT NULL DEFAULT 0,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_store_accessories_store_id ON public.store_accessories(store_id);
ALTER TABLE public.store_accessories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active accessories" ON public.store_accessories;
CREATE POLICY "Public read active accessories" ON public.store_accessories FOR SELECT USING (status = 'active');
GRANT SELECT ON public.store_accessories TO anon, authenticated;

-- store_repair_services table
CREATE TABLE IF NOT EXISTS public.store_repair_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  device_type text,
  device_brand text,
  device_model text,
  estimated_price numeric,
  estimated_time text,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_store_repair_store_id ON public.store_repair_services(store_id);
ALTER TABLE public.store_repair_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active repair services" ON public.store_repair_services;
CREATE POLICY "Public read active repair services" ON public.store_repair_services FOR SELECT USING (status = 'active');
GRANT SELECT ON public.store_repair_services TO anon, authenticated;

-- store_pages table
CREATE TABLE IF NOT EXISTS public.store_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  content text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_store_pages_store_id ON public.store_pages(store_id);
ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read published pages" ON public.store_pages;
CREATE POLICY "Public read published pages" ON public.store_pages FOR SELECT USING (is_published = true);
GRANT SELECT ON public.store_pages TO anon, authenticated;

-- sell_listings: store_id filter was using slug (string) not uuid — fix by ensuring store lookup by slug works
-- Also store_products queries using store_id=eq.<slug> — these need store lookup first; frontend issue
-- Add RLS allow anon on store_products
DROP POLICY IF EXISTS "Anon read active store_products" ON public.store_products;
CREATE POLICY "Anon read active store_products" ON public.store_products FOR SELECT TO anon USING (status = 'active');
