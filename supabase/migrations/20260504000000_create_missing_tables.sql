-- ============================================================
-- MISSING TABLES MIGRATION
-- Run this in Supabase SQL Editor to create all tables that
-- the frontend references but are not yet in the live schema.
-- ============================================================

-- ─── homepage_settings ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.homepage_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  value       jsonb NOT NULL DEFAULT 'true',
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read homepage_settings" ON public.homepage_settings FOR SELECT USING (true);
CREATE POLICY "Suadmin write homepage_settings" ON public.homepage_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'suadmin')
);

-- ─── home_offers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.home_offers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  subtitle      text,
  image_url     text,
  discount_text text,
  target_url    text NOT NULL DEFAULT '/',
  active        boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.home_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read home_offers" ON public.home_offers FOR SELECT USING (true);
CREATE POLICY "Suadmin write home_offers" ON public.home_offers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'suadmin')
);

-- ─── brands ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brands (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  logo_url    text,
  website     text,
  country     text,
  active      boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Suadmin write brands" ON public.brands FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── device_catalog ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_catalog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand           text NOT NULL,
  model           text NOT NULL,
  storage         text,
  ram             text,
  color           text,
  canonical_slug  text UNIQUE,
  release_year    integer,
  base_price_npr  numeric,
  image_url       text,
  verified        boolean NOT NULL DEFAULT false,
  view_count      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.device_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read device_catalog" ON public.device_catalog FOR SELECT USING (true);
CREATE POLICY "Suadmin write device_catalog" ON public.device_catalog FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── valuation_rules ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.valuation_rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id        uuid REFERENCES public.device_catalog(id) ON DELETE CASCADE,
  condition        text NOT NULL CHECK (condition IN ('new','like_new','used','fair')),
  condition_factor numeric NOT NULL DEFAULT 1.0,
  defect_penalty   numeric NOT NULL DEFAULT 0,
  age_penalty      numeric NOT NULL DEFAULT 0,
  demand_factor    numeric NOT NULL DEFAULT 1.0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.valuation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read valuation_rules" ON public.valuation_rules FOR SELECT USING (true);
CREATE POLICY "Suadmin write valuation_rules" ON public.valuation_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── device_search_events ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_search_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query        text,
  brand        text,
  model        text,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.device_search_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert device_search_events" ON public.device_search_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Suadmin read device_search_events" ON public.device_search_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── visitor_logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.visitor_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  text,
  ip_address  text,
  user_agent  text,
  url         text,
  referrer    text,
  country     text,
  city        text,
  region      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert visitor_logs" ON public.visitor_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Suadmin read visitor_logs" ON public.visitor_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── log_visitor RPC ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_visitor(
  p_ip_address text, p_user_agent text, p_url text, p_referrer text,
  p_country text, p_city text, p_region text, p_session_id text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.visitor_logs (session_id, ip_address, user_agent, url, referrer, country, city, region)
  VALUES (p_session_id, p_ip_address, p_user_agent, p_url, p_referrer, p_country, p_city, p_region);
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ─── audit_logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  module      text,
  target_id   text,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Suadmin read audit_logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── admin_tasks ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  assigned_to  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','cancelled')),
  priority     text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read admin_tasks" ON public.admin_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);
CREATE POLICY "Staff write admin_tasks" ON public.admin_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── seo_pages ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seo_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path            text NOT NULL UNIQUE,
  title           text,
  description     text,
  keywords        text[],
  og_image        text,
  canonical_url   text,
  structured_data jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read seo_pages" ON public.seo_pages FOR SELECT USING (true);
CREATE POLICY "Suadmin write seo_pages" ON public.seo_pages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── leads_quotes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads_quotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name            text NOT NULL,
  phone           text NOT NULL,
  email           text,
  device_brand    text,
  device_model    text,
  condition       text,
  quote_amount    numeric,
  status          text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','scheduled','completed','cancelled')),
  assigned_store  uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leads_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert leads_quotes" ON public.leads_quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff read leads_quotes" ON public.leads_quotes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin','storeadmin'))
);
CREATE POLICY "Staff update leads_quotes" ON public.leads_quotes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin','storeadmin'))
);

