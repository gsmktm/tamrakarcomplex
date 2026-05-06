-- Setup users with roles
-- Run this in Supabase SQL Editor after users are created via Supabase Auth

DO $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  -- Array of users: email -> role mapping
  -- admin@tamrakarcomplex.com -> suadmin
  -- store@tamrakarcomplex.com -> store_owner
  -- user@tamrakarcomplex.com -> (default public_user)

  -- Grant suadmin to admin@tamrakarcomplex.com
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('admin@tamrakarcomplex.com')
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'suadmin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RAISE NOTICE 'Granted suadmin to admin@tamrakarcomplex.com';
  ELSE
    RAISE NOTICE 'User admin@tamrakarcomplex.com not found - create via Supabase Auth first';
  END IF;

  -- Grant store_owner to store@tamrakarcomplex.com
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('store@tamrakarcomplex.com')
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'store_owner'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RAISE NOTICE 'Granted store_owner to store@tamrakarcomplex.com';
  ELSE
    RAISE NOTICE 'User store@tamrakarcomplex.com not found - create via Supabase Auth first';
  END IF;

  -- user@tamrakarcomplex.com stays as public_user (no role insert needed)
  RAISE NOTICE 'user@tamrakarcomplex.com will be regular user';
END $$;