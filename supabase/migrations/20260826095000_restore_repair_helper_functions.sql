-- Hotfix: restore repair helper functions that were lost from the remote
-- database when earlier migrations were applied manually via the SQL editor
-- (their schema objects were never created, even though migration history
-- marked them applied). These definitions are copied verbatim from
-- 20260430008000_dedicated_repair_service_module.sql so later migrations
-- (repair state machine, RBAC audit) can reference them.

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

-- Restore products.store_id lost to manual-application drift (20260414140000
-- is recorded as applied but its DDL never landed on this database).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_store_id
  ON public.products (store_id);
