-- Canonical repair state machine, immutable status history, and safe public tracking.
-- Note: gen_random_bytes is schema-qualified because on hosted Supabase pgcrypto
-- installs into the `extensions` schema, not `public` (unlike fresh local DBs).

ALTER TABLE public.repair_requests
  ADD COLUMN IF NOT EXISTS public_tracking_token text,
  ADD COLUMN IF NOT EXISTS warranty_days integer,
  ADD COLUMN IF NOT EXISTS quoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.repair_requests
SET public_tracking_token = upper(encode(extensions.gen_random_bytes(16), 'hex'))
WHERE public_tracking_token IS NULL;

ALTER TABLE public.repair_requests
  ALTER COLUMN public_tracking_token SET DEFAULT upper(encode(extensions.gen_random_bytes(16), 'hex')),
  ALTER COLUMN public_tracking_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_repair_requests_public_tracking_token
  ON public.repair_requests (public_tracking_token);
CREATE INDEX IF NOT EXISTS idx_repair_requests_status_updated
  ON public.repair_requests (status, updated_at DESC);

DO $$
DECLARE v_constraint text;
BEGIN
  FOR v_constraint IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.repair_requests'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.repair_requests DROP CONSTRAINT IF EXISTS %I', v_constraint);
  END LOOP;
END $$;

ALTER TABLE public.repair_requests
  ADD CONSTRAINT repair_requests_status_check
  CHECK (status IN (
    'new', 'assigned', 'inspection', 'quote_pending', 'quote_approved',
    'repairing', 'quality_check', 'ready', 'completed', 'cancelled'
  ));

