-- Add tracking_id to repair_requests + create get_repair_tracking RPC

ALTER TABLE public.repair_requests
  ADD COLUMN IF NOT EXISTS tracking_id text UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assigned_store_id uuid REFERENCES public.stores(id),
  ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_cost numeric,
  ADD COLUMN IF NOT EXISTS final_cost numeric,
  ADD COLUMN IF NOT EXISTS guide_id uuid REFERENCES public.repair_guides(id),
  ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES public.repair_devices(id);

-- Generate tracking_id for existing rows that lack one
UPDATE public.repair_requests
SET tracking_id = 'TRK-' || UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE tracking_id IS NULL;

-- Make tracking_id non-null with default for future rows
ALTER TABLE public.repair_requests
  ALTER COLUMN tracking_id SET DEFAULT 'TRK-' || UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));

CREATE INDEX IF NOT EXISTS idx_repair_requests_tracking_id ON public.repair_requests(tracking_id);
CREATE INDEX IF NOT EXISTS idx_repair_requests_phone ON public.repair_requests(phone);
CREATE INDEX IF NOT EXISTS idx_repair_requests_status ON public.repair_requests(status);

-- RPC: get_repair_tracking
-- Returns repair request + store name by tracking_id (or id)
CREATE OR REPLACE FUNCTION public.get_repair_tracking(p_tracking_id text)
RETURNS TABLE (
  id uuid,
  tracking_id text,
  name text,
  phone text,
  email text,
  device_brand text,
  device_model text,
  issue_type text,
  description text,
  status text,
  estimated_cost numeric,
  final_cost numeric,
  preferred_date date,
  created_at timestamptz,
  updated_at timestamptz,
  store_name text,
  store_slug text
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    r.id,
    r.tracking_id,
    r.name,
    r.phone,
    r.email,
    r.device_brand,
    r.device_model,
    r.issue_type,
    r.description,
    r.status,
    r.estimated_cost,
    r.final_cost,
    r.preferred_date,
    r.created_at,
    r.updated_at,
    s.name AS store_name,
    s.slug AS store_slug
  FROM public.repair_requests r
  LEFT JOIN public.stores s ON s.id = r.assigned_store_id
  WHERE r.tracking_id = p_tracking_id
     OR r.id::text = p_tracking_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_repair_tracking(text) TO anon, authenticated;

-- RLS: allow public to select their own request by tracking_id (via RPC)
-- The RPC is SECURITY DEFINER so it bypasses RLS already.
-- Ensure authenticated users can INSERT repair_requests
DROP POLICY IF EXISTS "Anyone can submit repair request" ON public.repair_requests;
CREATE POLICY "Anyone can submit repair request"
  ON public.repair_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users view own repair requests" ON public.repair_requests;
CREATE POLICY "Users view own repair requests"
  ON public.repair_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Admins manage all repair requests
DROP POLICY IF EXISTS "Admins manage repair requests" ON public.repair_requests;
CREATE POLICY "Admins manage repair requests"
  ON public.repair_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('suadmin', 'admin')
    )
  );
