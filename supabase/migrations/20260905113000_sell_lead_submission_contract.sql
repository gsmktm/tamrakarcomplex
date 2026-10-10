-- Complete the live sell submission contract.
-- Additive and non-destructive: preserve existing leads and policies.

ALTER TABLE public.sell_phone_leads
  ADD COLUMN IF NOT EXISTS inspection_details jsonb;

ALTER TABLE public.sell_phone_leads
  ADD COLUMN IF NOT EXISTS submission_key text;

CREATE UNIQUE INDEX IF NOT EXISTS sell_phone_leads_submission_key_uidx
  ON public.sell_phone_leads (submission_key)
  WHERE submission_key IS NOT NULL;

COMMENT ON COLUMN public.sell_phone_leads.inspection_details IS
  'Normalized device inspection snapshot used for valuation and manual review';

COMMENT ON COLUMN public.sell_phone_leads.submission_key IS
  'Client-generated idempotency key for retry-safe sell submissions';
