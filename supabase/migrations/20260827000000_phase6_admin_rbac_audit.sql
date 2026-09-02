-- Phase 6: Admin RBAC hardening — immutable audit logging for privileged mutations
-- Ensures every privileged table write is recorded regardless of entry path (direct .from() or RPC),
-- and provides restricted RPCs for the most sensitive admin operations.

-- 1. log_privileged_action helper — inserts into audit_logs with role context
CREATE OR REPLACE FUNCTION public.log_privileged_action(
  p_action_key   text,
  p_module_key   text,
  p_target_table text,
  p_target_id    uuid,
  p_store_id     uuid DEFAULT NULL,
  p_old_data     jsonb DEFAULT NULL,
  p_new_data     jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_user_id,
    actor_top_role,
    actor_store_role,
    action_key,
    module_key,
    target_table,
    target_id,
    store_id,
    old_data,
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    public.get_current_top_role(),
    public.get_store_role_for_store(p_store_id),
    p_action_key,
    p_module_key,
    p_target_table,
    p_target_id,
    p_store_id,
    p_old_data,
    p_new_data,
    null, -- ip_address filled from request if available
    null  -- user_agent filled from request if available
  );
END;
$$;

-- 2. Helper: get the actor's top role (suadmin/staffadmin/storeadmin/storestaff/user)
CREATE OR REPLACE FUNCTION public.get_current_top_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE (
    role,
    ARRAY['suadmin', 'staffadmin', 'storeadmin', 'storestaff', 'user', 'storeowner']::text[]
  )
  -- higher priority = earlier in the array
  SELECT
    -- 0 = highest, 5 = lowest
    CASE role
      WHEN 'suadmin'       THEN 0
      WHEN 'staffadmin'    THEN 1
      WHEN 'storeadmin'    THEN 2
      WHEN 'storestaff'    THEN 3
      WHEN 'storeowner'    THEN 4
      ELSE 5
    END
  LIMIT 1;
$$;

-- 3. Helper: get actor's store role for a given store (or NULL if not affiliated)
CREATE OR REPLACE FUNCTION public.get_store_role_for_store(p_store_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = p_store_id AND (s.owner_id = auth.uid() OR s.owner_user_id = auth.uid())
    ) THEN 'owner'
    WHEN EXISTS (
      SELECT 1 FROM public.store_admins sa
      WHERE sa.store_id = p_store_id AND sa.user_id = auth.uid() AND sa.status = 'active'
    ) THEN 'admin'
    WHEN EXISTS (
      SELECT 1 FROM public.store_staff ss
      WHERE ss.store_id = p_store_id AND ss.user_id = auth.uid() AND ss.status = 'active'
    ) THEN 'staff'
    ELSE NULL
  END;
$$;

-- 4. Audit trigger function for privileged tables
CREATE OR REPLACE FUNCTION public.fn_audit_privileged_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store_id uuid := NULL;
  v_actor    text := auth.uid()::text;
  v_action   text := TG_OP;
