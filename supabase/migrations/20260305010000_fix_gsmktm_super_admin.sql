
-- Fix gsmktm@gmail.com to be super admin with full permissions

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update has_role function to support multiple super admins and suadmin role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
    OR (
      (_role = 'admin'::public.app_role OR _role = 'suadmin'::public.app_role)
      AND lower(coalesce(auth.jwt() ->> 'email', '')) IN ('gsmktm@gmail.com', 'gskmtm@gmail.com', 'gsktm@gmail.com', 'admin@tamrakarcomplex.com')
    );
$$;

DO $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
BEGIN
  -- 1. Setup the user
  v_encrypted_pw := crypt('CHANGE_ME_DO_NOT_USE', gen_salt('bf', 10));
  
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'gsmktm@gmail.com';
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_user_id, 'authenticated', 'authenticated', 'gsmktm@gmail.com', v_encrypted_pw, now(),
      '{"provider": "email", "providers": ["email"]}', '{"full_name": "Super Admin"}', now(), now()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = now(),
        updated_at = now(),
        raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'
    WHERE id = v_user_id;
  END IF;

  -- 2. Grant roles (admin AND suadmin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'suadmin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Ensure identity exists
  BEGIN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, 
      json_build_object('sub', v_user_id, 'email', 'gsmktm@gmail.com'),
      'email', v_user_id::text, now(), now(), now()
    );
  EXCEPTION WHEN unique_violation THEN
    -- Ignore
  END;

  -- 4. Create profile if missing
  INSERT INTO public.profiles (user_id, display_name, bio)
  VALUES (v_user_id, 'Super Admin', 'System Administrator with full access')
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = 'Super Admin',
      updated_at = now();

END $$;
