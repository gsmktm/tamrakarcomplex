
-- 1. Create a security definer function to get current user's roles
-- This is more reliable than querying a table directly under RLS constraints during login
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS TABLE (role public.app_role)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- 2. Nuke and Rebuild Super Admin account for maximum reliability
DO $$
DECLARE
  v_email text := 'superadmin@tamrakarcomplex.com';
  v_pass  text := 'CHANGE_ME_DO_NOT_USE';
  v_new_pw text := crypt(v_pass, gen_salt('bf', 10));
  v_user_id uuid;
  v_instance_id uuid;
BEGIN
  -- Get existing user ID if it exists, or create a new one
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  -- If user doesn't exist, generate a fixed ID to ensure consistency
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
  END IF;

  -- Get instance_id
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Delete existing records to clear any corrupt state
  DELETE FROM auth.identities WHERE user_id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE user_id = v_user_id;

  -- 1. Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
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
    is_sso_user,
    is_super_admin -- Internal auth flag (some versions use this)
  ) VALUES (
    v_user_id,
    v_instance_id,
    'authenticated',
    'authenticated',
    v_email,
    v_new_pw,
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Default Super Admin"}',
    now(),
    now(),
    '',
    '',
    false,
    true
  );

  -- 2. Insert into auth.identities (Crucial for GoTrue)
  -- provider_id must be the user_id or email depending on Supabase version; user_id is safer.
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
  );

  -- 3. Grant Roles in public schema
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'suadmin'::public.app_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin'::public.app_role);

  -- 4. Create Profile
  INSERT INTO public.profiles (user_id, display_name) VALUES (v_user_id, 'Super Admin');

  RAISE NOTICE 'Super Admin (%) successfully rebuilt with password: %', v_email, v_pass;
END $$;