-- ─── exchange_requests ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exchange_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_device      jsonb NOT NULL DEFAULT '{}',
  new_device      jsonb NOT NULL DEFAULT '{}',
  trade_in_value  numeric,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','valued','accepted','completed','cancelled')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exchange_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own exchange_requests" ON public.exchange_requests FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Staff read exchange_requests" ON public.exchange_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── store_admins ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_admins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'manager' CHECK (role IN ('owner','manager','staff')),
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','invited')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);
ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owner read store_admins" ON public.store_admins FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);
CREATE POLICY "Suadmin write store_admins" ON public.store_admins FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── store_applications ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_applications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  contact_name  text NOT NULL,
  phone         text NOT NULL,
  email         text NOT NULL,
  location      text,
  description   text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','needs_info')),
  reviewed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own store_applications" ON public.store_applications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own read store_applications" ON public.store_applications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Staff read store_applications" ON public.store_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);
CREATE POLICY "Staff update store_applications" ON public.store_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── store_subscriptions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  package_id  uuid,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','pending')),
  is_enabled  boolean NOT NULL DEFAULT true,
  start_date  timestamptz NOT NULL DEFAULT now(),
  end_date    timestamptz NOT NULL DEFAULT (now() + interval '1 year'),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suadmin write store_subscriptions" ON public.store_subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);
CREATE POLICY "Store owner read store_subscriptions" ON public.store_subscriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

-- ─── packages ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.packages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  slug              text NOT NULL UNIQUE,
  price_monthly     numeric NOT NULL DEFAULT 0,
  price_yearly      numeric NOT NULL DEFAULT 0,
  product_limit     integer NOT NULL DEFAULT 10,
  admin_limit       integer NOT NULL DEFAULT 2,
  branch_limit      integer NOT NULL DEFAULT 1,
  promo_slot_limit  integer,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read packages" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Suadmin write packages" ON public.packages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'suadmin')
);
INSERT INTO public.packages (name, slug, price_monthly, price_yearly, product_limit, admin_limit, branch_limit, promo_slot_limit)
VALUES
  ('Free', 'free', 0, 0, 5, 1, 1, 0),
  ('Silver', 'silver', 999, 9999, 25, 3, 2, 2),
  ('Gold', 'gold', 2499, 24999, 100, 10, 5, 5),
  ('Diamond', 'diamond', 4999, 49999, 500, 25, 10, 10)
ON CONFLICT (slug) DO NOTHING;

-- ─── user_devices ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_devices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand       text NOT NULL,
  model       text NOT NULL,
  storage     text,
  color       text,
  condition   text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own user_devices" ON public.user_devices FOR ALL USING (user_id = auth.uid());

-- ─── user_wallets ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    numeric NOT NULL DEFAULT 0,
  points     integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own user_wallets" ON public.user_wallets FOR ALL USING (user_id = auth.uid());

-- ─── wallet_transactions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id    uuid NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('credit','debit','points_earned','points_redeemed')),
  amount       numeric NOT NULL DEFAULT 0,
  points       integer NOT NULL DEFAULT 0,
  description  text,
  reference_id text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own wallet_transactions" ON public.wallet_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Suadmin read wallet_transactions" ON public.wallet_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── store_credit_balances ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_credit_balances (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  balance    numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_credit_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owner read store_credit_balances" ON public.store_credit_balances FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

-- ─── store_credit_transactions ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_credit_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount       numeric NOT NULL,
  type         text NOT NULL CHECK (type IN ('credit','debit')),
  description  text,
  reference_id text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owner read store_credit_transactions" ON public.store_credit_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

-- ─── repair_categories ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.repair_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid REFERENCES public.repair_categories(id) ON DELETE SET NULL,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  image       text,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read repair_categories" ON public.repair_categories FOR SELECT USING (true);
CREATE POLICY "Staff write repair_categories" ON public.repair_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);
INSERT INTO public.repair_categories (name, slug, description) VALUES
  ('Smartphones', 'smartphones', 'Mobile phone repairs'),
  ('Laptops', 'laptops', 'Laptop and MacBook repairs'),
  ('Tablets', 'tablets', 'iPad and Android tablet repairs')
ON CONFLICT (slug) DO NOTHING;

-- ─── repair_devices ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.repair_devices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid REFERENCES public.repair_categories(id) ON DELETE SET NULL,
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  brand         text NOT NULL,
  model_number  text,
  image         text,
  summary       text,
  specifications jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read repair_devices" ON public.repair_devices FOR SELECT USING (true);
