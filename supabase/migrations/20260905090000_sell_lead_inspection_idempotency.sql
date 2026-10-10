-- Sell lead inspection snapshot + submission idempotency
-- Additive only: new nullable columns and a partial unique index.

DO $$
BEGIN
  IF to_regclass('public.sell_phone_leads') IS NOT NULL THEN
    ALTER TABLE public.sell_phone_leads
      ADD COLUMN IF NOT EXISTS inspection_details jsonb;
    ALTER TABLE public.sell_phone_leads
      ADD COLUMN IF NOT EXISTS submission_key text;

    CREATE UNIQUE INDEX IF NOT EXISTS sell_phone_leads_submission_key_uidx
      ON public.sell_phone_leads (submission_key)
      WHERE submission_key IS NOT NULL;
  END IF;
END $$;
