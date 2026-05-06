-- SQL to fix suadmin@tamrakarcomplex.com in database
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Create or update the user in auth.users
DO $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text := crypt('password', gen_salt('bf', 10));
BEGIN
  -- Check if user exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'suadmin@tamrakarcomplex.com';
  
  IF v_user_id IS NULL THEN
    -- Create new user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'suadmin@tamrakarcomplex.com',
      v_encrypted_pw,
      now(),  -- Email confirmed
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}',
      now(),
      now()
    ) RETURNING id INTO v_user_id;
    
    RAISE NOTICE 'Created user: suadmin@tamrakarcomplex.com';
  ELSE
    -- Update existing user
    UPDATE auth.users 
    SET 
      encrypted_password = v_encrypted_pw,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Updated user: suadmin@tamrakarcomplex.com';
  END IF;

  -- 2. Ensure role in user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'suadmin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Assigned suadmin role to user';
END $$;