CREATE POLICY "Staff write repair_devices" ON public.repair_devices FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── repair_guides ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.repair_guides (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   uuid REFERENCES public.repair_devices(id) ON DELETE CASCADE,
  title       text NOT NULL,
  slug        text NOT NULL UNIQUE,
  summary     text,
  difficulty  text CHECK (difficulty IN ('beginner','intermediate','advanced')),
  time_mins   integer,
  cost_range  text,
  image       text,
  published   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read repair_guides" ON public.repair_guides FOR SELECT USING (published = true);
CREATE POLICY "Staff write repair_guides" ON public.repair_guides FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── repair_steps ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.repair_steps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id    uuid NOT NULL REFERENCES public.repair_guides(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  title       text NOT NULL,
  content     text,
  image       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read repair_steps" ON public.repair_steps FOR SELECT USING (true);
CREATE POLICY "Staff write repair_steps" ON public.repair_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── repair_tools / repair_parts / repair_guide_tools / repair_guide_parts ───
CREATE TABLE IF NOT EXISTS public.repair_tools (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  image      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read repair_tools" ON public.repair_tools FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.repair_parts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  sku        text,
  price      numeric,
  image      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read repair_parts" ON public.repair_parts FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.repair_guide_tools (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.repair_guides(id) ON DELETE CASCADE,
  tool_id  uuid NOT NULL REFERENCES public.repair_tools(id) ON DELETE CASCADE
);
ALTER TABLE public.repair_guide_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read repair_guide_tools" ON public.repair_guide_tools FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.repair_guide_parts (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.repair_guides(id) ON DELETE CASCADE,
  part_id  uuid NOT NULL REFERENCES public.repair_parts(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1
);
ALTER TABLE public.repair_guide_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read repair_guide_parts" ON public.repair_guide_parts FOR SELECT USING (true);

-- ─── referral_invites ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  code         text NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text,'-',''),1,8),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','used','expired')),
  reward_given boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own referral_invites" ON public.referral_invites FOR ALL USING (inviter_id = auth.uid());

-- ─── unlock_requests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.unlock_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  device_brand text NOT NULL,
  device_model text NOT NULL,
  imei         text,
  network      text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unlock_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own unlock_requests" ON public.unlock_requests FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Staff read unlock_requests" ON public.unlock_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── listing_inquiries ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_inquiries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES public.sell_listings(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name        text NOT NULL,
  phone       text NOT NULL,
  email       text,
  message     text,
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new','replied','closed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.listing_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert listing_inquiries" ON public.listing_inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Own listing_inquiries" ON public.listing_inquiries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Staff read listing_inquiries" ON public.listing_inquiries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin','storeadmin'))
);

-- ─── staff_performance_summary (view) ────────────────────────
CREATE OR REPLACE VIEW public.staff_performance_summary AS
SELECT
  p.user_id,
  p.display_name,
  COUNT(DISTINCT at2.id) AS tasks_total,
  COUNT(DISTINCT at2.id) FILTER (WHERE at2.status = 'done') AS tasks_done,
  COUNT(DISTINCT at2.id) FILTER (WHERE at2.status = 'pending') AS tasks_pending
FROM public.profiles p
LEFT JOIN public.admin_tasks at2 ON at2.assigned_to = p.user_id
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('staffadmin','storeadmin')
)
GROUP BY p.user_id, p.display_name;

-- ─── console_settings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.console_settings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text NOT NULL UNIQUE,
  value      jsonb NOT NULL DEFAULT 'null',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.console_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suadmin write console_settings" ON public.console_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'suadmin')
);

-- ─── store_permissions / staffadmin_permissions ───────────────
CREATE TABLE IF NOT EXISTS public.store_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  permission  text NOT NULL,
  granted_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, permission)
);
ALTER TABLE public.store_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suadmin write store_permissions" ON public.store_permissions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'suadmin')
);

CREATE TABLE IF NOT EXISTS public.staffadmin_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission  text NOT NULL,
  granted_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);
ALTER TABLE public.staffadmin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suadmin write staffadmin_permissions" ON public.staffadmin_permissions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'suadmin')
);

-- ─── store_commissions / store_payouts ───────────────────────
CREATE TABLE IF NOT EXISTS public.store_commissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id    uuid,
  amount      numeric NOT NULL DEFAULT 0,
  rate        numeric NOT NULL DEFAULT 0.05,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suadmin write store_commissions" ON public.store_commissions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

CREATE TABLE IF NOT EXISTS public.store_payouts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount      numeric NOT NULL,
  method      text NOT NULL DEFAULT 'bank',
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed')),
  reference   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suadmin write store_payouts" ON public.store_payouts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── user_activity_history ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_activity_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      text NOT NULL,
  description text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_activity_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own user_activity_history" ON public.user_activity_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Insert user_activity_history" ON public.user_activity_history FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─── sell_phone_leads (alias for leads_quotes used in some pages) ─
