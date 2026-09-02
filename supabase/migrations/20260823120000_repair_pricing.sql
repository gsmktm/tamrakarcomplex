-- Additive reconciliation for repair pricing and immutable price audit history.
-- This migration intentionally preserves all existing production rows.

CREATE TABLE IF NOT EXISTS public.repair_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.repair_devices(id) ON DELETE CASCADE,
  service_key text NOT NULL,
  quality text NOT NULL,
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  total_cache numeric(12,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_pricing
  ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES public.repair_devices(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS service_key text,
  ADD COLUMN IF NOT EXISTS quality text,
  ADD COLUMN IF NOT EXISTS base_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_cache numeric(12,2),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.repair_pricing
SET total_cache = round(base_price * 1.13, 2)
WHERE base_price IS NOT NULL AND total_cache IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_repair_pricing_device_service_quality
  ON public.repair_pricing (device_id, service_key, quality)
  WHERE device_id IS NOT NULL AND service_key IS NOT NULL AND quality IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repair_pricing_service_key ON public.repair_pricing (service_key);
CREATE INDEX IF NOT EXISTS idx_repair_pricing_active
  ON public.repair_pricing (device_id, is_active) WHERE is_active = true;

ALTER TABLE public.repair_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active repair pricing" ON public.repair_pricing;
CREATE POLICY "Public can view active repair pricing"
  ON public.repair_pricing FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage repair pricing" ON public.repair_pricing;
CREATE POLICY "Admins can manage repair pricing"
  ON public.repair_pricing FOR ALL TO authenticated
  USING (public.is_staff_admin()) WITH CHECK (public.is_staff_admin());

CREATE TABLE IF NOT EXISTS public.price_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_id uuid NOT NULL REFERENCES public.repair_pricing(id) ON DELETE RESTRICT,
  old_price numeric(12,2),
  new_price numeric(12,2),
  old_total numeric(12,2),
  new_total numeric(12,2),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

CREATE INDEX IF NOT EXISTS idx_price_audit_logs_pricing_changed
  ON public.price_audit_logs (pricing_id, changed_at DESC);
ALTER TABLE public.price_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view price audit logs" ON public.price_audit_logs;
CREATE POLICY "Admins can view price audit logs"
  ON public.price_audit_logs FOR SELECT TO authenticated USING (public.is_staff_admin());
DROP POLICY IF EXISTS "System can insert price audit logs" ON public.price_audit_logs;
REVOKE INSERT, UPDATE, DELETE ON public.price_audit_logs FROM anon, authenticated;
GRANT SELECT ON public.price_audit_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_log_repair_price_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.base_price IS DISTINCT FROM NEW.base_price
     OR OLD.total_cache IS DISTINCT FROM NEW.total_cache THEN
    INSERT INTO public.price_audit_logs (
      pricing_id, old_price, new_price, old_total, new_total, changed_by
    ) VALUES (
      NEW.id, OLD.base_price, NEW.base_price, OLD.total_cache, NEW.total_cache, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_log_repair_price_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_repair_price_change ON public.repair_pricing;
CREATE TRIGGER trg_repair_price_change
  AFTER UPDATE OF base_price, total_cache ON public.repair_pricing
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_repair_price_change();

CREATE OR REPLACE FUNCTION public.fn_update_repair_pricing_timestamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_repair_pricing_updated_at ON public.repair_pricing;
CREATE TRIGGER trg_repair_pricing_updated_at
  BEFORE UPDATE ON public.repair_pricing
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_repair_pricing_timestamp();
