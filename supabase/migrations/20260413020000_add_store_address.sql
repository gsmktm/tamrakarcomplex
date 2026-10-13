-- Add address column to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS address text;

-- PostgreSQL does not permit CREATE OR REPLACE FUNCTION to change a
-- RETURNS TABLE / OUT-parameter result signature. The previous directory
-- function has no input arguments; explicitly drop that exact signature
-- before replacing it with the address-bearing version. No CASCADE:
-- if a dependent database object exists, fail safely for review.
DROP FUNCTION IF EXISTS public.get_stores_directory();

-- Update get_stores_directory RPC to include address
CREATE OR REPLACE FUNCTION public.get_stores_directory()
RETURNS TABLE (
  id                      uuid,
  name                    text,
  shop_no                 text,
  location                text,
  address                 text, -- Added field
  is_verified             boolean,
  logo_url                text,
  description             text,
  phone                   text,
  email                   text,
  website                 text,
  map_url                 text,
  services                text[],
  owner_id                uuid,
  subscription_tier       text,
  subscription_tier_name  text,
  has_active_subscription boolean,
  subscription_end_date   timestamptz,
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
    s.address, -- Added field
    s.is_verified,
    s.logo_url,

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

    CASE
      WHEN caller_is_admin OR s.owner_id = caller_uid
      THEN s.owner_id
      ELSE NULL
    END AS owner_id,

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

-- A dropped function loses its old execution grants. Restore only the
-- intended directory caller roles after installing the new return contract.
REVOKE ALL ON FUNCTION public.get_stores_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stores_directory() TO anon, authenticated;
