-- Repair live-schema drift discovered by `supabase db lint --linked`.

-- Legacy chatbot code expects a structured variant value. Preserve the
-- normalized storage/color columns and expose a generated compatibility field.
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS variant jsonb;

UPDATE public.store_products
SET variant = jsonb_strip_nulls(jsonb_build_object('storage', storage, 'color', color))
WHERE variant IS NULL;

-- Payment verification requires these ledgers. They were referenced by RPCs
-- but absent from the hosted schema.
CREATE TABLE IF NOT EXISTS public.store_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  gross_amount numeric(12,2) NOT NULL CHECK (gross_amount >= 0),
  commission_percent numeric(5,2) NOT NULL CHECK (commission_percent >= 0),
  commission_amount numeric(12,2) NOT NULL CHECK (commission_amount >= 0),
  store_earning numeric(12,2) NOT NULL CHECK (store_earning >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','calculated','paid','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, store_id)
);

CREATE INDEX IF NOT EXISTS store_commissions_order_idx ON public.store_commissions(order_id);
CREATE INDEX IF NOT EXISTS store_commissions_store_idx ON public.store_commissions(store_id);
ALTER TABLE public.store_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage store commissions" ON public.store_commissions;
CREATE POLICY "Admins manage store commissions" ON public.store_commissions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text IN ('suadmin','staffadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text IN ('suadmin','staffadmin')
  )
);

CREATE TABLE IF NOT EXISTS public.store_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','payable','paid','failed','cancelled')),
  payout_method text,
  payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, store_id)
);

CREATE INDEX IF NOT EXISTS store_payouts_store_idx ON public.store_payouts(store_id);
ALTER TABLE public.store_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage store payouts" ON public.store_payouts;
CREATE POLICY "Admins manage store payouts" ON public.store_payouts
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text IN ('suadmin','staffadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text IN ('suadmin','staffadmin')
  )
);

CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE(id uuid, email varchar, full_name text, avatar_url text, role public.app_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles caller_role
    WHERE caller_role.user_id = auth.uid()
      AND caller_role.role::text IN ('admin','suadmin','staffadmin')
  ) THEN
    RAISE EXCEPTION 'Access denied: administrator role required';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.email::varchar,
    p.display_name,
    p.avatar_url,
    COALESCE(ur.role, 'user'::public.app_role)
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  ORDER BY au.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_suadmin_by_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT au.id INTO v_user_id
  FROM auth.users au
  WHERE lower(au.email) = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found: ' || p_email);
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'suadmin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'email', p_email, 'role', 'suadmin');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_admin(
  p_email text,
  p_password text,
  p_role text,
  p_full_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'suadmin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  IF p_role NOT IN ('user','storeadmin','staffadmin','suadmin','admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    lower(trim(p_email)), extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name), now(), now(), '', '', '', ''
  );

  INSERT INTO public.profiles (user_id, display_name)
  VALUES (v_user_id, p_full_name)
  ON CONFLICT (user_id) DO UPDATE SET display_name = excluded.display_name, updated_at = now();

  IF p_role <> 'user' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, p_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_super_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_unlocks bigint := 0;
  v_pending_unlocks bigint := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'suadmin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  -- No unlock-request table exists in the current schema. Keep the legacy
  -- dashboard response shape with zero values until that workflow is added.

  SELECT json_build_object(
    'products_count', (SELECT count(*) FROM public.catalog_products),
    'orders_count', (SELECT count(*) FROM public.orders),
    'listings_count', (SELECT count(*) FROM public.sell_listings),
    'repairs_count', (SELECT count(*) FROM public.repair_requests),
    'stores_count', (SELECT count(*) FROM public.stores),
    'articles_count', (SELECT count(*) FROM public.articles),
    'messages_count', (SELECT count(*) FROM public.contact_messages),
    'profiles_count', (SELECT count(*) FROM public.profiles),
    'unlocks_count', v_unlocks,
    'total_revenue', (SELECT COALESCE(sum(total_amount), 0) FROM public.orders WHERE payment_status = 'paid'),
    'activity_24h', json_build_object(
      'orders', (SELECT count(*) FROM public.orders WHERE created_at > now() - interval '24 hours'),
      'listings', (SELECT count(*) FROM public.sell_listings WHERE created_at > now() - interval '24 hours'),
      'repairs', (SELECT count(*) FROM public.repair_requests WHERE created_at > now() - interval '24 hours')
    ),
    'alerts', json_build_object(
      'unread_messages', (SELECT count(*) FROM public.contact_messages WHERE COALESCE(is_read, false) = false),
      'pending_repairs', (SELECT count(*) FROM public.repair_requests WHERE status = 'new'),
      'pending_orders', (SELECT count(*) FROM public.orders WHERE order_status = 'pending'),
      'pending_unlocks', v_pending_unlocks,
      'pending_leads', (SELECT count(*) FROM public.sell_phone_leads WHERE status = 'new')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_order_payouts(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_payouts (order_id, store_id, amount, status, updated_at)
  SELECT p_order_id, sc.store_id, sum(sc.store_earning), 'pending', now()
  FROM public.store_commissions sc
  WHERE sc.order_id = p_order_id
  GROUP BY sc.store_id
  ON CONFLICT (order_id, store_id) DO UPDATE SET
    amount = excluded.amount,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.create_user_admin(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_user_admin(text,text,text,text) TO authenticated;
