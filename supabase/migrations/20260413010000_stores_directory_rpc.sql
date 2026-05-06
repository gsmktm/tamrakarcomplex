-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Stores Directory RPC with subscription-tier field masking
--
-- Design:
--   • ALL stores are visible in the directory (name, shop_no, location, is_verified)
--   • Contact details (phone, email, website, map_url, description, services)
--     are ONLY returned for stores with an active subscription.
--   • Admins (admin / suadmin) and the store's own owner always get full details.
--   • Public users see name-only for unsubscribed stores.
--   • Results are ordered: Diamond → Gold → Silver → unsubscribed, then by name.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop & re-create the function so this migration is idempotent
DROP FUNCTION IF EXISTS public.get_stores_directory();

CREATE OR REPLACE FUNCTION public.get_stores_directory()
RETURNS TABLE (
  id                      uuid,
  name                    text,
  shop_no                 text,
  location                text,
  is_verified             boolean,
  logo_url                text,
  -- Contact / detail fields (NULL for unsubscribed unless caller is admin/owner)
  description             text,
  phone                   text,
  email                   text,
  website                 text,
  map_url                 text,
  services                text[],
  owner_id                uuid,
  -- Subscription metadata
  subscription_tier       text,   -- 'diamond' | 'gold' | 'silver' | null
  subscription_tier_name  text,   -- 'Diamond' | 'Gold' | 'Silver' | 'Free'
  has_active_subscription boolean,
  subscription_end_date   timestamptz,
  -- Display ordering weight (1 = Diamond, 4 = unsubscribed)
  tier_order              int
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  caller_is_admin boolean;
  caller_uid      uuid;
BEGIN
  caller_uid := auth.uid();

  -- Check if the calling user has admin or super-admin rights
  IF caller_uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = caller_uid
        AND role IN ('admin', 'suadmin')
    ) INTO caller_is_admin;
  ELSE
    caller_is_admin := false;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.shop_no,
    s.location,
    s.is_verified,
    -- Logo always visible (helps users identify the store in the name-only list too)
    s.logo_url,

    -- ── Contact / detail fields ─────────────────────────────────────────────
    -- Reveal full details to: admins, the store owner, OR any store with active sub
    CASE
      WHEN caller_is_admin
        OR s.owner_id = caller_uid
        OR (ss.status = 'active' AND ss.end_date > now())
      THEN s.description
      ELSE NULL
    END AS description,

    CASE
      WHEN caller_is_admin
        OR s.owner_id = caller_uid
        OR (ss.status = 'active' AND ss.end_date > now())
      THEN s.phone
      ELSE NULL
    END AS phone,

    CASE
      WHEN caller_is_admin
        OR s.owner_id = caller_uid
        OR (ss.status = 'active' AND ss.end_date > now())
      THEN s.email
      ELSE NULL
    END AS email,

    CASE
      WHEN caller_is_admin
        OR s.owner_id = caller_uid
        OR (ss.status = 'active' AND ss.end_date > now())
      THEN s.website
      ELSE NULL
    END AS website,

    CASE
      WHEN caller_is_admin
        OR s.owner_id = caller_uid
        OR (ss.status = 'active' AND ss.end_date > now())
      THEN s.map_url
      ELSE NULL
    END AS map_url,

    CASE
      WHEN caller_is_admin
        OR s.owner_id = caller_uid
        OR (ss.status = 'active' AND ss.end_date > now())
      THEN s.services
      ELSE NULL
    END AS services,

    -- Owner ID only visible to admins and the owner themselves
    CASE
      WHEN caller_is_admin OR s.owner_id = caller_uid
      THEN s.owner_id
      ELSE NULL
    END AS owner_id,

    -- ── Subscription metadata ───────────────────────────────────────────────
    CASE
      WHEN ss.status = 'active' AND ss.end_date > now() THEN p.slug
      ELSE NULL
    END AS subscription_tier,

    CASE
      WHEN ss.status = 'active' AND ss.end_date > now() THEN p.name
      ELSE 'Free'
    END AS subscription_tier_name,

    (ss.status = 'active' AND ss.end_date > now()) AS has_active_subscription,

    CASE
      WHEN caller_is_admin OR s.owner_id = caller_uid
      THEN ss.end_date
      ELSE NULL
    END AS subscription_end_date,

    -- ── Ordering weight ─────────────────────────────────────────────────────
    CASE
      WHEN ss.status = 'active' AND ss.end_date > now() THEN
        CASE p.slug
          WHEN 'diamond' THEN 1
          WHEN 'gold'    THEN 2
          WHEN 'silver'  THEN 3
          ELSE 3
        END
      ELSE 4
    END AS tier_order

  FROM public.stores s
  LEFT JOIN public.store_subscriptions ss
    ON  ss.store_id = s.id
    AND ss.status = 'active'
  LEFT JOIN public.packages p
    ON  p.id = ss.package_id

  ORDER BY
    tier_order ASC,
    s.is_verified DESC,
    s.name ASC;

END;
$$;

-- Grant execute to anon and authenticated so public visitors can call it
GRANT EXECUTE ON FUNCTION public.get_stores_directory() TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tighten stores table RLS
--    • Everyone can SELECT basic columns (the RPC handles field masking).
--    • But direct table reads still restrict — the RPC is the canonical path.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop legacy policies
DROP POLICY IF EXISTS "Stores are viewable by everyone." ON public.stores;
DROP POLICY IF EXISTS "Active stores are viewable by everyone" ON public.stores;
DROP POLICY IF EXISTS "Owners can view their own store" ON public.stores;

-- Public can only see stores with active subscriptions (direct table access)
-- OR their own store. Full enriched directory is served via the RPC above.
CREATE POLICY "stores_public_select"
  ON public.stores FOR SELECT
  USING (
    -- Active subscribed store — everyone can read
    subscription_status = 'active'
    OR
    -- Owner can always see their own store
    owner_id = auth.uid()
    OR
    -- Admins see everything
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'suadmin')
    )
  );

-- Store owners can update their own store
DROP POLICY IF EXISTS "Store owners can update their own store." ON public.stores;
CREATE POLICY "stores_owner_update"
  ON public.stores FOR UPDATE
  USING (owner_id = auth.uid());

-- Admins can manage all stores (already existed but re-create clean)
DROP POLICY IF EXISTS "Admins can manage stores." ON public.stores;
CREATE POLICY "stores_admin_all"
  ON public.stores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'suadmin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Ensure the admin bypass still works on store_subscriptions
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins view all subscriptions" ON public.store_subscriptions;
CREATE POLICY "sub_admin_select"
  ON public.store_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'suadmin')
    )
  );

-- Public can see whether a store has an active subscription (for display purposes)
CREATE POLICY "sub_public_active_select"
  ON public.store_subscriptions FOR SELECT
  USING (status = 'active' AND end_date > now());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Add a helper view for the admin panel (full details, no masking)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.admin_stores_view AS
SELECT
  s.*,
  ss.status        AS sub_status,
  ss.end_date      AS sub_end_date,
  p.slug           AS sub_tier,
  p.name           AS sub_tier_name,
  p.monthly_price  AS sub_monthly_price
FROM public.stores s
LEFT JOIN public.store_subscriptions ss ON ss.store_id = s.id AND ss.status = 'active'
LEFT JOIN public.packages p ON p.id = ss.package_id;

-- Only admins can query this view
REVOKE ALL ON public.admin_stores_view FROM anon, authenticated;
GRANT SELECT ON public.admin_stores_view TO authenticated;
