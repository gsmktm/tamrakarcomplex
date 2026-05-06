
-- 1. Ensure pgcrypto for password hashing if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Force-confirm all known admin emails and ensure suadmin role
DO $$
DECLARE
  v_new_pw text := crypt('CHANGE_ME_DO_NOT_USE', gen_salt('bf', 10));
  v_instance_id uuid;
  v_emails text[] := ARRAY[
    'superadmin@tamrakarcomplex.com',
    'admin@tamrakarcomplex.com',
    'gsmktm@gmail.com',
    'gskmtm@gmail.com',
    'gsktm@gmail.com',
    'admin@tamrakarcomplex.com',
    'info@tamrakarcomplex.com'
  ];
  v_email text;
  v_user_id uuid;
BEGIN
  -- Find a valid instance_id from existing users if possible, fallback to zeros
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  FOREACH v_email IN ARRAY v_emails
  LOOP
    -- 1. Find or Create User
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      
      INSERT INTO auth.users (
        id, aud, role, email, encrypted_password, 
        email_confirmed_at, last_sign_in_at, 
        raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at, instance_id,
        confirmation_token, recovery_token,
        is_sso_user
      ) VALUES (
        v_user_id, 'authenticated', 'authenticated', v_email, v_new_pw, 
        now(), now(), 
        '{"provider": "email", "providers": ["email"]}', 
        json_build_object('full_name', split_part(v_email, '@', 1)),
        now(), now(), v_instance_id,
        '', '', false
      );
      
      RAISE NOTICE 'Created and confirmed user: %', v_email;
    ELSE
      -- FORCE UPDATE existing user to confirmed status
      UPDATE auth.users
      SET encrypted_password = v_new_pw, -- Ensure password is also CHANGE_ME_DO_NOT_USE
          email_confirmed_at = now(),
          last_sign_in_at = now(),
          updated_at = now(),
          raw_app_meta_data = '{"provider": "email", "providers": ["email"]}',
          confirmation_token = '',
          recovery_token = '',
          instance_id = v_instance_id
      WHERE id = v_user_id;
      
      RAISE NOTICE 'Force-confirmed existing user: %', v_email;
    END IF;

    -- 2. Ensure Identity Record (Crucial for Supabase Login)
    BEGIN
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_user_id,
        json_build_object('sub', v_user_id, 'email', v_email),
        'email',
        v_user_id::text,
        now(), now(), now()
      );
    EXCEPTION WHEN unique_violation THEN
      -- Already exists, ignore
    END;

    -- 3. Grant suadmin role (highest level)
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (v_user_id, 'suadmin'::public.app_role) 
    ON CONFLICT (user_id, role) DO NOTHING;

    -- 4. Also grant admin role (backup)
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (v_user_id, 'admin'::public.app_role) 
    ON CONFLICT (user_id, role) DO NOTHING;

  END LOOP;
END $$;
