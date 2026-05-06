-- Enhance repair_requests table for marketplace functionality
ALTER TABLE public.repair_requests 
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'smartphone',
ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS assigned_store_id UUID REFERENCES public.stores(id),
ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'emergency')),
ADD COLUMN IF NOT EXISTS tracking_id TEXT UNIQUE;

-- Function to generate a random tracking ID for repairs
CREATE OR REPLACE FUNCTION generate_repair_tracking_id()
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
CREATE OR REPLACE FUNCTION set_repair_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_repair_tracking_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_repair_tracking_id ON public.repair_requests;
CREATE TRIGGER tr_set_repair_tracking_id
BEFORE INSERT ON public.repair_requests
FOR EACH ROW
EXECUTE FUNCTION set_repair_tracking_id();

-- Add comments
COMMENT ON COLUMN public.repair_requests.device_type IS 'Type of device (smartphone, laptop, tablet, wearable, etc.)';
COMMENT ON COLUMN public.repair_requests.urgency IS 'Customer-selected urgency level';
COMMENT ON COLUMN public.repair_requests.assigned_store_id IS 'The store/center assigned to handle this repair';
COMMENT ON COLUMN public.repair_requests.tracking_id IS 'Public tracking ID for customers to check status';
