-- Hotfix: reconcile audit_logs schema drift.
--
-- 20260430009000_strong_staff_permissions_work_control.sql (recorded as
-- applied on this database, but its DDL never landed via manual application)
-- added the actor_user_id/action_key/module_key column family that
-- log_privileged_action() — created by 20260827000000_phase6_admin_rbac_audit
-- and used by every suadmin payment-provider RPC — writes to. Without these
-- columns every audited suadmin RPC fails with
-- 'column "actor_user_id" of relation "audit_logs" does not exist'.
--
-- Column additions are idempotent (ADD COLUMN IF NOT EXISTS); remote currently
-- has the older actor_id/action/module shape, which is preserved.

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS actor_top_role text,
  ADD COLUMN IF NOT EXISTS actor_store_role text,
  ADD COLUMN IF NOT EXISTS action_key text,
  ADD COLUMN IF NOT EXISTS module_key text,
  ADD COLUMN IF NOT EXISTS target_table text,
  ADD COLUMN IF NOT EXISTS target_id uuid,
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id),
  ADD COLUMN IF NOT EXISTS old_data jsonb,
  ADD COLUMN IF NOT EXISTS new_data jsonb,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Backfill the new columns from the legacy shape so audit history stays
-- queryable through either column family.
UPDATE public.audit_logs
SET actor_user_id = COALESCE(actor_user_id, actor_id)
WHERE actor_user_id IS NULL AND actor_id IS NOT NULL;

UPDATE public.audit_logs
SET action_key = COALESCE(action_key, action)
WHERE action_key IS NULL AND action IS NOT NULL;

UPDATE public.audit_logs
SET module_key = COALESCE(module_key, module)
WHERE module_key IS NULL AND module IS NOT NULL;

-- The legacy audit_logs shape marks `action` NOT NULL, but the phase6 helpers
-- write the action into action_key only. Drop the NOT NULL on the legacy
-- column (keeping it for reads) so new-format audit rows can insert.
ALTER TABLE public.audit_logs
  ALTER COLUMN action DROP NOT NULL;

-- Mirror new-format writes into the legacy columns via trigger so both
-- column families stay populated for whichever readers query them.
CREATE OR REPLACE FUNCTION public.sync_audit_logs_legacy_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.action IS NULL AND NEW.action_key IS NOT NULL THEN
    NEW.action := NEW.action_key;
  END IF;
  IF NEW.module IS NULL AND NEW.module_key IS NOT NULL THEN
    NEW.module := NEW.module_key;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_audit_logs_legacy ON public.audit_logs;
CREATE TRIGGER trg_sync_audit_logs_legacy
BEFORE INSERT OR UPDATE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.sync_audit_logs_legacy_columns();

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_time
  ON public.audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_time
  ON public.audit_logs (action_key, created_at DESC);
