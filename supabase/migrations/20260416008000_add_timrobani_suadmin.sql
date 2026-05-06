-- Grant suadmin role to bootstrap-admin@example.invalid
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('bootstrap-admin@example.invalid')
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'suadmin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Granted suadmin to bootstrap-admin@example.invalid (user_id: %)', v_user_id;
  ELSE
    RAISE NOTICE 'User bootstrap-admin@example.invalid not found - create user in Supabase Auth first';
  END IF;
END $$;