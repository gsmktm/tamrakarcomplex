-- Strong staff permissions, work control, and audit enforcement.

ALTER TABLE public.staffadmin_permissions
  ADD COLUMN IF NOT EXISTS can_assign boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_export boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

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

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Superadmins can view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Staffadmins can view relevant audit logs" ON public.audit_logs;
CREATE POLICY "Staffadmins can view relevant audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (actor_user_id = auth.uid());

ALTER TABLE public.staffadmin_permissions
  ADD CONSTRAINT staffadmin_permissions_module_key_check
  CHECK (module_key IN (
    'price_list',
    'brands',
    'device_verification',
    'stores',
    'subscriptions',
    'marketplace',
    'orders',
    'payments',
    'payouts',
    'valuation',
    'repairs',
    'unlocking',
    'content',
    'users',
    'analytics',
    'settings'
  )) NOT VALID;

CREATE OR REPLACE FUNCTION public.has_staff_permission(p_module_key text, p_action_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    public.is_super_admin()
    OR (
      public.is_staff_admin()
      AND EXISTS (
        SELECT 1
        FROM public.staffadmin_permissions sp
        WHERE sp.user_id = auth.uid()
          AND sp.module_key = p_module_key
          AND CASE p_action_key
            WHEN 'view' THEN sp.can_view
            WHEN 'create' THEN sp.can_create
            WHEN 'edit' THEN sp.can_edit
            WHEN 'delete' THEN sp.can_delete
            WHEN 'approve' THEN sp.can_approve
            WHEN 'assign' THEN sp.can_assign
            WHEN 'export' THEN sp.can_export
            ELSE false
          END
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.staff_permission_module_for_table(p_table text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_table
    WHEN 'catalog_products' THEN 'price_list'
    WHEN 'price_catalog' THEN 'price_list'
    WHEN 'brands' THEN 'brands'
    WHEN 'device_models' THEN 'brands'
    WHEN 'device_variants' THEN 'brands'
    WHEN 'device_verification_requests' THEN 'device_verification'
    WHEN 'device_search_events' THEN 'device_verification'
    WHEN 'stores' THEN 'stores'
    WHEN 'store_admins' THEN 'stores'
    WHEN 'store_pages' THEN 'stores'
    WHEN 'store_inventory' THEN 'stores'
    WHEN 'packages' THEN 'subscriptions'
    WHEN 'store_subscriptions' THEN 'subscriptions'
    WHEN 'subscription_payments' THEN 'subscriptions'
    WHEN 'subscription_logs' THEN 'subscriptions'
    WHEN 'sell_listings' THEN 'marketplace'
    WHEN 'listing_inquiries' THEN 'marketplace'
    WHEN 'products' THEN 'marketplace'
    WHEN 'store_products' THEN 'marketplace'
    WHEN 'orders' THEN 'orders'
    WHEN 'order_items' THEN 'orders'
    WHEN 'payments' THEN 'payments'
    WHEN 'store_commissions' THEN 'payments'
    WHEN 'store_payouts' THEN 'payouts'
    WHEN 'store_payout_settings' THEN 'payouts'
    WHEN 'valuation_rules' THEN 'valuation'
    WHEN 'sell_phone_leads' THEN 'valuation'
    WHEN 'store_lead_preferences' THEN 'valuation'
    WHEN 'repair_requests' THEN 'repairs'
    WHEN 'repair_services' THEN 'repairs'
    WHEN 'repair_categories' THEN 'repairs'
    WHEN 'repair_devices' THEN 'repairs'
    WHEN 'repair_guides' THEN 'repairs'
    WHEN 'repair_steps' THEN 'repairs'
    WHEN 'repair_tools' THEN 'repairs'
    WHEN 'repair_parts' THEN 'repairs'
    WHEN 'unlock_requests' THEN 'unlocking'
    WHEN 'unlock_catalog' THEN 'unlocking'
    WHEN 'articles' THEN 'content'
    WHEN 'guides' THEN 'content'
    WHEN 'content_pages' THEN 'content'
    WHEN 'site_content' THEN 'content'
    WHEN 'comments' THEN 'content'
    WHEN 'polls' THEN 'content'
    WHEN 'poll_votes' THEN 'content'
    WHEN 'contact_messages' THEN 'content'
    WHEN 'chatbot_config' THEN 'content'
    WHEN 'profiles' THEN 'users'
    WHEN 'user_roles' THEN 'users'
    WHEN 'user_points' THEN 'users'
    WHEN 'user_devices' THEN 'users'
    WHEN 'app_settings' THEN 'settings'
    WHEN 'console_settings' THEN 'settings'
    WHEN 'admin_tasks' THEN 'settings'
    WHEN 'admin_task_comments' THEN 'settings'
    WHEN 'staffadmin_permissions' THEN 'settings'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.staff_permission_action_for_change(
  p_operation text,
  p_old_data jsonb,
  p_new_data jsonb
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
BEGIN
  IF p_operation = 'INSERT' THEN
    RETURN 'create';
  ELSIF p_operation = 'DELETE' THEN
    RETURN 'delete';
  END IF;

  IF (p_new_data ? 'assigned_to_user_id' AND p_old_data->>'assigned_to_user_id' IS DISTINCT FROM p_new_data->>'assigned_to_user_id')
    OR (p_new_data ? 'assigned_store_id' AND p_old_data->>'assigned_store_id' IS DISTINCT FROM p_new_data->>'assigned_store_id')
    OR (p_new_data ? 'assignee_id' AND p_old_data->>'assignee_id' IS DISTINCT FROM p_new_data->>'assignee_id') THEN
    RETURN 'assign';
  END IF;

  IF p_new_data ? 'status' AND p_old_data->>'status' IS DISTINCT FROM p_new_data->>'status'
    AND lower(coalesce(p_new_data->>'status', '')) IN ('approved', 'verified', 'published', 'completed', 'ready') THEN
    RETURN 'approve';
  END IF;

  RETURN 'edit';
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_staff_permission_for_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module text;
  v_action text;
BEGIN
  IF public.is_super_admin() OR NOT public.is_staff_admin() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'admin_tasks'
    AND TG_OP = 'UPDATE'
    AND OLD.assigned_to_user_id = auth.uid()
    AND NEW.assigned_to_user_id IS NOT DISTINCT FROM OLD.assigned_to_user_id
    AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by THEN
    RETURN NEW;
  END IF;

  v_module := public.staff_permission_module_for_table(TG_TABLE_NAME);
  IF v_module IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_action := public.staff_permission_action_for_change(
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );

  IF NOT public.has_staff_permission(v_module, v_action) THEN
    RAISE EXCEPTION 'Staff permission denied: % % on %', v_action, v_module, TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_audit_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_top_role text;
  v_store_role text;
  v_action text;
  v_module text;
  v_old_data jsonb := null;
  v_new_data jsonb := null;
  v_store_id uuid := null;
  v_target_id uuid := null;
BEGIN
  SELECT role INTO v_top_role
  FROM public.user_roles
  WHERE user_id = v_actor_id
  ORDER BY CASE role WHEN 'suadmin' THEN 1 WHEN 'staffadmin' THEN 2 WHEN 'storeadmin' THEN 3 ELSE 4 END
  LIMIT 1;

  SELECT role INTO v_store_role
  FROM public.store_admins
  WHERE user_id = v_actor_id
  LIMIT 1;

  IF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_data := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_action := public.staff_permission_action_for_change(TG_OP, v_old_data, v_new_data);
  ELSE
    v_action := 'create';
    v_new_data := to_jsonb(NEW);
  END IF;

  v_module := COALESCE(public.staff_permission_module_for_table(TG_TABLE_NAME), TG_TABLE_NAME);

  IF v_new_data ? 'store_id' THEN
    v_store_id := (v_new_data ->> 'store_id')::uuid;
  ELSIF v_old_data ? 'store_id' THEN
    v_store_id := (v_old_data ->> 'store_id')::uuid;
  ELSIF TG_TABLE_NAME = 'stores' THEN
    v_store_id := COALESCE((v_new_data->>'id')::uuid, (v_old_data->>'id')::uuid);
  END IF;

  IF COALESCE(v_new_data, v_old_data) ? 'id' THEN
    v_target_id := (COALESCE(v_new_data, v_old_data)->>'id')::uuid;
  END IF;

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
    v_actor_id,
    v_top_role,
    v_store_role,
    v_action,
    v_module,
    TG_TABLE_NAME,
    v_target_id,
    v_store_id,
    v_old_data,
    v_new_data
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_staff_permission_controls(p_table text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.' || p_table) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('DROP TRIGGER IF EXISTS enforce_staff_permissions_%I ON public.%I', p_table, p_table);
  EXECUTE format(
    'CREATE TRIGGER enforce_staff_permissions_%I BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_staff_permission_for_change()',
    p_table,
    p_table
  );

  EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', p_table, p_table);
  EXECUTE format(
    'CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_audit_action()',
    p_table,
    p_table
  );
END;
$$;

DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'catalog_products',
    'price_catalog',
    'brands',
    'device_models',
    'device_variants',
    'device_verification_requests',
    'device_search_events',
    'stores',
    'store_admins',
    'store_pages',
    'store_inventory',
    'packages',
    'store_subscriptions',
    'subscription_payments',
    'subscription_logs',
    'sell_listings',
    'listing_inquiries',
    'products',
    'store_products',
    'orders',
    'order_items',
    'payments',
    'store_commissions',
    'store_payouts',
    'store_payout_settings',
    'valuation_rules',
    'sell_phone_leads',
    'store_lead_preferences',
    'repair_requests',
    'repair_services',
    'repair_categories',
    'repair_devices',
    'repair_guides',
    'repair_steps',
    'repair_tools',
    'repair_parts',
    'unlock_requests',
    'unlock_catalog',
    'articles',
    'guides',
    'content_pages',
    'site_content',
    'comments',
    'polls',
    'poll_votes',
    'contact_messages',
    'chatbot_config',
    'profiles',
    'user_roles',
    'user_points',
    'user_devices',
    'app_settings',
    'console_settings',
    'admin_tasks',
    'admin_task_comments',
    'staffadmin_permissions'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    PERFORM public.attach_staff_permission_controls(table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Superadmins can manage staff permissions" ON public.staffadmin_permissions;
CREATE POLICY "Superadmins can manage staff permissions"
ON public.staffadmin_permissions FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Staff can view their own permissions" ON public.staffadmin_permissions;
CREATE POLICY "Staff can view their own permissions"
ON public.staffadmin_permissions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Superadmins can manage all tasks" ON public.admin_tasks;
CREATE POLICY "Superadmins can manage all tasks"
ON public.admin_tasks FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admins can view their assigned tasks" ON public.admin_tasks;
CREATE POLICY "Admins can view their assigned tasks"
ON public.admin_tasks FOR SELECT
TO authenticated
USING (assigned_to_user_id = auth.uid() OR created_by = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "Admins can update their assigned tasks" ON public.admin_tasks;
CREATE POLICY "Admins can update their assigned tasks"
ON public.admin_tasks FOR UPDATE
TO authenticated
USING (assigned_to_user_id = auth.uid() OR public.is_super_admin())
WITH CHECK (
  public.is_super_admin()
  OR assigned_to_user_id = auth.uid()
);

GRANT EXECUTE ON FUNCTION public.has_staff_permission(text, text) TO authenticated;
