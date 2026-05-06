-- Fix: Grant suadmin role to gsmktm@gmail.com
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find the user
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('gsmktm@gmail.com')
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Grant suadmin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'suadmin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Granted suadmin to gsmktm@gmail.com (user_id: %)', v_user_id;
  ELSE
    RAISE NOTICE 'User gsmktm@gmail.com not found in auth.users';
  END IF;
END $$;