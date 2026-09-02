-- Fix store_reviews to match frontend field names
ALTER TABLE public.store_reviews ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.store_reviews ADD COLUMN IF NOT EXISTS review_text text;
-- Keep comment as alias; update review_text from comment if populated
UPDATE public.store_reviews SET review_text = comment WHERE review_text IS NULL AND comment IS NOT NULL;

-- Anon insert allowed (guest reviews)
DROP POLICY IF EXISTS "Anyone can submit review" ON public.store_reviews;
CREATE POLICY "Anyone can submit review" ON public.store_reviews FOR INSERT WITH CHECK (true);
GRANT INSERT ON public.store_reviews TO anon, authenticated;

-- store_leads table
CREATE TABLE IF NOT EXISTS public.store_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name text,
  customer_phone text,
  customer_email text,
  message text,
  lead_type text DEFAULT 'inquiry',
  status text DEFAULT 'new',
  source_page text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit lead" ON public.store_leads;
CREATE POLICY "Anyone can submit lead" ON public.store_leads FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Store owner reads leads" ON public.store_leads;
CREATE POLICY "Store owner reads leads" ON public.store_leads FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE owner_user_id = auth.uid()));
GRANT INSERT ON public.store_leads TO anon, authenticated;
GRANT SELECT ON public.store_leads TO authenticated;

-- exchange_requests table
CREATE TABLE IF NOT EXISTS public.exchange_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name text,
  customer_phone text,
  old_device jsonb DEFAULT '{}',
  new_device jsonb DEFAULT '{}',
  trade_in_value numeric,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exchange_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit exchange" ON public.exchange_requests;
CREATE POLICY "Anyone can submit exchange" ON public.exchange_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Store owner reads exchanges" ON public.exchange_requests;
CREATE POLICY "Store owner reads exchanges" ON public.exchange_requests FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE owner_user_id = auth.uid()));
GRANT INSERT ON public.exchange_requests TO anon, authenticated;
GRANT SELECT ON public.exchange_requests TO authenticated;
