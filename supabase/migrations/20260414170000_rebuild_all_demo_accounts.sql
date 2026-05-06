
-- Global Demo Rebuild: Fixes all confirmation and credential issues for demo accounts.
-- This script nukes existing records and creates fresh, pre-confirmed accounts with fixed passwords.

DO $$
DECLARE
  v_instance_id uuid;
  v_new_pw text := crypt('CHANGE_ME_DO_NOT_USE', gen_salt('bf', 10));
  v_users JSONB := '[
    {"id": "00000000-0000-0000-0000-000000000001", "email": "suadmin@tamrakarcomplex.com", "role": "suadmin", "name": "Ultimate Super Admin"},
    {"id": "00000000-0000-0000-0000-000000000002", "email": "admin@tamrakarcomplex.com", "role": "admin", "name": "Standard Admin"},
    {"id": "00000000-0000-0000-0000-000000000003", "email": "store@tamrakarcomplex.com", "role": "store_owner", "name": "Demo Store Owner"},
    {"id": "00000000-0000-0000-0000-000000000004", "email": "user@tamrakarcomplex.com", "role": "public_user", "name": "Demo Regular User"}
  ]';
  v_user JSONB;
BEGIN
  -- 1. Get real instance_id
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance_id IS NULL THEN v_instance_id := '00000000-0000-0000-0000-000000000000'; END IF;

  FOR v_user IN SELECT * FROM jsonb_array_elements(v_users)
  LOOP
    -- A. Nuke by email to clear any half-created states
    DELETE FROM auth.identities WHERE lower(identity_data->>'email') = lower(v_user->>'email');
    DELETE FROM auth.users WHERE lower(email) = lower(v_user->>'email');
    DELETE FROM public.user_roles WHERE user_id = (v_user->>'id')::uuid;
    DELETE FROM public.profiles WHERE user_id = (v_user->>'id')::uuid;

    -- B. Insert fresh confirmed user
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, 
      email_confirmed_at, confirmed_at, last_sign_in_at, 
      raw_app_meta_data, raw_user_meta_data, 
      created_at, updated_at, 
      confirmation_token, recovery_token, is_sso_user, is_super_admin
    ) VALUES (
      (v_user->>'id')::uuid, v_instance_id, 'authenticated', 'authenticated', v_user->>'email', v_new_pw, 
      now(), now(), now(), 
      '{"provider": "email", "providers": ["email"]}', 
      json_build_object('full_name', v_user->>'name'), 
      now(), now(), 
      '', '', false, (v_user->>'role' = 'suadmin')
    );

    -- C. Create Identity
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), (v_user->>'id')::uuid, json_build_object('sub', v_user->>'id', 'email', v_user->>'email'), 'email', v_user->>'email', now(), now(), now());

    -- D. Assign Roles
    INSERT INTO public.user_roles (user_id, role) VALUES ((v_user->>'id')::uuid, (v_user->>'role')::public.app_role);
    IF (v_user->>'role' = 'suadmin') THEN
      INSERT INTO public.user_roles (user_id, role) VALUES ((v_user->>'id')::uuid, 'admin'::public.app_role);
    END IF;

    -- E. Create Profile
    INSERT INTO public.profiles (user_id, display_name) VALUES ((v_user->>'id')::uuid, v_user->>'name');

  END LOOP;

  -- F. Ensure the Demo Store belongs to the new fixed Store Owner ID
  UPDATE public.stores 
  SET owner_id = '00000000-0000-0000-0000-000000000003' 
  WHERE slug = 'tamrakar-demo-store';

  RAISE NOTICE 'All 4 demo accounts have been nuked and rebuilt with password: CHANGE_ME_DO_NOT_USE';
END $$;
