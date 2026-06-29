-- Create store_staff (prerequisite for notifications policies)
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
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, user_id)
);

ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='store_staff' AND policyname='Store admins manage staff') THEN
    CREATE POLICY "Store admins manage staff" ON public.store_staff FOR ALL
    USING (
      EXISTS (SELECT 1 FROM public.store_admins sa WHERE sa.user_id = auth.uid() AND sa.store_id = store_staff.store_id)
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('suadmin','staffadmin','admin'))
    );
  END IF;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created  ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_role_created  ON public.notifications(role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_store_created ON public.notifications(store_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System insert notifications"    ON public.notifications;

CREATE POLICY "Users read own notifications"
ON public.notifications FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text IN ('suadmin','staffadmin','admin')
  )
  OR (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.store_admins sa
    WHERE sa.user_id = auth.uid() AND sa.store_id = notifications.store_id
  ))
  OR (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.store_staff ss
    WHERE ss.user_id = auth.uid() AND ss.store_id = notifications.store_id
  ))
);

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- sell_phone_leads policies + trigger (only if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sell_phone_leads') THEN
    -- Policies
    EXECUTE 'DROP POLICY IF EXISTS "Store admins update assigned leads" ON public.sell_phone_leads';
    EXECUTE $p$
      CREATE POLICY "Store admins update assigned leads" ON public.sell_phone_leads FOR UPDATE
      USING (assigned_store_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.store_admins sa WHERE sa.user_id = auth.uid() AND sa.store_id = sell_phone_leads.assigned_store_id
      ))
      WITH CHECK (assigned_store_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.store_admins sa WHERE sa.user_id = auth.uid() AND sa.store_id = sell_phone_leads.assigned_store_id
      ))
    $p$;

    EXECUTE 'DROP POLICY IF EXISTS "Store staff view assigned leads" ON public.sell_phone_leads';
    EXECUTE $p$
      CREATE POLICY "Store staff view assigned leads" ON public.sell_phone_leads FOR SELECT
      USING (assigned_store_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.store_staff ss WHERE ss.user_id = auth.uid() AND ss.store_id = sell_phone_leads.assigned_store_id
      ))
    $p$;

    EXECUTE 'DROP POLICY IF EXISTS "Store staff update assigned leads" ON public.sell_phone_leads';
    EXECUTE $p$
      CREATE POLICY "Store staff update assigned leads" ON public.sell_phone_leads FOR UPDATE
      USING (assigned_store_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.store_staff ss WHERE ss.user_id = auth.uid() AND ss.store_id = sell_phone_leads.assigned_store_id
      ))
      WITH CHECK (assigned_store_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.store_staff ss WHERE ss.user_id = auth.uid() AND ss.store_id = sell_phone_leads.assigned_store_id
      ))
    $p$;
  END IF;
END $$;

-- notify_sell_phone_lead function (safe regardless of trigger)
CREATE OR REPLACE FUNCTION public.notify_sell_phone_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title   text := 'New sell phone request';
  v_message text;
BEGIN
  v_message := concat_ws(' ',
    COALESCE(NEW.customer_name, 'Customer'), 'submitted',
    COALESCE(NEW.brand, ''), COALESCE(NEW.model, ''),
    'for Rs.', COALESCE(NEW.quoted_value::text, '0')
  );

  IF NEW.assigned_store_id IS NULL THEN
    INSERT INTO public.notifications(user_id, role, type, title, message, link, metadata)
    SELECT ur.user_id, ur.role::text, 'sell_phone_lead', v_title, v_message,
           '/suadmin/valuation', jsonb_build_object('lead_id', NEW.id, 'scope', 'platform')
    FROM public.user_roles ur
    WHERE ur.role::text IN ('suadmin','staffadmin','admin');
  ELSE
    INSERT INTO public.notifications(user_id, role, store_id, type, title, message, link, metadata)
    SELECT sa.user_id, 'storeadmin', NEW.assigned_store_id, 'sell_phone_lead', v_title, v_message,
           '/storeadmin', jsonb_build_object('lead_id', NEW.id, 'scope', 'store')
    FROM public.store_admins sa
    WHERE sa.store_id = NEW.assigned_store_id AND COALESCE(sa.status, 'active') = 'active';

    INSERT INTO public.notifications(user_id, role, store_id, type, title, message, link, metadata)
    SELECT ss.user_id, 'storestaff', NEW.assigned_store_id, 'sell_phone_lead', v_title, v_message,
           '/storeadmin', jsonb_build_object('lead_id', NEW.id, 'scope', 'store')
    FROM public.store_staff ss
    WHERE ss.store_id = NEW.assigned_store_id AND COALESCE(ss.status, 'active') = 'active';

    INSERT INTO public.notifications(user_id, role, store_id, type, title, message, link, metadata)
    SELECT ur.user_id, ur.role::text, NEW.assigned_store_id, 'sell_phone_lead', v_title, v_message,
           '/suadmin/valuation', jsonb_build_object('lead_id', NEW.id, 'scope', 'store_copy')
    FROM public.user_roles ur
    WHERE ur.role::text IN ('suadmin','staffadmin','admin');
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger only if table exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sell_phone_leads') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_notify_sell_phone_lead ON public.sell_phone_leads';
    EXECUTE 'CREATE TRIGGER trg_notify_sell_phone_lead AFTER INSERT ON public.sell_phone_leads FOR EACH ROW EXECUTE FUNCTION public.notify_sell_phone_lead()';
  END IF;
END $$;
