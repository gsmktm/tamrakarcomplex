-- Bind repair estimates to an active pricing record. Browser-supplied amounts are never authoritative.

ALTER TABLE public.repair_requests
  ADD COLUMN IF NOT EXISTS repair_pricing_id uuid REFERENCES public.repair_pricing(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS part_quality text;

CREATE INDEX IF NOT EXISTS idx_repair_requests_pricing_id
  ON public.repair_requests (repair_pricing_id)
  WHERE repair_pricing_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_repair_booking_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_price public.repair_pricing%ROWTYPE;
BEGIN
  IF NEW.repair_pricing_id IS NULL THEN
    NEW.estimated_cost = NULL;
    NEW.part_quality = NULL;
    RETURN NEW;
  END IF;

  SELECT * INTO v_price
  FROM public.repair_pricing
  WHERE id = NEW.repair_pricing_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'repair_price_not_available' USING ERRCODE = '22023';
  END IF;
  IF NEW.device_id IS NOT NULL AND NEW.device_id IS DISTINCT FROM v_price.device_id THEN
    RAISE EXCEPTION 'repair_price_device_mismatch' USING ERRCODE = '22023';
  END IF;
  IF NEW.issue_type IS NOT NULL AND NEW.issue_type IS DISTINCT FROM v_price.service_key THEN
    RAISE EXCEPTION 'repair_price_service_mismatch' USING ERRCODE = '22023';
  END IF;

  NEW.device_id = v_price.device_id;
  NEW.issue_type = v_price.service_key;
  NEW.part_quality = v_price.quality;
  NEW.estimated_cost = coalesce(v_price.total_cache, v_price.base_price);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_repair_booking_price() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_enforce_repair_booking_price ON public.repair_requests;
CREATE TRIGGER trg_enforce_repair_booking_price
  BEFORE INSERT OR UPDATE OF repair_pricing_id, estimated_cost, device_id, issue_type
  ON public.repair_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_repair_booking_price();
