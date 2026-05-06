
-- 1. Ensure pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Hardened Demo Setup & Data Assignment
DO $$
DECLARE
  v_new_pw text := crypt('CHANGE_ME_DO_NOT_USE', gen_salt('bf', 10));
  v_instance_id uuid;
  v_users JSONB := '[
    {"email": "suadmin@tamrakarcomplex.com", "role": "suadmin", "full_name": "Demo Super Admin"},
    {"email": "admin@tamrakarcomplex.com", "role": "admin", "full_name": "Demo Admin"},
    {"email": "store@tamrakarcomplex.com", "role": "store_owner", "full_name": "Demo Store Owner"},
    {"email": "user@tamrakarcomplex.com", "role": "public_user", "full_name": "Demo User"}
  ]';
  v_user JSONB;
  v_user_id uuid;
  v_store_id uuid;
  v_package_id uuid;
BEGIN
  -- Get instance_id
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance_id IS NULL THEN v_instance_id := '00000000-0000-0000-0000-000000000000'; END IF;

  -- A. Create/Update Users
  FOR v_user IN SELECT * FROM jsonb_array_elements(v_users)
  LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_user->>'email');
    
    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, instance_id, confirmation_token, recovery_token, is_sso_user, confirmed_at)
      VALUES (v_user_id, 'authenticated', 'authenticated', v_user->>'email', v_new_pw, now(), now(), '{"provider": "email", "providers": ["email"]}', json_build_object('full_name', v_user->>'full_name'), now(), now(), v_instance_id, '', '', false, now());
    ELSE
      UPDATE auth.users SET encrypted_password = v_new_pw, email_confirmed_at = now(), confirmed_at = now(), updated_at = now(), instance_id = v_instance_id, confirmation_token = '', recovery_token = '' WHERE id = v_user_id;
    END IF;

    -- Ensure Identity
    BEGIN
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_user_id, json_build_object('sub', v_user_id, 'email', v_user->>'email'), 'email', v_user_id::text, now(), now(), now());
    EXCEPTION WHEN unique_violation THEN NULL; END;

    -- Assign Role
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, (v_user->>'role')::public.app_role);

    -- Create Profile
    INSERT INTO public.profiles (user_id, display_name) VALUES (v_user_id, v_user->>'full_name') ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;
  END LOOP;

  -- B. Setup Demo Store for the Store Owner
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'store@tamrakarcomplex.com';
  
  -- Create store if not exists
  SELECT id INTO v_store_id FROM public.stores WHERE owner_id = v_user_id LIMIT 1;
  IF v_store_id IS NULL THEN
    v_store_id := gen_random_uuid();
    INSERT INTO public.stores (id, owner_id, name, slug, description, location, shop_no, is_verified, created_at, updated_at)
    VALUES (v_store_id, v_user_id, 'Tamrakar Demo Store', 'tamrakar-demo-store', 'A professional demo store at Tamrakar Complex showing all features.', 'Ground Floor', 'G-101', true, now(), now());
  END IF;

  -- Assign Diamond Subscription to Demo Store
  SELECT id INTO v_package_id FROM public.packages WHERE slug = 'diamond' LIMIT 1;
  IF v_package_id IS NOT NULL THEN
    INSERT INTO public.store_subscriptions (store_id, package_id, status, is_enabled, start_date, end_date)
    VALUES (v_store_id, v_package_id, 'active', true, now(), now() + interval '1 year')
    ON CONFLICT (store_id) DO UPDATE SET package_id = EXCLUDED.package_id, status = 'active', end_date = now() + interval '1 year';
  END IF;

  -- C. Add Demo Products to this store
  INSERT INTO public.products (store_id, name, slug, price, category, brand, in_stock, description, created_at)
  VALUES 
    (v_store_id, 'iPhone 15 Pro Demo', 'iphone-15-pro-demo', 'Rs. 185,000', 'Smartphones', 'Apple', true, 'Demo product for testing store features.', now()),
    (v_store_id, 'Samsung S24 Ultra Demo', 'samsung-s24-ultra-demo', 'Rs. 175,000', 'Smartphones', 'Samsung', true, 'Demo product for testing store features.', now())
  ON CONFLICT (slug) DO NOTHING;

END $$;

-- 3. Hardened Force Confirm Function (Dev Only)
CREATE OR REPLACE FUNCTION public.dev_ensure_confirmed_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Security Check: Only allow blessed emails
  IF lower(p_email) NOT IN (
    'suadmin@tamrakarcomplex.com', 
    'admin@tamrakarcomplex.com', 
    'store@tamrakarcomplex.com',
    'user@tamrakarcomplex.com',
    'bootstrap-admin@example.invalid', 
    'gsmktm@gmail.com',
    'superadmin@tamrakarcomplex.com',
    'admin@tamrakarcomplex.com',
    'store@tamrakarcomplex.com',
    'user@tamrakarcomplex.com'
  ) THEN
    RETURN false;
  END IF;

  -- 2. Update auth.users with EVERY confirmation flag
  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmed_at = COALESCE(confirmed_at, now()),
      last_sign_in_at = COALESCE(last_sign_in_at, now()),
      updated_at = now(),
      confirmation_token = '',
      recovery_token = '',
      is_sso_user = false
  WHERE lower(email) = lower(p_email);

  RETURN true;
 END;
 $$;

-- 4. Hardcoded Authorization Bypass (Security Definer)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'suadmin') 
    OR lower(auth.jwt() ->> 'email') IN ('suadmin@tamrakarcomplex.com', 'admin@tamrakarcomplex.com', 'bootstrap-admin@example.invalid', 'gsmktm@gmail.com');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT public.is_super_admin() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR lower(auth.jwt() ->> 'email') IN ('admin@tamrakarcomplex.com');
$$;

CREATE OR REPLACE FUNCTION public.is_store_owner()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT public.is_admin() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND (role = 'store_owner' OR role = 'moderator'))
    OR lower(auth.jwt() ->> 'email') IN ('store@tamrakarcomplex.com');
$$;

-- 5. Demo Cleanup Function
CREATE OR REPLACE FUNCTION public.cleanup_demo_accounts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_emails text[] := ARRAY['suadmin@tamrakarcomplex.com', 'admin@tamrakarcomplex.com', 'store@tamrakarcomplex.com', 'user@tamrakarcomplex.com'];
  v_email text;
  v_user_id uuid;
BEGIN
  -- Only Super Admins can run cleanup
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  FOREACH v_email IN ARRAY v_emails LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_email);
    IF v_user_id IS NOT NULL THEN
      -- Delete associated data first
      DELETE FROM public.products WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = v_user_id);
      DELETE FROM public.store_subscriptions WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = v_user_id);
      DELETE FROM public.stores WHERE owner_id = v_user_id;
      DELETE FROM public.user_roles WHERE user_id = v_user_id;
      DELETE FROM public.profiles WHERE user_id = v_user_id;
      -- Delete from auth
      DELETE FROM auth.identities WHERE user_id = v_user_id;
      DELETE FROM auth.users WHERE id = v_user_id;
    END IF;
  END LOOP;
END;
$$;
