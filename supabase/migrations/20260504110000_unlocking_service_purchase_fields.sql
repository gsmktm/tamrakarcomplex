-- Extend unlock requests into purchasable service orders.

ALTER TABLE public.unlock_requests
ADD COLUMN IF NOT EXISTS service_id text,
ADD COLUMN IF NOT EXISTS quoted_price_npr numeric(12,2),
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash_at_store',
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS imei text,
ADD COLUMN IF NOT EXISTS serial_number text,
ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'standard';

CREATE INDEX IF NOT EXISTS idx_unlock_requests_service_id ON public.unlock_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_payment_status ON public.unlock_requests(payment_status);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_imei ON public.unlock_requests(imei);