CREATE TABLE IF NOT EXISTS public.repair_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_request_id uuid NOT NULL REFERENCES public.repair_requests(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_repair_status_history_request_changed
  ON public.repair_status_history (repair_request_id, changed_at DESC);
ALTER TABLE public.repair_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Repair owners read status history" ON public.repair_status_history;
CREATE POLICY "Repair owners read status history"
  ON public.repair_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.repair_requests rr
    WHERE rr.id = repair_request_id AND rr.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Repair operators read status history" ON public.repair_status_history;
CREATE POLICY "Repair operators read status history"
  ON public.repair_status_history FOR SELECT TO authenticated
  USING (
    public.is_super_admin() OR public.is_staff_admin()
    OR EXISTS (
      SELECT 1 FROM public.repair_requests rr
      WHERE rr.id = repair_request_id
        AND rr.assigned_store_id IS NOT NULL
        AND public.is_repair_store_admin(rr.assigned_store_id)
    )
  );
REVOKE INSERT, UPDATE, DELETE ON public.repair_status_history FROM anon, authenticated;
GRANT SELECT ON public.repair_status_history TO authenticated;

CREATE OR REPLACE FUNCTION public.is_valid_repair_transition(p_from text, p_to text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT p_from = p_to OR CASE p_from
    WHEN 'new' THEN p_to IN ('assigned', 'inspection', 'cancelled')
    WHEN 'assigned' THEN p_to IN ('new', 'inspection', 'cancelled')
    WHEN 'inspection' THEN p_to IN ('quote_pending', 'repairing', 'cancelled')
    WHEN 'quote_pending' THEN p_to IN ('quote_approved', 'inspection', 'cancelled')
    WHEN 'quote_approved' THEN p_to IN ('repairing', 'cancelled')
    WHEN 'repairing' THEN p_to IN ('quality_check', 'ready', 'cancelled')
    WHEN 'quality_check' THEN p_to IN ('repairing', 'ready')
    WHEN 'ready' THEN p_to IN ('completed', 'repairing')
    WHEN 'completed' THEN false
    WHEN 'cancelled' THEN false
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_repair_status_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.is_valid_repair_transition(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'invalid_repair_status_transition:%->%', OLD.status, NEW.status
      USING ERRCODE = '22023';
  END IF;
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    NEW.completed_at = coalesce(NEW.completed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_repair_status_transition ON public.repair_requests;
CREATE TRIGGER trg_enforce_repair_status_transition
  BEFORE UPDATE OF status ON public.repair_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_repair_status_transition();

CREATE OR REPLACE FUNCTION public.log_repair_status_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.repair_status_history(repair_request_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.repair_status_history(repair_request_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_repair_status_transition() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_log_repair_status_transition ON public.repair_requests;
CREATE TRIGGER trg_log_repair_status_transition
  AFTER INSERT OR UPDATE OF status ON public.repair_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_repair_status_transition();

INSERT INTO public.repair_status_history(repair_request_id, from_status, to_status, changed_by, metadata)
SELECT rr.id, NULL, rr.status, NULL, '{"backfilled":true}'::jsonb
FROM public.repair_requests rr
WHERE NOT EXISTS (
  SELECT 1 FROM public.repair_status_history h WHERE h.repair_request_id = rr.id
);

CREATE OR REPLACE FUNCTION public.transition_repair_status(
  p_repair_id uuid,
  p_to_status text,
  p_note text DEFAULT NULL
)
RETURNS public.repair_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_repair public.repair_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_repair FROM public.repair_requests WHERE id = p_repair_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'repair_not_found' USING ERRCODE = 'P0002'; END IF;
  IF NOT (
    public.is_super_admin() OR public.is_staff_admin()
    OR (v_repair.assigned_store_id IS NOT NULL AND public.is_repair_store_admin(v_repair.assigned_store_id))
  ) THEN
    RAISE EXCEPTION 'repair_transition_forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_valid_repair_transition(v_repair.status, p_to_status) THEN
    RAISE EXCEPTION 'invalid_repair_status_transition' USING ERRCODE = '22023';
  END IF;
  UPDATE public.repair_requests SET status = p_to_status, updated_at = now()
  WHERE id = p_repair_id RETURNING * INTO v_repair;
  IF nullif(trim(p_note), '') IS NOT NULL THEN
    UPDATE public.repair_status_history
    SET note = left(trim(p_note), 1000)
    WHERE id = (
      SELECT id FROM public.repair_status_history
      WHERE repair_request_id = p_repair_id
      ORDER BY changed_at DESC LIMIT 1
    );
  END IF;
  RETURN v_repair;
END;
$$;
REVOKE ALL ON FUNCTION public.transition_repair_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_repair_status(uuid, text, text) TO authenticated;

-- Drop the legacy-signature function first: earlier deployments created it with
-- a different return shape, and CREATE OR REPLACE cannot change a return type.
DROP FUNCTION IF EXISTS public.get_repair_tracking(p_tracking_id text);
CREATE OR REPLACE FUNCTION public.get_repair_tracking(p_tracking_id text)
RETURNS TABLE (
  tracking_id text,
  status text,
  device_brand text,
  device_model text,
  issue_type text,
  estimated_cost numeric,
  final_cost numeric,
  warranty_days integer,
  created_at timestamptz,
  updated_at timestamptz,
  assigned_store jsonb,
  repair_device jsonb
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp STABLE AS $$
  SELECT rr.tracking_id, rr.status, rr.device_brand, rr.device_model, rr.issue_type,
         rr.estimated_cost, rr.final_cost, rr.warranty_days, rr.created_at, rr.updated_at,
         CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
           'name', s.name, 'location', s.location, 'shop_no', s.shop_no
         ) END,
         CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object('name', d.name, 'image', d.image) END
  FROM public.repair_requests rr
  LEFT JOIN public.stores s ON s.id = rr.assigned_store_id
  LEFT JOIN public.repair_devices d ON d.id = rr.device_id
  WHERE rr.public_tracking_token = upper(trim(p_tracking_id))
     OR upper(rr.tracking_id) = upper(trim(p_tracking_id))
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_repair_tracking(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_repair_tracking(text) TO anon, authenticated;
