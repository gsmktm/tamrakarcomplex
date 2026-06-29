-- Enable RLS on tables missing it; skip any table that doesn't exist yet.
-- Uses DO blocks so a missing table is a no-op rather than an error.

DO $$
BEGIN
  -- chatbot_config (singular — used by frontend)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chatbot_config') THEN
    ALTER TABLE public.chatbot_config ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "chatbot_config_public_read" ON public.chatbot_config;
    DROP POLICY IF EXISTS "chatbot_config_suadmin_all"  ON public.chatbot_config;
    CREATE POLICY "chatbot_config_public_read" ON public.chatbot_config
      FOR SELECT USING (true);
    CREATE POLICY "chatbot_config_suadmin_all"  ON public.chatbot_config
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;

  -- chatbot_configs (plural — marketplace_foundation_hardening)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chatbot_configs') THEN
    ALTER TABLE public.chatbot_configs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "chatbot_configs_public_read" ON public.chatbot_configs;
    DROP POLICY IF EXISTS "chatbot_configs_suadmin_all" ON public.chatbot_configs;
    CREATE POLICY "chatbot_configs_public_read" ON public.chatbot_configs
      FOR SELECT USING (true);
    CREATE POLICY "chatbot_configs_suadmin_all" ON public.chatbot_configs
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;

  -- role_permissions (RBAC critical)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'role_permissions') THEN
    ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "role_permissions_suadmin_all" ON public.role_permissions;
    CREATE POLICY "role_permissions_suadmin_all" ON public.role_permissions
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;

  -- staff_admins
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff_admins') THEN
    ALTER TABLE public.staff_admins ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_admins_suadmin_all" ON public.staff_admins;
    DROP POLICY IF EXISTS "staff_admins_self_read"   ON public.staff_admins;
    CREATE POLICY "staff_admins_suadmin_all" ON public.staff_admins
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    CREATE POLICY "staff_admins_self_read" ON public.staff_admins
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- device_verifications
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'device_verifications') THEN
    ALTER TABLE public.device_verifications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "device_verifications_suadmin_all"  ON public.device_verifications;
    DROP POLICY IF EXISTS "device_verifications_owner_read"   ON public.device_verifications;
    CREATE POLICY "device_verifications_suadmin_all" ON public.device_verifications
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    CREATE POLICY "device_verifications_owner_read" ON public.device_verifications
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- platform_health_logs
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_health_logs') THEN
    ALTER TABLE public.platform_health_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "platform_health_logs_suadmin_all" ON public.platform_health_logs;
    CREATE POLICY "platform_health_logs_suadmin_all" ON public.platform_health_logs
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;

  -- user_rewards
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_rewards') THEN
    ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_rewards_suadmin_all"  ON public.user_rewards;
    DROP POLICY IF EXISTS "user_rewards_owner_read"   ON public.user_rewards;
    CREATE POLICY "user_rewards_suadmin_all" ON public.user_rewards
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    CREATE POLICY "user_rewards_owner_read" ON public.user_rewards
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- user_risk_flags
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_risk_flags') THEN
    ALTER TABLE public.user_risk_flags ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_risk_flags_suadmin_all" ON public.user_risk_flags;
    CREATE POLICY "user_risk_flags_suadmin_all" ON public.user_risk_flags
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;

  -- mailbox_messages
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mailbox_messages') THEN
    ALTER TABLE public.mailbox_messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "mailbox_messages_suadmin_all"  ON public.mailbox_messages;
    DROP POLICY IF EXISTS "mailbox_messages_owner_read"   ON public.mailbox_messages;
    CREATE POLICY "mailbox_messages_suadmin_all" ON public.mailbox_messages
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    CREATE POLICY "mailbox_messages_owner_read" ON public.mailbox_messages
      FOR SELECT USING (
        (recipient_id IS NOT NULL AND recipient_id = auth.uid()) OR
        (sender_id    IS NOT NULL AND sender_id    = auth.uid())
      );
  END IF;

  -- staff_tasks
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff_tasks') THEN
    ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_tasks_suadmin_all"    ON public.staff_tasks;
    DROP POLICY IF EXISTS "staff_tasks_assigned_read"  ON public.staff_tasks;
    CREATE POLICY "staff_tasks_suadmin_all" ON public.staff_tasks
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    CREATE POLICY "staff_tasks_assigned_read" ON public.staff_tasks
      FOR SELECT USING (
        (assigned_to IS NOT NULL AND assigned_to = auth.uid()) OR
        (created_by  IS NOT NULL AND created_by  = auth.uid())
      );
  END IF;

  -- user_polls
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_polls') THEN
    ALTER TABLE public.user_polls ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_polls_public_read"    ON public.user_polls;
    DROP POLICY IF EXISTS "user_polls_suadmin_write"  ON public.user_polls;
    CREATE POLICY "user_polls_public_read" ON public.user_polls
      FOR SELECT USING (true);
    CREATE POLICY "user_polls_suadmin_write" ON public.user_polls
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- product_categories: used in CategoryManager but never created
CREATE TABLE IF NOT EXISTS public.product_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        UNIQUE NOT NULL,
  description text,
  parent_id   uuid        REFERENCES public.product_categories(id) ON DELETE SET NULL,
  image_url   text,
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_categories_slug_idx   ON public.product_categories(slug);
CREATE INDEX IF NOT EXISTS product_categories_parent_idx ON public.product_categories(parent_id);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_categories_public_read" ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_suadmin_all" ON public.product_categories;

CREATE POLICY "product_categories_public_read" ON public.product_categories
  FOR SELECT USING (is_active = true);
CREATE POLICY "product_categories_suadmin_all" ON public.product_categories
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
