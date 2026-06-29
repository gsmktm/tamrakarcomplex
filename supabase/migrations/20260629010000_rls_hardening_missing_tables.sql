-- Enable RLS on tables that were missing it
-- Tables: chatbot_configs, role_permissions, staff_admins, device_verifications,
--         platform_health_logs, user_rewards, user_risk_flags, mailbox_messages,
--         staff_tasks, user_polls

-- chatbot_configs: readable by all, writable by suadmin only
ALTER TABLE IF EXISTS public.chatbot_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chatbot_configs_public_read" ON public.chatbot_configs;
DROP POLICY IF EXISTS "chatbot_configs_suadmin_all" ON public.chatbot_configs;
CREATE POLICY "chatbot_configs_public_read" ON public.chatbot_configs
  FOR SELECT USING (true);
CREATE POLICY "chatbot_configs_suadmin_all" ON public.chatbot_configs
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- role_permissions: suadmin read/write only (RBAC critical)
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_permissions_suadmin_all" ON public.role_permissions;
CREATE POLICY "role_permissions_suadmin_all" ON public.role_permissions
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- staff_admins: suadmin full, staff can read own row
ALTER TABLE IF EXISTS public.staff_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_admins_suadmin_all" ON public.staff_admins;
DROP POLICY IF EXISTS "staff_admins_self_read" ON public.staff_admins;
CREATE POLICY "staff_admins_suadmin_all" ON public.staff_admins
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "staff_admins_self_read" ON public.staff_admins
  FOR SELECT USING (user_id = auth.uid());

-- device_verifications: suadmin full, owner read own
ALTER TABLE IF EXISTS public.device_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "device_verifications_suadmin_all" ON public.device_verifications;
DROP POLICY IF EXISTS "device_verifications_owner_read" ON public.device_verifications;
CREATE POLICY "device_verifications_suadmin_all" ON public.device_verifications
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "device_verifications_owner_read" ON public.device_verifications
  FOR SELECT USING (user_id = auth.uid());

-- platform_health_logs: suadmin only
ALTER TABLE IF EXISTS public.platform_health_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_health_logs_suadmin_all" ON public.platform_health_logs;
CREATE POLICY "platform_health_logs_suadmin_all" ON public.platform_health_logs
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- user_rewards: suadmin full, owner read own
ALTER TABLE IF EXISTS public.user_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_rewards_suadmin_all" ON public.user_rewards;
DROP POLICY IF EXISTS "user_rewards_owner_read" ON public.user_rewards;
CREATE POLICY "user_rewards_suadmin_all" ON public.user_rewards
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "user_rewards_owner_read" ON public.user_rewards
  FOR SELECT USING (user_id = auth.uid());

-- user_risk_flags: suadmin only (sensitive security data)
ALTER TABLE IF EXISTS public.user_risk_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_risk_flags_suadmin_all" ON public.user_risk_flags;
CREATE POLICY "user_risk_flags_suadmin_all" ON public.user_risk_flags
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- mailbox_messages: suadmin full, owner read/delete own
ALTER TABLE IF EXISTS public.mailbox_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mailbox_messages_suadmin_all" ON public.mailbox_messages;
DROP POLICY IF EXISTS "mailbox_messages_owner_read" ON public.mailbox_messages;
CREATE POLICY "mailbox_messages_suadmin_all" ON public.mailbox_messages
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "mailbox_messages_owner_read" ON public.mailbox_messages
  FOR SELECT USING (recipient_id = auth.uid() OR sender_id = auth.uid());

-- staff_tasks: suadmin full, assigned staff read own
ALTER TABLE IF EXISTS public.staff_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_tasks_suadmin_all" ON public.staff_tasks;
DROP POLICY IF EXISTS "staff_tasks_assigned_read" ON public.staff_tasks;
CREATE POLICY "staff_tasks_suadmin_all" ON public.staff_tasks
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "staff_tasks_assigned_read" ON public.staff_tasks
  FOR SELECT USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- user_polls: public read, suadmin write
ALTER TABLE IF EXISTS public.user_polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_polls_public_read" ON public.user_polls;
DROP POLICY IF EXISTS "user_polls_suadmin_write" ON public.user_polls;
CREATE POLICY "user_polls_public_read" ON public.user_polls
  FOR SELECT USING (true);
CREATE POLICY "user_polls_suadmin_write" ON public.user_polls
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- product_categories: used in CategoryManager but table missing
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  parent_id uuid REFERENCES public.product_categories(id),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_categories_slug_idx ON public.product_categories(slug);
CREATE INDEX IF NOT EXISTS product_categories_parent_idx ON public.product_categories(parent_id);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_categories_public_read" ON public.product_categories
  FOR SELECT USING (is_active = true);
CREATE POLICY "product_categories_suadmin_all" ON public.product_categories
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
