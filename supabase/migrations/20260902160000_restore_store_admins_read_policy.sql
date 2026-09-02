-- Hotfix: restore the store_admins self-read RLS policy.
--
-- 20260424020000_normalize_4panel_roles.sql (recorded as applied; DDL never
-- landed via manual application) created "Users can view their own store
-- memberships". Without it, RLS on store_admins is deny-all, so a store
-- admin can never read their own permissions grants — the tri-state
-- permission gating then resolves to "loaded with no grants" and hides the
-- entire storeadmin panel.

DROP POLICY IF EXISTS "Users can view their own store memberships" ON public.store_admins;
CREATE POLICY "Users can view their own store memberships"
ON public.store_admins FOR SELECT
TO authenticated
USING (user_id = auth.uid());
