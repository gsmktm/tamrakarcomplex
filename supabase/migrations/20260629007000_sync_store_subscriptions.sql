-- Sync store_subscriptions from stores.subscription_status
-- Self-contained: creates packages + store_subscriptions tables if missing, then seeds data

-- 1. Create packages table if not exists
CREATE TABLE IF NOT EXISTS public.packages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  slug             text NOT NULL UNIQUE,
  price_monthly    numeric NOT NULL DEFAULT 0,
  price_yearly     numeric NOT NULL DEFAULT 0,
  product_limit    integer NOT NULL DEFAULT 10,
  admin_limit      integer NOT NULL DEFAULT 2,
  branch_limit     integer NOT NULL DEFAULT 1,
  promo_slot_limit integer,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- 2. Ensure store_subscriptions table exists (package_id nullable for flexibility)
CREATE TABLE IF NOT EXISTS public.store_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  package_id  uuid REFERENCES public.packages(id),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','expired','cancelled','pending','suspended')),
  is_enabled  boolean NOT NULL DEFAULT true,
  start_date  timestamptz NOT NULL DEFAULT now(),
  end_date    timestamptz NOT NULL DEFAULT (now() + interval '1 year'),
  auto_renew  boolean DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id)
);

ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Suadmin write store_subscriptions" ON public.store_subscriptions;
CREATE POLICY "Suadmin write store_subscriptions" ON public.store_subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('suadmin','staffadmin'))
  );

DROP POLICY IF EXISTS "Store owner read store_subscriptions" ON public.store_subscriptions;
CREATE POLICY "Store owner read store_subscriptions" ON public.store_subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- 3. Seed default "Free" package
INSERT INTO public.packages (name, slug, price_monthly, price_yearly, product_limit, admin_limit, branch_limit, active)
VALUES ('Free', 'free', 0, 0, 50, 2, 1, true)
ON CONFLICT (slug) DO NOTHING;

-- 4. Seed active subscriptions from stores.subscription_status = 'active'
INSERT INTO public.store_subscriptions (store_id, package_id, status, is_enabled, start_date, end_date, auto_renew)
SELECT
  s.id,
  (SELECT id FROM public.packages WHERE slug = 'free' LIMIT 1),
  'active',
  true,
  COALESCE(s.created_at, now()),
  COALESCE(s.created_at, now()) + interval '1 year',
  true
FROM public.stores s
WHERE s.subscription_status = 'active'
ON CONFLICT (store_id) DO NOTHING;

-- 5. Seed inactive/suspended subscriptions
INSERT INTO public.store_subscriptions (store_id, package_id, status, is_enabled, start_date, end_date, auto_renew)
SELECT
  s.id,
  (SELECT id FROM public.packages WHERE slug = 'free' LIMIT 1),
  CASE s.subscription_status
    WHEN 'suspended' THEN 'suspended'
    ELSE 'inactive'
  END,
  false,
  COALESCE(s.created_at, now()),
  COALESCE(s.created_at, now()) + interval '1 year',
  false
FROM public.stores s
WHERE s.subscription_status IN ('inactive', 'suspended')
ON CONFLICT (store_id) DO NOTHING;
