-- Repair Requests: tracking + assignment + internal fields
-- Keeps /repair/custom, /repair/track, and admin /repairs working even if older DB existed.

ALTER TABLE public.repair_requests
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'smartphone',
ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'emergency')),
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS assigned_store_id UUID REFERENCES public.stores(id),
ADD COLUMN IF NOT EXISTS tracking_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES public.repair_devices(id),
ADD COLUMN IF NOT EXISTS guide_id UUID REFERENCES public.repair_guides(id);

-- Function to generate a random tracking ID for repairs
CREATE OR REPLACE FUNCTION public.generate_repair_tracking_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'TR-';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set tracking_id on insert
CREATE OR REPLACE FUNCTION public.set_repair_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL OR NEW.tracking_id = '' THEN
    NEW.tracking_id := public.generate_repair_tracking_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_repair_tracking_id ON public.repair_requests;
CREATE TRIGGER tr_set_repair_tracking_id
BEFORE INSERT ON public.repair_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_repair_tracking_id();

