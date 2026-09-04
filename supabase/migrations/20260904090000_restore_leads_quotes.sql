-- Hotfix: restore leads_quotes table lost to manual-apply drift.
--
-- 20260504000000_create_missing_tables.sql is recorded as applied on this
-- database but its DDL never landed. leads_quotes is the valuation-quote
-- storage queried by UserDashboard, ExchangeHistoryPanel, sellPhoneService,
-- and submissionService (quote history panel).

CREATE TABLE IF NOT EXISTS public.leads_quotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name            text NOT NULL,
  phone           text NOT NULL,
  email           text,
  device_brand    text,
  device_model    text,
  condition       text,
  quote_amount    numeric,
  status          text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','scheduled','completed','cancelled')),
  assigned_store  uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insert leads_quotes" ON public.leads_quotes;
CREATE POLICY "Insert leads_quotes" ON public.leads_quotes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff read leads_quotes" ON public.leads_quotes;
CREATE POLICY "Staff read leads_quotes" ON public.leads_quotes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin','storeadmin'))
  );

DROP POLICY IF EXISTS "Staff update leads_quotes" ON public.leads_quotes;
CREATE POLICY "Staff update leads_quotes" ON public.leads_quotes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('suadmin','staffadmin','storeadmin'))
  );

-- Owners should also be able to read their own quote history.
DROP POLICY IF EXISTS "Users read own leads_quotes" ON public.leads_quotes;
CREATE POLICY "Users read own leads_quotes" ON public.leads_quotes
  FOR SELECT USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_leads_quotes_user ON public.leads_quotes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_quotes_store ON public.leads_quotes (assigned_store, status);
