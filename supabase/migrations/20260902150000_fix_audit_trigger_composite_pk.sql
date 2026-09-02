-- Hotfix: make fn_audit_privileged_change safe on composite-PK tables.
--
-- The phase6 version resolved target_id as (NEW).id unconditionally, which
-- raises 'column "id" does not exist' on tables like store_admins (composite
-- PK store_id+user_id) — breaking every direct INSERT/UPDATE/DELETE on those
-- tables (staff management UI writes to store_admins).
--
-- The canonical definition in 20260827000000_phase6_admin_rbac_audit.sql is
-- fixed the same way; this migration re-applies the fixed function to
-- databases that already ran phase6.

CREATE OR REPLACE FUNCTION public.fn_audit_privileged_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store_id  uuid := NULL;
  v_target_id uuid := NULL;
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

  -- Derive a target id from the row: prefer id, fall back to store_id or
  -- user_id for composite-PK tables (e.g. store_admins has no id column).
  BEGIN
    v_target_id := CASE WHEN TG_OP = 'DELETE' THEN (OLD).id ELSE (NEW).id END;
  EXCEPTION WHEN undefined_column THEN
    BEGIN
      v_target_id := CASE WHEN TG_OP = 'DELETE' THEN (OLD).store_id ELSE (NEW).store_id END;
    EXCEPTION WHEN undefined_column THEN
      BEGIN
        v_target_id := CASE WHEN TG_OP = 'DELETE' THEN (OLD).user_id ELSE (NEW).user_id END;
      EXCEPTION WHEN undefined_column THEN
        v_target_id := NULL;
      END;
    END;
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
    v_target_id,
    v_store_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
