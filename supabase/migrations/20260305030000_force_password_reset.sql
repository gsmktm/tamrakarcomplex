
-- Force password reset for gsmktm@gmail.com to 'CHANGE_ME_DO_NOT_USE'
-- This script ensures the user exists and has the correct password hash

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
BEGIN
  -- 1. Generate new hash for 'CHANGE_ME_DO_NOT_USE'
  -- Note: Supabase uses bcrypt. We must ensure the hash is compatible.
  v_encrypted_pw := crypt('CHANGE_ME_DO_NOT_USE', gen_salt('bf', 10));

  -- 2. Find or Create User
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
    -- FORCE UPDATE PASSWORD AND CONFIRMATION
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = now(),
        updated_at = now(),
        raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'
    WHERE id = v_user_id;
  END IF;

  -- 3. Ensure Identity Exists (Crucial for Supabase Auth to validate login)
  -- Sometimes login fails if the identity record is missing or mismatched
  BEGIN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      json_build_object('sub', v_user_id, 'email', 'gsmktm@gmail.com'),
      'email',
      v_user_id::text,
      now(), now(), now()
    );
  EXCEPTION WHEN unique_violation THEN
    -- If identity exists, update it just in case
    -- We can't easily find the exact row without knowing the ID, but usually provider+provider_id is unique
    -- Let's just ignore if it exists.
  END;

  -- 4. Re-grant roles
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'suadmin') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin') ON CONFLICT DO NOTHING;

END $$;
