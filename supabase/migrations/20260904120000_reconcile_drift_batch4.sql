-- Hotfix: comprehensive drift reconciliation batch 4.
--
-- Views and RPCs from the audit: unified activity history view + get_my_history
-- (user history center), get_stores_directory (store directory hook),
-- get_user_points_stats (UserRewardManager — no defining migration existed),
-- staff_performance_summary (StaffDashboard hook).

-- ═══ 1. Unified user activity history view (adapted to live columns) ═══

CREATE OR REPLACE VIEW public.user_activity_history AS
SELECT
  'order' AS activity_type,
  id AS activity_id,
  user_id,
  status,
  total_amount::text AS description,
  created_at
FROM public.orders
UNION ALL
SELECT
  'repair' AS activity_type,
  id AS activity_id,
  user_id,
  status,
  device_model || ' - ' || COALESCE(description, issue_type, '') AS description,
  created_at
FROM public.repair_requests
UNION ALL
SELECT
  'exchange' AS activity_type,
  id AS activity_id,
  NULL::uuid AS user_id,
  status,
  COALESCE(new_device::text, '') AS description,
  created_at
FROM public.exchange_requests
UNION ALL
SELECT
  'unlock' AS activity_type,
  id AS activity_id,
  user_id,
  status,
  COALESCE(model, '') || ' - ' || COALESCE(service_type, '') AS description,
  created_at
FROM public.unlock_requests;

CREATE OR REPLACE FUNCTION public.get_my_history()
RETURNS SETOF public.user_activity_history
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.user_activity_history WHERE user_id = auth.uid() ORDER BY created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_my_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_history() TO authenticated;

-- ═══ 2. get_user_points_stats (UserRewardManager; never had a migration) ═══

CREATE OR REPLACE FUNCTION public.get_user_points_stats(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := COALESCE(p_user_id, auth.uid());
  v_total bigint;
  v_lifetime numeric;
  v_tier text;
BEGIN
  IF v_user IS NULL THEN RETURN NULL; END IF;

  -- Callers may read their own stats; admins may read anyone's.
  IF v_user <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'insufficient_role' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(points), 0) INTO v_total FROM public.user_points WHERE user_id = v_user;
  SELECT COALESCE(lifetime_points, 0), COALESCE(tier, 'bronze')
    INTO v_lifetime, v_tier
  FROM public.user_rewards WHERE user_id = v_user;

  IF NOT FOUND THEN v_lifetime := 0; v_tier := 'bronze'; END IF;

  RETURN jsonb_build_object(
    'user_id', v_user,
    'points', v_total,
    'lifetime_points', v_lifetime,
    'tier', v_tier
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_user_points_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_points_stats(uuid) TO authenticated;

-- ═══ 3. staff_performance_summary (StaffDashboard hook) ═══
-- Frontend expects a table-like relation of staff performance rows.

CREATE TABLE IF NOT EXISTS public.staff_performance_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL DEFAULT CURRENT_DATE - INTERVAL '30 days',
  period_end date NOT NULL DEFAULT CURRENT_DATE,
  tasks_completed integer DEFAULT 0,
  tasks_assigned integer DEFAULT 0,
  avg_response_hours numeric,
  customer_rating numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_user_id, period_start, period_end)
);
ALTER TABLE public.staff_performance_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read staff performance" ON public.staff_performance_summary
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins manage staff performance" ON public.staff_performance_summary
  FOR ALL USING (public.is_admin());
CREATE INDEX IF NOT EXISTS idx_staff_perf_user ON public.staff_performance_summary (staff_user_id, period_end DESC);

-- ═══ 4. get_stores_directory (store directory hook; hook also has a table
--      fallback, this restores the canonical fast path) ═══

CREATE OR REPLACE FUNCTION public.get_stores_directory()
RETURNS TABLE (
  id uuid,
  name text,
  shop_no text,
  location text,
  is_verified boolean,
  logo_url text,
  description text,
  phone text,
  email text,
  website text,
  map_url text,
  services text[],
  owner_id uuid,
  subscription_tier text,
  subscription_tier_name text,
  has_active_subscription boolean,
  subscription_end_date timestamptz,
  tier_order int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    s.id,
    s.name,
    s.shop_no,
    s.location,
    COALESCE(s.is_verified, false),
    s.logo_url,
    s.description,
    s.phone,
    s.email,
    s.website,
    s.map_url,
    COALESCE(s.services, ARRAY(SELECT jsonb_array_elements_text(COALESCE(s.services_json, '[]'::jsonb))), '{}'::text[]),
    s.owner_id,
    COALESCE(s.package_slug, 'free'),
    CASE COALESCE(s.package_slug, 'free')
      WHEN 'diamond' THEN 'Diamond'
      WHEN 'gold' THEN 'Gold'
      WHEN 'silver' THEN 'Silver'
      ELSE 'Basic'
    END,
    s.subscription_status = 'active',
    s.subscription_end_date,
    CASE COALESCE(s.package_slug, 'free')
      WHEN 'diamond' THEN 1
      WHEN 'gold' THEN 2
      WHEN 'silver' THEN 3
      ELSE 4
    END
  FROM public.stores s
  WHERE COALESCE(s.subscription_status, 'active') = 'active' OR COALESCE(s.is_verified, false)
  ORDER BY
    CASE COALESCE(s.package_slug, 'free')
      WHEN 'diamond' THEN 1
      WHEN 'gold' THEN 2
      WHEN 'silver' THEN 3
      ELSE 4
    END,
    s.is_verified DESC NULLS LAST,
    s.name;
$$;
REVOKE ALL ON FUNCTION public.get_stores_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stores_directory() TO authenticated, anon;
