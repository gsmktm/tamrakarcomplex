-- Dedicated Repair and Service module
-- Covers public repair intake, tracking, eligible store assignment, and panel monitoring.

ALTER TABLE public.repair_requests
  ADD COLUMN IF NOT EXISTS tracking_id text,
  ADD COLUMN IF NOT EXISTS assigned_store_id uuid REFERENCES public.stores(id),
  ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_cost numeric(10, 2),
  ADD COLUMN IF NOT EXISTS final_cost numeric(10, 2),
  ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES public.repair_devices(id),
  ADD COLUMN IF NOT EXISTS guide_id uuid REFERENCES public.repair_guides(id);

ALTER TABLE public.repair_requests
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN status SET DEFAULT 'new',
  ALTER COLUMN images SET DEFAULT '[]'::jsonb;

UPDATE public.repair_requests
SET status = CASE status
  WHEN 'pending' THEN 'new'
  WHEN 'in_progress' THEN 'repairing'
  ELSE status
END
WHERE status IN ('pending', 'in_progress');

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.repair_requests'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.repair_requests DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.repair_requests
  ADD CONSTRAINT repair_requests_status_check
  CHECK (status IN ('new', 'assigned', 'inspection', 'repairing', 'ready', 'completed', 'cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS repair_requests_tracking_id_key
  ON public.repair_requests (tracking_id)
  WHERE tracking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repair_requests_user_id ON public.repair_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_repair_requests_assigned_store_id ON public.repair_requests(assigned_store_id);
CREATE INDEX IF NOT EXISTS idx_repair_requests_status ON public.repair_requests(status);

CREATE OR REPLACE FUNCTION public.generate_repair_tracking_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
BEGIN
  LOOP
    candidate := 'TR-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM public.repair_requests WHERE tracking_id = candidate) THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_repair_request_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tracking_id IS NULL OR NEW.tracking_id = '' THEN
    NEW.tracking_id := public.generate_repair_tracking_id();
  END IF;

  IF NEW.images IS NULL THEN
    NEW.images := '[]'::jsonb;
  END IF;

  IF NEW.status IS NULL OR NEW.status = '' THEN
    NEW.status := 'new';
  END IF;

  IF NEW.assigned_store_id IS NOT NULL AND NEW.status = 'new' THEN
    NEW.status := 'assigned';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_set_repair_tracking_id ON public.repair_requests;
DROP TRIGGER IF EXISTS tr_set_repair_request_defaults ON public.repair_requests;
CREATE TRIGGER tr_set_repair_request_defaults
BEFORE INSERT OR UPDATE ON public.repair_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_repair_request_defaults();

CREATE OR REPLACE FUNCTION public.is_repair_store_admin(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = p_store_id
      AND s.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.store_admins sa
    WHERE sa.store_id = p_store_id
      AND sa.user_id = auth.uid()
      AND COALESCE(sa.status, 'active') = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.store_can_receive_repair_leads(
  p_package_slug text,
  p_subscription_status text,
  p_subscription_end_date timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_package_slug IN ('gold', 'diamond')
    AND COALESCE(p_subscription_status, '') = 'active'
    AND (p_subscription_end_date IS NULL OR p_subscription_end_date > now());
$$;

CREATE OR REPLACE FUNCTION public.get_eligible_repair_stores()
RETURNS TABLE (
  id uuid,
  name text,
  package_slug text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.id, s.name, s.package_slug
  FROM public.stores s
  WHERE public.store_can_receive_repair_leads(s.package_slug, s.subscription_status, s.subscription_end_date)
  ORDER BY
    CASE s.package_slug WHEN 'diamond' THEN 1 WHEN 'gold' THEN 2 ELSE 3 END,
    s.name;
$$;

CREATE OR REPLACE FUNCTION public.assign_repair_to_store(p_repair_id uuid, p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin() OR public.is_staff_admin()) THEN
    RAISE EXCEPTION 'Only platform admins can assign repair leads';
  END IF;

  IF p_store_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = p_store_id
      AND public.store_can_receive_repair_leads(s.package_slug, s.subscription_status, s.subscription_end_date)
  ) THEN
    RAISE EXCEPTION 'Store is not eligible for repair leads';
  END IF;

  UPDATE public.repair_requests
  SET assigned_store_id = p_store_id,
      status = CASE WHEN p_store_id IS NULL THEN 'new' ELSE 'assigned' END,
      updated_at = now()
  WHERE id = p_repair_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_repair_tracking(p_tracking_id text)
RETURNS TABLE (
  id uuid,
  tracking_id text,
  status text,
  device_brand text,
  device_model text,
  issue_type text,
  estimated_cost numeric,
  final_cost numeric,
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
    rr.final_cost,
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

CREATE TABLE IF NOT EXISTS public.repair_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  device_brand text,
  issue_type text,
  estimated_price numeric(10, 2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.repair_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active repair services" ON public.repair_services;
CREATE POLICY "Public can view active repair services"
  ON public.repair_services FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = repair_services.store_id
        AND s.package_slug IN ('silver', 'gold', 'diamond')
        AND s.subscription_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Store admins can manage their repair services" ON public.repair_services;
CREATE POLICY "Store admins can manage their repair services"
  ON public.repair_services FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_staff_admin()
    OR public.is_repair_store_admin(store_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_staff_admin()
    OR (
      public.is_repair_store_admin(store_id)
      AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = repair_services.store_id
          AND s.package_slug IN ('silver', 'gold', 'diamond')
          AND s.subscription_status = 'active'
      )
    )
  );

ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own repair requests." ON public.repair_requests;
DROP POLICY IF EXISTS "Users can create repair requests." ON public.repair_requests;
DROP POLICY IF EXISTS "Repair Requests: Anyone can create" ON public.repair_requests;
DROP POLICY IF EXISTS "Admins can manage all repair requests." ON public.repair_requests;
DROP POLICY IF EXISTS "Admins and Store Owners manage repair requests" ON public.repair_requests;
DROP POLICY IF EXISTS "Repair requests owner select" ON public.repair_requests;
DROP POLICY IF EXISTS "Repair requests public insert" ON public.repair_requests;
DROP POLICY IF EXISTS "Repair requests platform manage" ON public.repair_requests;
DROP POLICY IF EXISTS "Repair requests assigned store read" ON public.repair_requests;
DROP POLICY IF EXISTS "Repair requests assigned store update" ON public.repair_requests;

CREATE POLICY "Repair requests public insert"
  ON public.repair_requests FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Repair requests owner select"
  ON public.repair_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Repair requests platform manage"
  ON public.repair_requests FOR ALL
  TO authenticated
  USING (public.is_super_admin() OR public.is_staff_admin() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_super_admin() OR public.is_staff_admin() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Repair requests assigned store read"
  ON public.repair_requests FOR SELECT
  TO authenticated
  USING (assigned_store_id IS NOT NULL AND public.is_repair_store_admin(assigned_store_id));

CREATE POLICY "Repair requests assigned store update"
  ON public.repair_requests FOR UPDATE
  TO authenticated
  USING (assigned_store_id IS NOT NULL AND public.is_repair_store_admin(assigned_store_id))
  WITH CHECK (assigned_store_id IS NOT NULL AND public.is_repair_store_admin(assigned_store_id));

GRANT EXECUTE ON FUNCTION public.get_repair_tracking(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_eligible_repair_stores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_repair_to_store(uuid, uuid) TO authenticated;
