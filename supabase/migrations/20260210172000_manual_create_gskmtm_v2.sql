
-- Manually create user gskmtm@gmail.com with password 'CHANGE_ME_DO_NOT_USE'
-- Using pgcrypto for hashing

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
BEGIN
  -- Generate bcrypt hash for 'CHANGE_ME_DO_NOT_USE'
  -- Note: Supabase uses bcrypt with cost 10 by default
  v_encrypted_pw := crypt('CHANGE_ME_DO_NOT_USE', gen_salt('bf', 10));
  
  -- Check if user exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'gskmtm@gmail.com';
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      instance_id
    ) VALUES (
      v_user_id,
      'authenticated',
      'authenticated',
      'gskmtm@gmail.com',
      v_encrypted_pw,
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '00000000-0000-0000-0000-000000000000'
    );
  ELSE
    -- Update existing user
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = now(),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create identity (essential for GoTrue to recognize the user properly sometimes)
  -- Try to insert without ON CONFLICT first, catching specific error if needed
  -- The constraint is usually (provider_id, provider) or similar.
  -- Let's just try to insert and ignore error if it fails (using a block)
  BEGIN
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
      json_build_object('sub', v_user_id, 'email', 'gskmtm@gmail.com'),
      'email',
      v_user_id::text, -- provider_id is text
      now(),
      now(),
      now()
    );
  EXCEPTION WHEN unique_violation THEN
    -- Ignore
  END;

END $$;
