-- Hotfix: comprehensive drift reconciliation batch 2.
--
-- Restores objects identified by the full-platform audit: columns referenced
-- by live triggers/RPCs, RPCs called by the frontend, the user-profile
-- cluster (points/wallet/referrals/devices/addresses), and other
-- frontend-referenced tables whose defining migrations never landed.

-- ═══ A. Columns referenced by live triggers/RPCs (BREAKING) ═══

ALTER TABLE public.store_subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly';

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_released_at timestamptz;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS inventory_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS store_product_id uuid;

-- ═══ B. User profile cluster (points, wallets, referrals, devices) ═══

CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  earned_at timestamptz NOT NULL DEFAULT now(),
  source text,
  description text,
  UNIQUE (user_id, earned_at, source)
);
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own points" ON public.user_points FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage points" ON public.user_points FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NPR',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own wallet" ON public.user_wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage wallets" ON public.user_wallets FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('credit','debit','hold','release','refund')),
  description text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions" ON public.wallet_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage transactions" ON public.wallet_transactions FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type text,
  brand text,
  model text,
  imei text,
  purchase_date date,
  nickname text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own devices" ON public.user_devices FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  full_name text NOT NULL,
  phone text NOT NULL,
  city text,
  area text,
  street_address text,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own addresses" ON public.user_addresses FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.referral_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL,
  invitee_email text,
  invitee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','registered','rewarded','expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own invites" ON public.referral_invites FOR SELECT USING (referrer_id = auth.uid());
CREATE POLICY "Admins manage invites" ON public.referral_invites FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.referral_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  points_awarded integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own referral history" ON public.referral_history FOR SELECT USING (referrer_id = auth.uid());
CREATE POLICY "Admins manage referral history" ON public.referral_history FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.user_risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  notes text,
  flagged_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.user_risk_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage risk flags" ON public.user_risk_flags FOR ALL USING (public.is_admin());

-- ═══ C. Marketplace / product reviews / inquiries ═══

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  review_text text,
  images jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved reviews" ON public.product_reviews FOR SELECT USING (status = 'approved' OR user_id = auth.uid());
CREATE POLICY "Users insert own reviews" ON public.product_reviews FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage reviews" ON public.product_reviews FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.listing_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  inquirer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.listing_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can inquire" ON public.listing_inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner reads own inquiries" ON public.listing_inquiries FOR SELECT USING (
  inquirer_user_id = auth.uid() OR public.is_admin()
);

-- ═══ D. Home offers / console / media ═══

CREATE TABLE IF NOT EXISTS public.home_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  link_url text,
  badge text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.home_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active offers" ON public.home_offers FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage offers" ON public.home_offers FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.console_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.console_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage console settings" ON public.console_settings FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.store_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  caption text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read store media" ON public.store_media FOR SELECT USING (true);
CREATE POLICY "Store owner manages media" ON public.store_media FOR ALL USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
);

-- ═══ E. Store credits / diagnostics / analytics ═══

CREATE TABLE IF NOT EXISTS public.store_credit_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_credit_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store members read credits" ON public.store_credit_balances FOR SELECT USING (
  public.is_admin() OR public.is_repair_store_admin(store_id)
);
CREATE POLICY "Admins manage credit balances" ON public.store_credit_balances FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.store_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('credit','debit','adjustment')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store members read credit transactions" ON public.store_credit_transactions FOR SELECT USING (
  public.is_admin() OR public.is_repair_store_admin(store_id)
);
CREATE POLICY "Admins manage credit transactions" ON public.store_credit_transactions FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.repair_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_request_id uuid REFERENCES public.repair_requests(id) ON DELETE CASCADE,
  device_model text,
  symptom text NOT NULL,
  diagnosis text,
  recommended_service text,
  estimated_cost numeric,
  estimated_time text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage diagnostics" ON public.repair_diagnostics FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.device_search_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query text,
  device_type text,
  results_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.device_search_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read search events" ON public.device_search_events FOR SELECT USING (public.is_admin());
CREATE POLICY "Authenticated can log searches" ON public.device_search_events FOR INSERT WITH CHECK (true);
