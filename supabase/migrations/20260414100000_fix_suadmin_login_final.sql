
-- Final Fix for Super Admin Login
-- Ensures superadmin@tamrakarcomplex.com is confirmed, has identity, and suadmin role.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'superadmin@tamrakarcomplex.com';
  v_pass  text := 'CHANGE_ME_DO_NOT_USE';
  v_encrypted_pw text;
  v_instance_id uuid;
BEGIN
  -- 1. Generate encrypted password
  v_encrypted_pw := crypt(v_pass, gen_salt('bf', 10));

  -- 2. Find or Create User
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
  END IF;

  -- 3. Get valid instance_id
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- 4. Upsert User in auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    confirmation_token,
    recovery_token
  ) VALUES (
    v_user_id,
    v_instance_id,
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Super Admin"}',
    now(),
    now(),
    false,
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = excluded.raw_app_meta_data,
    updated_at = now(),
    confirmation_token = '',
    recovery_token = '';

  -- 5. Ensure Identity Record (Crucial for Supabase Login)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    json_build_object('sub', v_user_id, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    last_sign_in_at = now(),
    updated_at = now();

  -- 6. Grant suadmin role in public schema
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'suadmin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Super Admin (%) is now ready with password: %', v_email, v_pass;
END $$;
