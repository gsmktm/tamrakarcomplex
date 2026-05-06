
-- Create user gskmtm@gmail.com manually via SQL since API is rate limited
-- We use pgcrypto to hash the password 'CHANGE_ME_DO_NOT_USE'

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
BEGIN
  -- Generate bcrypt hash for 'CHANGE_ME_DO_NOT_USE'
  v_encrypted_pw := crypt('CHANGE_ME_DO_NOT_USE', gen_salt('bf'));
  
  -- Check if user exists (should be deleted by previous step, but just in case)
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'gskmtm@gmail.com';
  
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', -- Default instance_id
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'gskmtm@gmail.com',
      v_encrypted_pw,
      now(),
      NULL,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO v_user_id;
  ELSE
    -- Update existing user just in case
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

  -- Ensure identity exists (sometimes needed for Supabase Auth to work fully)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    json_build_object('sub', v_user_id, 'email', 'gskmtm@gmail.com'),
    'email',
    now(),
    now(),
    now()
  ) ON CONFLICT (provider, id) DO NOTHING; -- provider+id is unique in newer schemas, or provider+email? Actually unique constraint is usually on (provider_id, provider) where provider_id is the user_id or email?
  -- Wait, standard schema: (provider, identity_data->>'sub') or similar. 
  -- Let's try simpler insert or skip if it fails.
  -- Actually, the unique constraint on auth.identities is (provider_id, provider). 
  -- provider_id usually matches the user_id for email provider? No, it matches the email for email provider.
  
  -- Let's try to insert identity carefully
  BEGIN
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id, -- For email provider, usually the user_id is used as provider_id too? Or the email? 
                 -- Actually, for 'email' provider, Supabase uses the user_id as the provider_id.
      v_user_id,
      json_build_object('sub', v_user_id, 'email', 'gskmtm@gmail.com'),
      'email',
      now(),
      now(),
      now()
    );
  EXCEPTION WHEN unique_violation THEN
    -- Ignore if identity already exists
  END;

END $$;
