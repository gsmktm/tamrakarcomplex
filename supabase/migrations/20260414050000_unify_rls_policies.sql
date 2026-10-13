
-- 1. Redefine RBAC check functions for consistency and performance
-- Security definer functions bypass RLS to check roles

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'suadmin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_store_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT public.is_admin() OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'storeadmin'
    );
$$;

-- Staff-admin check must exist before policies reference it. Fail closed
-- for unauthenticated callers and verify explicit database-granted role only.
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'staffadmin'::public.app_role
  );
$;
REVOKE ALL ON FUNCTION public.is_staff_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_admin() TO authenticated;

-- 2. Update Bootstrap Admin Function
CREATE OR REPLACE FUNCTION public.no_admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role IN ('suadmin'::public.app_role, 'staffadmin'::public.app_role)
  );
$$;

-- SECURITY: A 'first signed-in user becomes suadmin' bootstrap gives the
-- next arbitrary sign-up an administrator role on an empty database.
-- Schema replay must NEVER provision privileged identities. Preserve the RPC
-- signature for older clients but deny unauthorized bootstrap requests.
CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Administrator self-bootstrap is disabled'
    USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.bootstrap_admin() FROM PUBLIC;

-- 3. Unify RLS Policies for all key tables

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Super Admin full access products" ON public.products;
DROP POLICY IF EXISTS "Admin manage products" ON public.products;

CREATE POLICY "Products: Viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Products: Admins manage all" ON public.products FOR ALL TO authenticated USING (public.is_super_admin() OR public.is_staff_admin()) WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

-- Articles
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view published articles" ON public.articles;
DROP POLICY IF EXISTS "Admins can manage articles" ON public.articles;

CREATE POLICY "Articles: Viewable by everyone" ON public.articles FOR SELECT USING (published = true OR public.is_super_admin() OR public.is_staff_admin());
CREATE POLICY "Articles: Admins manage all" ON public.articles FOR ALL TO authenticated USING (public.is_super_admin() OR public.is_staff_admin()) WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

-- Stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores are viewable by everyone." ON public.stores;
DROP POLICY IF EXISTS "Admins can manage stores." ON public.stores;
DROP POLICY IF EXISTS "Store Owners manage own store" ON public.stores;

CREATE POLICY "Stores: Viewable by everyone" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Stores: Admins manage all" ON public.stores FOR ALL TO authenticated USING (public.is_super_admin() OR public.is_staff_admin()) WITH CHECK (public.is_super_admin() OR public.is_staff_admin());
CREATE POLICY "Stores: Owners update own store" ON public.stores FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles: Viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles: Users manage own" ON public.profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Profiles: Admins view all" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());

-- User Roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "User Roles: Users view own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User Roles: Admins manage all" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins view all orders" ON public.orders;

CREATE POLICY "Orders: Users manage own" ON public.orders FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Orders: Admins manage all" ON public.orders FOR ALL TO authenticated USING (public.is_super_admin() OR public.is_staff_admin()) WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

-- Cart and Cart Items (fixing session-id bug)
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can insert their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update their own cart" ON public.carts;

CREATE POLICY "Carts: Users manage own" ON public.carts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;

CREATE POLICY "Cart Items: Users manage own" ON public.cart_items FOR ALL TO authenticated USING (
    cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid())
) WITH CHECK (
    cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid())
);

-- Sell Listings
ALTER TABLE public.sell_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sell listings viewable by everyone" ON public.sell_listings;
DROP POLICY IF EXISTS "Users manage own listings" ON public.sell_listings;

CREATE POLICY "Sell Listings: Viewable by everyone" ON public.sell_listings FOR SELECT USING (status = 'active' OR public.is_admin());
CREATE POLICY "Sell Listings: Users manage own" ON public.sell_listings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Sell Listings: Admins manage all" ON public.sell_listings FOR ALL TO authenticated USING (public.is_super_admin() OR public.is_staff_admin()) WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

-- Guides, Polls, etc.
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guides: Viewable by everyone" ON public.guides FOR SELECT USING (true);
CREATE POLICY "Guides: Admins manage all" ON public.guides FOR ALL TO authenticated USING (public.is_super_admin() OR public.is_staff_admin()) WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Polls: Viewable by everyone" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Polls: Admins manage all" ON public.polls FOR ALL TO authenticated USING (public.is_super_admin() OR public.is_staff_admin()) WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

-- Content Pages, Contact Messages, Chatbot Config
ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view published content pages." ON public.content_pages;
DROP POLICY IF EXISTS "Admins can manage content pages." ON public.content_pages;
CREATE POLICY "Content Pages: Viewable by everyone" ON public.content_pages FOR SELECT USING (is_published = true OR public.is_super_admin() OR public.is_staff_admin());
CREATE POLICY "Content Pages: Admins manage all" ON public.content_pages FOR ALL TO authenticated USING (public.is_super_admin() OR public.is_staff_admin()) WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can send messages." ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can view messages." ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can update messages." ON public.contact_messages;
CREATE POLICY "Contact Messages: Anyone can insert" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Contact Messages: Admins manage all" ON public.contact_messages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.chatbot_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view chatbot config." ON public.chatbot_config;
DROP POLICY IF EXISTS "Admins can manage chatbot config." ON public.chatbot_config;
CREATE POLICY "Chatbot Config: Viewable by everyone" ON public.chatbot_config FOR SELECT USING (true);
CREATE POLICY "Chatbot Config: Admins manage all" ON public.chatbot_config FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- App Settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.app_settings;
DROP POLICY IF EXISTS "Allow admin write access" ON public.app_settings;
CREATE POLICY "App Settings: Viewable by everyone" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "App Settings: Admins manage all" ON public.app_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Referral History
ALTER TABLE public.referral_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referral_history;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referral_history;
CREATE POLICY "Referral History: Users view own" ON public.referral_history FOR SELECT TO authenticated USING (referrer_id = auth.uid());
CREATE POLICY "Referral History: Admins manage all" ON public.referral_history FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Device Catalog, Valuation Rules, Price Catalog
ALTER TABLE public.device_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view device catalog" ON public.device_catalog;
DROP POLICY IF EXISTS "Admins can manage device catalog" ON public.device_catalog;
CREATE POLICY "Device Catalog: Viewable by everyone" ON public.device_catalog FOR SELECT USING (true);
CREATE POLICY "Device Catalog: Admins manage all" ON public.device_catalog FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.valuation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view valuation rules" ON public.valuation_rules;
DROP POLICY IF EXISTS "Admins can manage valuation rules" ON public.valuation_rules;
CREATE POLICY "Valuation Rules: Viewable by everyone" ON public.valuation_rules FOR SELECT USING (true);
CREATE POLICY "Valuation Rules: Admins manage all" ON public.valuation_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.price_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view price catalog" ON public.price_catalog;
DROP POLICY IF EXISTS "Admins can manage price catalog" ON public.price_catalog;
CREATE POLICY "Price Catalog: Viewable by everyone" ON public.price_catalog FOR SELECT USING (true);
CREATE POLICY "Price Catalog: Admins manage all" ON public.price_catalog FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
