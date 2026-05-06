
-- 1. Ensure pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Hardened Fix for Super Admin Login
-- We will reset both 'superadmin@tamrakarcomplex.com' and 'admin@tamrakarcomplex.com' to 'CHANGE_ME_DO_NOT_USE'
-- This ensures that if one fails, the other can be tried.

DO $$
DECLARE
  v_new_pw text := crypt('CHANGE_ME_DO_NOT_USE', gen_salt('bf', 10));
  v_instance_id uuid;
  v_users JSONB := '[
    {"email": "superadmin@tamrakarcomplex.com", "full_name": "Super Admin"},
    {"email": "admin@tamrakarcomplex.com", "full_name": "System Admin"}
  ]';
  v_user JSONB;
  v_user_id uuid;
BEGIN
  -- Find a valid instance_id from existing users if possible, fallback to zeros
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  FOR v_user IN SELECT * FROM jsonb_array_elements(v_users)
  LOOP
    -- 1. Find or Create User
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_user->>'email';
    
    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      
      INSERT INTO auth.users (
        id, aud, role, email, encrypted_password, 
        email_confirmed_at, last_sign_in_at, 
        raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at, instance_id
      ) VALUES (
        v_user_id, 'authenticated', 'authenticated', v_user->>'email', v_new_pw, 
        now(), now(), 
        '{"provider": "email", "providers": ["email"]}', 
        json_build_object('full_name', v_user->>'full_name'),
        now(), now(), v_instance_id
      );
      
      RAISE NOTICE 'Created new user: %', v_user->>'email';
    ELSE
      -- FORCE UPDATE existing user
      UPDATE auth.users
      SET encrypted_password = v_new_pw,
          email_confirmed_at = now(),
          last_sign_in_at = now(),
          updated_at = now(),
          raw_app_meta_data = '{"provider": "email", "providers": ["email"]}',
          raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', to_jsonb(v_user->>'full_name')),
          instance_id = v_instance_id
      WHERE id = v_user_id;
      
      RAISE NOTICE 'Updated existing user: %', v_user->>'email';
    END IF;

    -- 2. Ensure Identity Record (Crucial for Supabase Login)
    -- If it doesn't exist, create it. If it does, we ignore.
    BEGIN
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_user_id,
        json_build_object('sub', v_user_id, 'email', v_user->>'email'),
        'email',
        v_user_id::text,
        now(), now(), now()
      );
    EXCEPTION WHEN unique_violation THEN
      -- Already exists, ignore
    END;

    -- 3. Grant Roles (Giving both for maximum safety)
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (v_user_id, 'suadmin'::public.app_role) 
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role) 
    VALUES (v_user_id, 'admin'::public.app_role) 
    ON CONFLICT (user_id, role) DO NOTHING;

  END LOOP;

  -- 4. Also Ensure gsmktm@gmail.com is fixed as a backup
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'gsmktm@gmail.com';
  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users SET encrypted_password = v_new_pw WHERE id = v_user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'suadmin'::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin'::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

END $$;
