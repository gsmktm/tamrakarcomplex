
-- Ultimate Force-Fix for Super Admin Login
-- This script nukes and re-creates the Super Admin record with the absolute highest level of compatibility.

DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-000000000001'; -- Fixed ID for Super Admin
  v_email text := 'suadmin@tamrakarcomplex.com';
  v_pass  text := 'CHANGE_ME_DO_NOT_USE';
  v_new_pw text := crypt(v_pass, gen_salt('bf', 10));
  v_instance_id uuid;
BEGIN
  -- 1. Get real instance_id from environment
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance_id IS NULL THEN v_instance_id := '00000000-0000-0000-0000-000000000000'; END IF;

  -- 2. Nuke everything related to this email to clear corrupt states
  DELETE FROM auth.identities WHERE lower(identity_data->>'email') = lower(v_email);
  DELETE FROM auth.users WHERE lower(email) = lower(v_email);
  DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = lower(v_email));
  DELETE FROM public.profiles WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = lower(v_email));

  -- 3. Create fresh user with every single flag enabled
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, 
    email_confirmed_at, confirmed_at, last_sign_in_at, 
    raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, 
    confirmation_token, recovery_token, is_sso_user, is_super_admin
  ) VALUES (
    v_user_id, v_instance_id, 'authenticated', 'authenticated', v_email, v_new_pw, 
    now(), now(), now(), 
    '{"provider": "email", "providers": ["email"]}', 
    '{"full_name": "Ultimate Super Admin"}', 
    now(), now(), 
    '', '', false, true
  );

  -- 4. Create identity record (CRITICAL: provider_id must be the email or user_id)
  -- We insert both common formats to be safe
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, json_build_object('sub', v_user_id, 'email', v_email), 'email', v_email, now(), now(), now());

  -- 5. Assign roles in public schema
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'suadmin'::public.app_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin'::public.app_role);

  -- 6. Create Profile
  INSERT INTO public.profiles (user_id, display_name) VALUES (v_user_id, 'Super Admin');

  RAISE NOTICE 'Nuclear Fix: % is now recreated and confirmed.', v_email;
END $$;
