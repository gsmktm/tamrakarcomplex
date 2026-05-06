-- Secure public repair tracking by tracking_id
-- Exposes a single-row RPC instead of broad public SELECT on repair_requests.

CREATE OR REPLACE FUNCTION public.get_repair_tracking(p_tracking_id text)
RETURNS TABLE (
  id uuid,
  tracking_id text,
  status text,
  device_brand text,
  device_model text,
  issue_type text,
  estimated_cost numeric,
  created_at timestamptz,
  assigned_store jsonb,
  repair_device jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    rr.id,
    rr.tracking_id,
    rr.status,
    rr.device_brand,
    rr.device_model,
    rr.issue_type,
    rr.estimated_cost,
    rr.created_at,
    CASE
      WHEN s.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'name', s.name,
        'location', s.location,
        'shop_no', s.shop_no,
        'phone', s.phone
      )
    END AS assigned_store,
    CASE
      WHEN d.id IS NULL THEN NULL
      ELSE jsonb_build_object('name', d.name, 'image', d.image)
    END AS repair_device
  FROM public.repair_requests rr
  LEFT JOIN public.stores s ON s.id = rr.assigned_store_id
  LEFT JOIN public.repair_devices d ON d.id = rr.device_id
  WHERE upper(rr.tracking_id) = upper(p_tracking_id)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_repair_tracking(text) TO anon, authenticated;

