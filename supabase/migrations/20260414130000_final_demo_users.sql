
-- 1. Ensure pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Final Hardened Demo Users Migration
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
BEGIN
  -- Get valid instance_id
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  FOR v_user IN SELECT * FROM jsonb_array_elements(v_users)
  LOOP
    -- A. Find or Create User
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_user->>'email');
    
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
        v_user_id, 'authenticated', 'authenticated', v_user->>'email', v_new_pw, 
        now(), now(), 
        '{"provider": "email", "providers": ["email"]}', 
        json_build_object('full_name', v_user->>'full_name'),
        now(), now(), v_instance_id,
        '', '', false
      );
    ELSE
      -- B. FORCE UPDATE existing user
      UPDATE auth.users
      SET encrypted_password = v_new_pw,
          email_confirmed_at = now(),
          last_sign_in_at = now(),
          updated_at = now(),
          raw_app_meta_data = '{"provider": "email", "providers": ["email"]}',
          raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', to_jsonb(v_user->>'full_name')),
          instance_id = v_instance_id,
          confirmation_token = '',
          recovery_token = ''
      WHERE id = v_user_id;
    END IF;

    -- C. Ensure Identity Record
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

    -- D. Clear existing roles and assign the target role
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (v_user_id, (v_user->>'role')::public.app_role);

    -- E. Create/Update Profile
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (v_user_id, v_user->>'full_name')
    ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;

  END LOOP;
END $$;

-- 3. Update Security Functions for new emails
CREATE OR REPLACE FUNCTION public.dev_ensure_confirmed_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(p_email) NOT IN (
    'suadmin@tamrakarcomplex.com', 
    'admin@tamrakarcomplex.com', 
    'store@tamrakarcomplex.com',
    'user@tamrakarcomplex.com',
    'bootstrap-admin@example.invalid', 
    'gsmktm@gmail.com'
  ) THEN
    RETURN false;
  END IF;

  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE lower(email) = lower(p_email);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'suadmin'
    ) OR (
        lower(auth.jwt() ->> 'email') IN (
          'suadmin@tamrakarcomplex.com',
          'admin@tamrakarcomplex.com', 
          'bootstrap-admin@example.invalid', 
          'gsmktm@gmail.com'
        )
    );
$$;