BEGIN
  -- Derive store_id from the row if the table has one
  BEGIN
    EXECUTE format('SELECT ($1).store_id', TG_TABLE_NAME) USING NEW;
    v_store_id := (NEW).store_id;
  EXCEPTION WHEN OTHERS THEN
    -- column doesn't exist, leave NULL
  END;

  INSERT INTO public.audit_logs (
    actor_user_id,
    actor_top_role,
    actor_store_role,
    action_key,
    module_key,
    target_table,
    target_id,
    store_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    public.get_current_top_role(),
    public.get_store_role_for_store(v_store_id),
    CASE WHEN TG_OP = 'INSERT' THEN 'INSERT'
         WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
         WHEN TG_OP = 'DELETE' THEN 'DELETE'
         ELSE TG_OP END,
    TG_TABLE_NAME,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN (OLD).id ELSE (NEW).id END,
    v_store_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Attach audit triggers to privileged tables
--    These fire on INSERT/UPDATE/DELETE and ensure a record exists even when
--    the frontend calls supabase.from().update() directly (not just via RPC).

DO $$
DECLARE
  r RECORD;
  tname text;
BEGIN
  FOR tname IN
    SELECT unnest(ARRAY[
      'user_roles',
      'repair_requests',
      'store_payouts',
      'unlock_requests',
      'sell_phone_leads',
      'store_staff',
      'store_admins',
      'store_packages'
    ])
  LOOP
    -- Only attach if the table exists
    SELECT 1 INTO r FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = tname
    LIMIT 1;
    IF FOUND THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', tname, tname);
      EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_privileged_change()', tname, tname);
    END IF;
  END LOOP;
END $$;

-- 6. Restricted RPC: revoke_user_roles
--    Replaces direct supabase.from("user_roles").delete().eq("user_id", userId)
--    Enforces suadmin-only and logs to audit_logs.
CREATE OR REPLACE FUNCTION public.revoke_user_roles(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count int;
  v_old   jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'insufficient_role' USING ERRCODE = '42501';
  END IF;

  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required' USING ERRCODE = '22023';
  END IF;

  -- Capture old state before deletion
  SELECT jsonb_agg(row_to_json(t)) INTO v_old
  FROM public.user_roles t
  WHERE t.user_id = p_target_user_id;

  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM public.log_privileged_action(
    'REVOKE_ROLES', 'user_management', 'user_roles',
    p_target_user_id, NULL, v_old, NULL
  );

  RAISE NOTICE 'revoked % role(s) from user %', v_count, p_target_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_user_roles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_user_roles(uuid) TO authenticated;

-- 7. Restricted RPC: update_repair_admin_fields
--    Replaces direct supabase.from("repair_requests").update({estimated_cost, final_cost, ...})
--    Enforces suadmin or store-admin-for-assigned-store, logs to audit_logs.
CREATE OR REPLACE FUNCTION public.update_repair_admin_fields(
  p_repair_id       uuid,
  p_estimated_cost  numeric DEFAULT NULL,
  p_final_cost      numeric DEFAULT NULL,
  p_internal_notes  text    DEFAULT NULL,
  p_urgency         text    DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_repair  public.repair_requests%ROWTYPE;
  v_old     jsonb;
BEGIN
  -- Fetch the repair row
  SELECT * INTO v_repair FROM public.repair_requests WHERE id = p_repair_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'repair_not_found' USING ERRCODE = '02000';
  END IF;

  -- Authorization: suadmin, staffadmin, or store admin for the assigned store
  IF NOT (
    public.is_super_admin()
    OR public.is_staff_admin()
    OR (v_repair.assigned_store_id IS NOT NULL AND public.is_repair_store_admin(v_repair.assigned_store_id))
  ) THEN
    RAISE EXCEPTION 'insufficient_role' USING ERRCODE = '42501';
  END IF;

  v_old := row_to_json(v_repair);

  UPDATE public.repair_requests
  SET
    estimated_cost = COALESCE(p_estimated_cost, estimated_cost),
    final_cost     = COALESCE(p_final_cost,     final_cost),
    internal_notes = COALESCE(p_internal_notes, internal_notes),
    urgency        = COALESCE(p_urgency,       urgency),
    updated_at     = now()
  WHERE id = p_repair_id;

  PERFORM public.log_privileged_action(
    'UPDATE_REPAIR_FIELDS', 'repair_management', 'repair_requests',
    p_repair_id, v_repair.assigned_store_id, v_old, to_jsonb(v_repair)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.update_repair_admin_fields(uuid, numeric, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_repair_admin_fields(uuid, numeric, numeric, text, text) TO authenticated;

-- 8. Restricted RPC: update_store_payout_status
--    Replaces direct supabase.from("store_payouts").update({status, paid_at})
--    Enforces staffadmin/suadmin only and logs to audit_logs.
CREATE OR REPLACE FUNCTION public.update_store_payout_status(
  p_payout_id uuid,
  p_status    text,
  p_paid_at   timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payout public.store_payouts%ROWTYPE;
  v_old    jsonb;
BEGIN
  IF NOT (public.is_super_admin() OR public.is_staff_admin()) THEN
    RAISE EXCEPTION 'insufficient_role' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_payout FROM public.store_payouts WHERE id = p_payout_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payout_not_found' USING ERRCODE = '02000';
  END IF;

  -- Validate status transition
  IF p_status NOT IN ('pending', 'processing', 'paid', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'invalid_payout_status' USING ERRCODE = '22023';
  END IF;

  v_old := row_to_json(v_payout);

  UPDATE public.store_payouts
  SET status = p_status,
      paid_at = CASE WHEN p_status = 'paid' THEN COALESCE(p_paid_at, now()) ELSE COALESCE(p_paid_at, paid_at) END
  WHERE id = p_payout_id;

  PERFORM public.log_privileged_action(
    'UPDATE_PAYOUT', 'payout_management', 'store_payouts',
    p_payout_id, v_payout.store_id, v_old, row_to_json(v_payout)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.update_store_payout_status(uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_store_payout_status(uuid, text, timestamptz) TO authenticated;

-- 9. Restricted RPC: update_unlock_request_status
--    Replaces direct supabase.from("unlock_requests").update()
--    Enforces store-boundary authorization and logs to audit_logs.
CREATE OR REPLACE FUNCTION public.update_unlock_request_status(
  p_request_id uuid,
  p_status     text,
  p_notes      text   DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req   public.unlock_requests%ROWTYPE;
  v_old   jsonb;
BEGIN
  SELECT * INTO v_req FROM public.unlock_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unlock_request_not_found' USING ERRCODE = '02000';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR public.is_staff_admin()
    OR (v_req.assigned_store_id IS NOT NULL AND public.is_repair_store_admin(v_req.assigned_store_id))
  ) THEN
    RAISE EXCEPTION 'insufficient_role' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'invalid_unlock_status' USING ERRCODE = '22023';
  END IF;

  v_old := row_to_json(v_req);

  UPDATE public.unlock_requests
  SET status = p_status,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_privileged_action(
    'UPDATE_UNLOCK', 'unlock_management', 'unlock_requests',
    p_request_id, v_req.assigned_store_id, v_old, row_to_json(v_req)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.update_unlock_request_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_unlock_request_status(uuid, text, text) TO authenticated;

-- 10. Restricted RPC: update_sell_lead_status
--     Replaces direct supabase.from("sell_phone_leads").update()
--     Enforces store-boundary authorization and logs to audit_logs.
CREATE OR REPLACE FUNCTION public.update_sell_lead_status(
  p_lead_id    uuid,
  p_status     text,
  p_notes      text   DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead public.sell_phone_leads%ROWTYPE;
  v_old  jsonb;
BEGIN
  SELECT * INTO v_lead FROM public.sell_phone_leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'sell_lead_not_found' USING ERRCODE = '02000';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR public.is_staff_admin()
    OR (v_lead.assigned_store_id IS NOT NULL AND public.is_repair_store_admin(v_lead.assigned_store_id))
  ) THEN
    RAISE EXCEPTION 'insufficient_role' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('new', 'contacted', 'valuing', 'offered', 'accepted', 'rejected', 'assigned') THEN
    RAISE EXCEPTION 'invalid_lead_status' USING ERRCODE = '22023';
  END IF;

  v_old := row_to_json(v_lead);

  UPDATE public.sell_phone_leads
  SET status = p_status,
      notes  = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_lead_id;

  PERFORM public.log_privileged_action(
    'UPDATE_LEAD', 'lead_management', 'sell_phone_leads',
    p_lead_id, v_lead.assigned_store_id, v_old, row_to_json(v_lead)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.update_sell_lead_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_sell_lead_status(uuid, text, text) TO authenticated;
