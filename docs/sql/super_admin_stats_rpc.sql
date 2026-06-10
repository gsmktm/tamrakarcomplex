-- Super Admin Dashboard Statistics RPC
CREATE OR REPLACE FUNCTION public.get_super_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  total_revenue numeric;
  products_count bigint;
  orders_count bigint;
  listings_count bigint;
  repairs_count bigint;
  stores_count bigint;
  articles_count bigint;
  messages_count bigint;
  profiles_count bigint;
  unlocks_count bigint;
  orders_24h bigint;
  listings_24h bigint;
  repairs_24h bigint;
  unread_messages bigint;
  pending_repairs bigint;
  pending_orders bigint;
  pending_unlocks bigint;
  pending_leads bigint;
BEGIN
  -- Check if caller is suadmin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'suadmin'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Super Admin only';
  END IF;

  -- Core counts
  SELECT count(*) INTO products_count FROM public.catalog_products;
  SELECT count(*) INTO orders_count FROM public.orders;
  SELECT count(*) INTO listings_count FROM public.sell_listings;
  SELECT count(*) INTO repairs_count FROM public.repair_requests;
  SELECT count(*) INTO stores_count FROM public.stores;
  SELECT count(*) INTO articles_count FROM public.articles;
  SELECT count(*) INTO messages_count FROM public.contact_messages;
  SELECT count(*) INTO profiles_count FROM public.profiles;
  SELECT count(*) INTO unlocks_count FROM public.unlock_requests;
  
  -- Revenue
  SELECT COALESCE(sum(total_revenue), 0) INTO total_revenue FROM public.stores;

  -- 24h Activity
  SELECT count(*) INTO orders_24h FROM public.orders WHERE created_at > now() - interval '24 hours';
  SELECT count(*) INTO listings_24h FROM public.sell_listings WHERE created_at > now() - interval '24 hours';
  SELECT count(*) INTO repairs_24h FROM public.repair_requests WHERE created_at > now() - interval '24 hours';

  -- Pending/Alerts
  SELECT count(*) INTO unread_messages FROM public.contact_messages WHERE status = 'unread';
  SELECT count(*) INTO pending_repairs FROM public.repair_requests WHERE status = 'new';
  SELECT count(*) INTO pending_orders FROM public.orders WHERE order_status = 'pending';
  SELECT count(*) INTO pending_unlocks FROM public.unlock_requests WHERE status = 'pending';
  
  -- Use sell_phone_leads for pending leads as per current schema
  SELECT count(*) INTO pending_leads FROM public.sell_phone_leads WHERE status = 'new';

  result := json_build_object(
    'products_count', products_count,
    'orders_count', orders_count,
    'listings_count', listings_count,
    'repairs_count', repairs_count,
    'stores_count', stores_count,
    'articles_count', articles_count,
    'messages_count', messages_count,
    'profiles_count', profiles_count,
    'unlocks_count', unlocks_count,
    'total_revenue', total_revenue,
    'activity_24h', json_build_object(
      'orders', orders_24h,
      'listings', listings_24h,
      'repairs', repairs_24h
    ),
    'alerts', json_build_object(
      'unread_messages', unread_messages,
      'pending_repairs', pending_repairs,
      'pending_orders', pending_orders,
      'pending_unlocks', pending_unlocks,
      'pending_leads', pending_leads
    )
  );

  RETURN result;
END;
$$;

-- Function to get catalog verification stats
CREATE OR REPLACE FUNCTION public.get_catalog_verification_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count bigint;
  verified_count bigint;
  unverified_count bigint;
  needs_review_count bigint;
  brands_count bigint;
  models_count bigint;
BEGIN
  SELECT count(*) INTO total_count FROM public.catalog_products;
  SELECT count(*) INTO verified_count FROM public.catalog_products WHERE verified = true;
  SELECT count(*) INTO unverified_count FROM public.catalog_products WHERE verified = false;
  SELECT count(*) INTO needs_review_count FROM public.catalog_products 
  WHERE verified = false AND (image_url IS NULL OR specs_json = '{}'::jsonb);

  SELECT count(*) INTO brands_count FROM public.brands;
  SELECT count(*) INTO models_count FROM public.device_models;

  RETURN json_build_object(
    'total_products', total_count,
    'verified_products', verified_count,
    'pending_verification', unverified_count,
    'needs_review', needs_review_count,
    'total_brands', brands_count,
    'total_models', models_count
  );
END;
$$;

-- Admin User Creation RPC
CREATE OR REPLACE FUNCTION public.create_user_admin(
  p_email text,
  p_password text,
  p_role text,
  p_full_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if caller is suadmin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'suadmin'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Super Admin only';
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('full_name', p_full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new_user_id, p_full_name);

  IF p_role IS NOT NULL AND p_role != 'user' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, p_role::public.app_role);
  END IF;

  RETURN new_user_id;
END;
$$;

-- RPC to assign store admin by email
CREATE OR REPLACE FUNCTION public.assign_store_admin_by_email(
  p_email text,
  p_store_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if caller is suadmin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'suadmin'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Super Admin only';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email %', p_email;
  END IF;

  INSERT INTO public.store_admins (user_id, store_id)
  VALUES (v_user_id, p_store_id)
  ON CONFLICT (user_id, store_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'storeadmin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Fix User List Secure RPC to match new roles
CREATE OR REPLACE FUNCTION public.get_admin_users_list_secure()
RETURNS TABLE (
  id uuid,
  email varchar,
  full_name text,
  avatar_url text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is suadmin or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('suadmin', 'staffadmin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access Denied: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.email::varchar,
    COALESCE(
      p.display_name,
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      split_part(COALESCE(au.email, 'Unknown'), '@', 1)
    ) AS full_name,
    p.avatar_url,
    COALESCE(ur.role::text, 'user') AS role
  FROM auth.users au
  LEFT JOIN public.profiles p
    ON p.user_id = au.id
  LEFT JOIN LATERAL (
    SELECT user_roles.role
    FROM public.user_roles
    WHERE user_roles.user_id = au.id
    ORDER BY CASE user_roles.role
      WHEN 'suadmin' THEN 1
      WHEN 'staffadmin' THEN 2
      WHEN 'admin' THEN 3
      WHEN 'storeadmin' THEN 4
      WHEN 'user' THEN 5
      ELSE 6
    END
    LIMIT 1
  ) ur ON true
  ORDER BY au.created_at DESC;
END;
$$;