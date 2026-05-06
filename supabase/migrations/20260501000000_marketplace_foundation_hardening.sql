-- Marketplace foundation hardening:
-- - Canonical role helper functions
-- - Core missing tables (idempotent)
-- - Basic RLS and storage bucket alignment

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Helper functions
CREATE OR REPLACE FUNCTION public.has_role(target_user_id uuid, target_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = target_user_id
      AND ur.role = target_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'suadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_store_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR public.has_role(auth.uid(), 'storeadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_store_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR public.has_role(auth.uid(), 'storestaff');
$$;

CREATE OR REPLACE FUNCTION public.has_staff_permission(permission_module text, permission_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_allowed boolean := false;
BEGIN
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  SELECT CASE permission_action
    WHEN 'view' THEN sp.can_view
    WHEN 'create' THEN sp.can_create
    WHEN 'edit' THEN sp.can_edit
    WHEN 'delete' THEN sp.can_delete
    WHEN 'approve' THEN sp.can_approve
    WHEN 'export' THEN sp.can_export
    ELSE false
  END
  INTO v_allowed
  FROM public.staff_permissions sp
  WHERE sp.staff_user_id = auth.uid()
    AND sp.module_key = permission_module
  LIMIT 1;

  RETURN COALESCE(v_allowed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_store_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(sa.store_id), ARRAY[]::uuid[])
  FROM public.store_admins sa
  WHERE sa.user_id = auth.uid()
    AND COALESCE(sa.status, 'active') = 'active';
$$;

CREATE OR REPLACE FUNCTION public.has_store_permission(target_store_id uuid, permission_module text, permission_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_allowed boolean := false;
BEGIN
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  IF NOT (target_store_id = ANY(public.get_my_store_ids())) THEN
    RETURN false;
  END IF;

  SELECT CASE permission_action
    WHEN 'view' THEN sp.can_view
    WHEN 'create' THEN sp.can_create
    WHEN 'edit' THEN sp.can_edit
    WHEN 'delete' THEN sp.can_delete
    WHEN 'publish' THEN sp.can_publish
    ELSE false
  END
  INTO v_allowed
  FROM public.store_permissions sp
  WHERE sp.store_id = target_store_id
    AND sp.store_admin_user_id = auth.uid()
    AND sp.module_key = permission_module
  LIMIT 1;

  RETURN COALESCE(v_allowed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = auth.uid() ORDER BY ur.created_at DESC NULLS LAST LIMIT 1),
    'user'
  );
$$;

-- 2) Core tables (idempotent)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  display_name text,
  email text,
  phone text,
  avatar_url text,
  role text,
  status text DEFAULT 'active',
  bio text,
  address text,
  city text,
  country text DEFAULT 'Nepal',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  category text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  department text,
  status text DEFAULT 'active',
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  can_export boolean DEFAULT false,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (staff_user_id, module_key)
);

CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES auth.users(id),
  assigned_by uuid REFERENCES auth.users(id),
  related_module text,
  related_id uuid,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text,
  position text,
  status text DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  listing_type text,
  title text,
  brand text,
  model text,
  category text,
  condition text,
  price numeric,
  description text,
  images text[],
  location text,
  status text DEFAULT 'pending',
  verified boolean DEFAULT false,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'pending',
  method text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.device_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imei text,
  brand text,
  model text,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  result jsonb,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  status text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  points numeric DEFAULT 0,
  tier text DEFAULT 'basic',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_level text DEFAULT 'low',
  reason text,
  flagged_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mailbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text,
  body text,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chatbot_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Compatibility view: older frontend uses staffadmin_permissions
CREATE OR REPLACE VIEW public.staffadmin_permissions AS
SELECT
  id,
  staff_user_id AS user_id,
  module_key,
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_approve,
  false::boolean AS can_assign,
  can_export,
  granted_by,
  created_at,
  updated_at
FROM public.staff_permissions;

-- 3) Baseline RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_own_read ON public.profiles;
CREATE POLICY profiles_own_read ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_staff_admin());

DROP POLICY IF EXISTS profiles_own_update ON public.profiles;
CREATE POLICY profiles_own_update ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.is_staff_admin())
  WITH CHECK (id = auth.uid() OR public.is_staff_admin());

DROP POLICY IF EXISTS settings_staff_read ON public.system_settings;
CREATE POLICY settings_staff_read ON public.system_settings
  FOR SELECT USING (is_public = true OR public.is_staff_admin());

DROP POLICY IF EXISTS settings_suadmin_write ON public.system_settings;
CREATE POLICY settings_suadmin_write ON public.system_settings
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS staff_perms_staff_read ON public.staff_permissions;
CREATE POLICY staff_perms_staff_read ON public.staff_permissions
  FOR SELECT USING (public.is_staff_admin());

DROP POLICY IF EXISTS staff_perms_suadmin_write ON public.staff_permissions;
CREATE POLICY staff_perms_suadmin_write ON public.staff_permissions
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS audit_log_staff_read ON public.audit_logs;
CREATE POLICY audit_log_staff_read ON public.audit_logs
  FOR SELECT USING (public.is_staff_admin());

DROP POLICY IF EXISTS audit_log_system_write ON public.audit_logs;
CREATE POLICY audit_log_system_write ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4) Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('logos', 'logos', true),
  ('uploads', 'uploads', true),
  ('marketplace', 'marketplace', true),
  ('products', 'products', true),
  ('stores', 'stores', true),
  ('articles', 'articles', true)
ON CONFLICT (id) DO NOTHING;
