
-- 1. Create staffadmin_permissions table
CREATE TABLE IF NOT EXISTS public.staffadmin_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    module_key text NOT NULL,
    can_view boolean DEFAULT false,
    can_create boolean DEFAULT false,
    can_edit boolean DEFAULT false,
    can_delete boolean DEFAULT false,
    can_approve boolean DEFAULT false,
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, module_key)
);

-- Enable RLS
ALTER TABLE public.staffadmin_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for staffadmin_permissions
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

-- 2. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid REFERENCES auth.users(id),
    actor_top_role text,
    actor_store_role text,
    action_key text NOT NULL,
    module_key text NOT NULL,
    target_table text,
    target_id uuid,
    store_id uuid REFERENCES public.stores(id),
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    user_agent text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for audit_logs
DROP POLICY IF EXISTS "Superadmins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Superadmins can view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Staffadmins can view relevant audit logs" ON public.audit_logs;
CREATE POLICY "Staffadmins can view relevant audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_staff_admin());

DROP POLICY IF EXISTS "Storeadmins can view their own store audit logs" ON public.audit_logs;
CREATE POLICY "Storeadmins can view their own store audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.store_admins
    WHERE store_id = audit_logs.store_id
    AND user_id = auth.uid()
));

-- 3. Audit Log Helper Function
CREATE OR REPLACE FUNCTION public.log_audit_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actor_id uuid;
    v_top_role text;
    v_store_role text;
    v_action text;
    v_old_data jsonb := null;
    v_new_data jsonb := null;
    v_store_id uuid := null;
BEGIN
    v_actor_id := auth.uid();
    
    -- Get top-level role
    SELECT role INTO v_top_role FROM public.user_roles WHERE user_id = v_actor_id LIMIT 1;
    
    -- Get store role if applicable (just pick one if multiple)
    SELECT role INTO v_store_role FROM public.store_admins WHERE user_id = v_actor_id LIMIT 1;

    IF (TG_OP = 'DELETE') THEN
        v_action := 'delete';
        v_old_data := to_jsonb(OLD);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'update';
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSIF (TG_OP = 'INSERT') THEN
        v_action := 'create';
        v_new_data := to_jsonb(NEW);
    END IF;

    -- Try to find store_id in the data
    IF (v_new_data ? 'store_id') THEN
        v_store_id := (v_new_data ->> 'store_id')::uuid;
    ELSIF (v_old_data ? 'store_id') THEN
        v_store_id := (v_old_data ->> 'store_id')::uuid;
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
        TG_TABLE_NAME,
        TG_TABLE_NAME,
        COALESCE((v_new_data->>'id')::uuid, (v_old_data->>'id')::uuid),
        v_store_id,
        v_old_data,
        v_new_data
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;