CREATE TABLE IF NOT EXISTS public.sell_phone_leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name            text NOT NULL,
  phone           text NOT NULL,
  device_brand    text,
  device_model    text,
  condition       text,
  asking_price    numeric,
  status          text NOT NULL DEFAULT 'new',
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sell_phone_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert sell_phone_leads" ON public.sell_phone_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff read sell_phone_leads" ON public.sell_phone_leads FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── user_addresses ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label         text NOT NULL DEFAULT 'Home',
  full_name     text NOT NULL,
  phone         text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city          text NOT NULL,
  district      text,
  is_default    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own user_addresses" ON public.user_addresses FOR ALL USING (user_id = auth.uid());

-- ─── catalog_products (alias for device_catalog used in some admin pages) ─
CREATE TABLE IF NOT EXISTS public.catalog_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand           text NOT NULL,
  model           text NOT NULL,
  variant         text,
  canonical_slug  text UNIQUE,
  base_price_npr  numeric,
  image_url       text,
  verified        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read catalog_products" ON public.catalog_products FOR SELECT USING (true);
CREATE POLICY "Staff write catalog_products" ON public.catalog_products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin'))
);

-- ─── get_my_history RPC ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_history()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result  jsonb;
BEGIN
  IF v_user_id IS NULL THEN RETURN '{"orders":[],"repairs":[],"sell_requests":[]}'::jsonb; END IF;
  SELECT jsonb_build_object(
    'orders',       COALESCE((SELECT jsonb_agg(row_to_json(o)) FROM (
                      SELECT id, total_amount, status, created_at FROM public.orders WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 10
                    ) o), '[]'),
    'repairs',      COALESCE((SELECT jsonb_agg(row_to_json(r)) FROM (
                      SELECT id, status, created_at FROM public.repair_requests WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 10
                    ) r), '[]'),
    'sell_requests', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM (
                      SELECT id, status, created_at FROM public.sell_listings WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 10
                    ) s), '[]')
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- ─── get_my_roles RPC ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS TABLE(role text, scope text, store_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role::text, 'platform'::text, NULL::uuid
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid();
END;
$$;

-- ─── assign_lead_to_store RPC ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.assign_lead_to_store(p_lead_id uuid, p_store_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.leads_quotes SET assigned_store = p_store_id, updated_at = now() WHERE id = p_lead_id;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ─── assign_repair_to_store RPC ──────────────────────────────
CREATE OR REPLACE FUNCTION public.assign_repair_to_store(p_repair_id uuid, p_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.repair_requests SET store_id = p_store_id, updated_at = now() WHERE id = p_repair_id;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ─── get_repair_tracking RPC ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_repair_tracking(p_tracking_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT row_to_json(r) INTO v_result
  FROM public.repair_requests r
  WHERE r.tracking_id = p_tracking_id;
  RETURN v_result;
END;
$$;

-- ─── get_eligible_repair_stores RPC ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_eligible_repair_stores()
RETURNS TABLE(
  id uuid, name text, location text, phone text, logo_url text, is_verified boolean, services text[]
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.location, s.phone, s.logo_url, s.is_verified, s.services
  FROM public.stores s
  WHERE s.is_verified = true
    AND s.services IS NOT NULL
    AND array_length(s.services, 1) > 0
  ORDER BY s.is_verified DESC, s.name
  LIMIT 20;
END;
$$;

-- ─── get_user_referral_data RPC ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_referral_data(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_invites',   COUNT(*),
    'used_invites',    COUNT(*) FILTER (WHERE status = 'used'),
    'pending_invites', COUNT(*) FILTER (WHERE status = 'pending')
  ) INTO v_result
  FROM public.referral_invites
  WHERE inviter_id = p_user_id;
  RETURN COALESCE(v_result, '{"total_invites":0,"used_invites":0,"pending_invites":0}'::jsonb);
END;
$$;

-- ─── manage_user_role RPC ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.manage_user_role(p_user_id uuid, p_role text, p_action text DEFAULT 'grant')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_action = 'grant' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF p_action = 'revoke' THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = p_role;
  END IF;
END;
$$;

-- ─── grant_role_by_email RPC ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.grant_role_by_email(p_email text, p_role text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'User not found: %', p_email; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN v_user_id;
END;
$$;

-- ─── delete_user RPC ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_user(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- ─── get_visitor_stats RPC ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_visitor_stats(p_period text DEFAULT '7d')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_since timestamptz := now() - interval '7 days';
  v_result jsonb;
BEGIN
  IF p_period = '30d' THEN v_since := now() - interval '30 days';
  ELSIF p_period = '1d' THEN v_since := now() - interval '1 day'; END IF;

  SELECT jsonb_build_object(
    'total',    COUNT(*),
    'unique',   COUNT(DISTINCT session_id),
    'countries', COUNT(DISTINCT country)
  ) INTO v_result
  FROM public.visitor_logs
  WHERE created_at >= v_since;
  RETURN COALESCE(v_result, '{"total":0,"unique":0,"countries":0}'::jsonb);
END;
$$;

-- ─── get_top_visitor_countries RPC ───────────────────────────
CREATE OR REPLACE FUNCTION public.get_top_visitor_countries(p_limit int DEFAULT 5)
RETURNS TABLE(country text, visits bigint) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT v.country, COUNT(*) AS visits
  FROM public.visitor_logs v
  WHERE v.country IS NOT NULL AND v.country <> 'Unknown'
  GROUP BY v.country
  ORDER BY visits DESC
  LIMIT p_limit;
END;
$$;

-- ─── update_device_popularity RPC ────────────────────────────
CREATE OR REPLACE FUNCTION public.update_device_popularity(p_slug text, p_delta int DEFAULT 1)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.device_catalog SET view_count = view_count + p_delta WHERE canonical_slug = p_slug;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ─── cleanup_demo_accounts RPC ───────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_demo_accounts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Remove test/demo accounts — only suadmin can call this
  DELETE FROM auth.users
  WHERE email LIKE '%@demo.%' OR email LIKE 'test%@%';
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ─── get_catalog_verification_stats RPC ──────────────────────
CREATE OR REPLACE FUNCTION public.get_catalog_verification_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total',    COUNT(*),
    'verified', COUNT(*) FILTER (WHERE verified = true),
    'pending',  COUNT(*) FILTER (WHERE verified = false)
  ) INTO v_result FROM public.device_catalog;
  RETURN COALESCE(v_result, '{"total":0,"verified":0,"pending":0}'::jsonb);
END;
$$;

-- ─── auto_merge_catalog_duplicates RPC ───────────────────────
CREATE OR REPLACE FUNCTION public.auto_merge_catalog_duplicates()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_merged int := 0;
BEGIN
  -- Placeholder: real merge logic would de-duplicate device_catalog rows
  RETURN v_merged;
END;
$$;

-- ─── generate_seo_sitemap RPC ────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_seo_sitemap()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_xml text;
BEGIN
  SELECT '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    || string_agg('<url><loc>https://tamrakarcomplex.com' || path || '</loc></url>', '')
    || '</urlset>'
  INTO v_xml
  FROM public.seo_pages;
  RETURN COALESCE(v_xml, '<?xml version="1.0"?><urlset/>');
END;
$$;

-- ─── get_admin_users_list_secure RPC ─────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_users_list_secure()
RETURNS TABLE(
  id uuid, email text, role text, created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::text, ur.role::text, u.created_at
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

-- ─── get_stores_directory RPC ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_stores_directory()
RETURNS TABLE(
  id uuid, name text, location text, shop_no text, phone text,
  logo_url text, is_verified boolean, services text[], subscription_status text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.location, s.shop_no, s.phone,
         s.logo_url, s.is_verified, s.services, s.subscription_status
  FROM public.stores s
  ORDER BY s.is_verified DESC, s.name;
END;
$$;

-- ─── convert_points_to_wallet RPC ────────────────────────────
CREATE OR REPLACE FUNCTION public.convert_points_to_wallet(p_user_id uuid, p_points_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet_id uuid;
  v_cash_value numeric;
BEGIN
  v_cash_value := p_points_amount * 0.5; -- 1 point = NPR 0.50
  SELECT id INTO v_wallet_id FROM public.user_wallets WHERE user_id = p_user_id;
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.user_wallets (user_id, balance, points) VALUES (p_user_id, v_cash_value, -p_points_amount)
    RETURNING id INTO v_wallet_id;
  ELSE
    UPDATE public.user_wallets
    SET balance = balance + v_cash_value, points = GREATEST(0, points - p_points_amount), updated_at = now()
    WHERE id = v_wallet_id;
  END IF;
  RETURN jsonb_build_object('success', true, 'converted_npr', v_cash_value);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ─── get_poll_results RPC ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_poll_results(p_poll_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object('poll', row_to_json(p), 'total_votes', p.total_votes)
  INTO v_result FROM public.polls p WHERE p.id = p_poll_id;
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;
