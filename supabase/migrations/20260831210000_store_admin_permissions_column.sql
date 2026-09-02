-- Store admin granular permissions: adds the store_admins.permissions column
-- that the suadmin StoreAdminPermissionManager writes and the storeadmin menu
-- reads (src/lib/permissions.ts getStoreAdminPermissions).
--
-- Backfill policy: existing active store admins receive ALL modules so current
-- behavior is preserved until a super admin explicitly revokes modules.

-- 1. Column (text[] to match the existing .update({ permissions: [...] }) writes)
ALTER TABLE public.store_admins
  ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT NULL;

-- 2. Backfill: active store admins get all module keys by default.
UPDATE public.store_admins
SET permissions = ARRAY['products','orders','leads','settings','branding','staff','payouts']
WHERE permissions IS NULL
  AND status = 'active';

-- 3. Audit coverage for permission changes (matches the phase6 pattern).
DROP TRIGGER IF EXISTS trg_audit_store_admins ON public.store_admins;
CREATE TRIGGER trg_audit_store_admins
  AFTER INSERT OR UPDATE OR DELETE ON public.store_admins
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_privileged_change();
