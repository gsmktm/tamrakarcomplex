-- ==============================================================================
-- ADMIN AUTHENTICATION & SECURITY HARDENING - FIXED
-- Fixes suadmin@tamrakarcomplex.com login and email confirmation issues.
-- Ensures all admin emails are confirmed and have correct roles.
-- ==============================================================================

-- 1. Ensure pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create helper to find first available instance_id
CREATE OR REPLACE FUNCTION public.get_auth_instance_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
$$;

-- 2.1. Update no_admin_exists to be more accurate
CREATE OR REPLACE FUNCTION public.no_admin_exists()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE role IN ('admin', 'suadmin')
  );
END;
$$;

-- 2.2. Unified role checking functions (Hardened)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'suadmin'
    ) OR (
        lower(auth.jwt() ->> 'email') IN (
          'suadmin@tamrakarcomplex.com',
          'admin@tamrakarcomplex.com', 
          'bootstrap-admin@example.invalid', 
          'gsmktm@gmail.com', 
          'gskmtm@gmail.com', 
          'gsktm@gmail.com', 
          'superadmin@tamrakarcomplex.com',
          'info@tamrakarcomplex.com'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) OR (
        lower(auth.jwt() ->> 'email') IN (
          'admin@tamrakarcomplex.com', 
          'suadmin@tamrakarcomplex.com',
          'bootstrap-admin@example.invalid'
        )
    );
$$;

-- 2.3. Harden and fix get_admin_users_list_secure
CREATE OR REPLACE FUNCTION public.get_admin_users_list_secure()
RETURNS TABLE (
  id uuid,
  email varchar,
  full_name text,
  avatar_url text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: You must be an Admin to view users.';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.email::varchar,
    COALESCE(
      p.display_name,
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      split_part(COALESCE(au.email, 'Unknown'), '@', 1)
    ) AS full_name,
    p.avatar_url,
    COALESCE(ur.role::text, 'public_user') AS role
  FROM auth.users au
  LEFT JOIN public.profiles p
    ON p.user_id = au.id
  LEFT JOIN LATERAL (
    SELECT user_roles.role
    FROM public.user_roles
    WHERE user_roles.user_id = au.id
    ORDER BY CASE user_roles.role
      WHEN 'suadmin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'store_owner' THEN 3
      WHEN 'moderator' THEN 4
      WHEN 'public_user' THEN 5
      WHEN 'user' THEN 6
      ELSE 7
    END
    LIMIT 1
  ) ur ON true
  ORDER BY au.created_at DESC;
END;
$$;

-- Grant permissions for secure functions
GRANT EXECUTE ON FUNCTION public.get_admin_users_list_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_store_owner() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.is_store_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT public.is_admin() OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND (role = 'store_owner' OR role = 'moderator')
    ) OR (
        lower(auth.jwt() ->> 'email') IN ('store@tamrakarcomplex.com')
    );
$$;

-- 3. Fix dev_ensure_confirmed_admin to include ALL admin emails
-- Explicitly drop potential overloaded versions that might be confusing the schema cache
DROP FUNCTION IF EXISTS public.dev_ensure_confirmed_admin(text);

CREATE OR REPLACE FUNCTION public.dev_ensure_confirmed_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF lower(p_email) NOT IN (
    'suadmin@tamrakarcomplex.com',
    'admin@tamrakarcomplex.com',
    'gsmktm@gmail.com',
    'gskmtm@gmail.com',
    'gsktm@gmail.com',
    'superadmin@tamrakarcomplex.com',
    'bootstrap-admin@example.invalid',
    'info@tamrakarcomplex.com',
    'store@tamrakarcomplex.com',
    'user@tamrakarcomplex.com'
  ) THEN
    RETURN false;
  END IF;

  -- Aggressively force confirm and clear tokens
  UPDATE auth.users
  SET email_confirmed_at = now(),
      confirmed_at = now(),
      last_sign_in_at = COALESCE(last_sign_in_at, now()),
      updated_at = now(),
      confirmation_token = '',
      recovery_token = '',
      email_change_token_new = '',
      raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{"provider": "email", "providers": ["email"]}'::jsonb),
        '{email_verified}',
        'true'::jsonb
      ),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{email_verified}',
        'true'::jsonb
      )
  WHERE lower(email) = lower(p_email);

  RETURN true;
END;
$$;

-- Grant permissions so frontend can call it
GRANT EXECUTE ON FUNCTION public.dev_ensure_confirmed_admin(text) TO anon, authenticated;

-- Ensure the cache is refreshed
NOTIFY pgrst, 'reload schema';

-- 4. Update bootstrap_admin to include all new admin emails
CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_email text;
  v_instance_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email, instance_id INTO v_user_email, v_instance_id FROM auth.users WHERE id = auth.uid();

  -- Allow ALL blessed emails to bypass the "exists" check
  IF NOT public.no_admin_exists() AND lower(v_user_email) NOT IN (
    'suadmin@tamrakarcomplex.com',
    'admin@tamrakarcomplex.com',
    'gsmktm@gmail.com',
    'gskmtm@gmail.com',
    'gsktm@gmail.com',
    'superadmin@tamrakarcomplex.com',
    'bootstrap-admin@example.invalid',
    'info@tamrakarcomplex.com'
  ) THEN
    RETURN false;
  END IF;

  -- Aggressively force confirm current user
  UPDATE auth.users 
  SET email_confirmed_at = now(),
      confirmed_at = now(),
      updated_at = now(),
      confirmation_token = '',
      instance_id = COALESCE(instance_id, public.get_auth_instance_id()),
      raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{"provider": "email", "providers": ["email"]}'::jsonb),
        '{email_verified}',
        'true'::jsonb
      )
  WHERE id = auth.uid();

  -- Ensure profile exists
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (auth.uid(), lower(v_user_email), split_part(v_user_email, '@', 1))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- Assign Roles
  DELETE FROM public.user_roles WHERE user_id = auth.uid();
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'suadmin'::public.app_role);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin'::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

-- 4. Force-confirm all known admin emails and ensure suadmin role
DO $$
DECLARE
  v_new_pw text := crypt('CHANGE_ME_DO_NOT_USE', gen_salt('bf', 10)); -- Explicitly use bcrypt with 10 rounds
  v_instance_id uuid;
  v_emails text[] := ARRAY[
    'suadmin@tamrakarcomplex.com',
    'admin@tamrakarcomplex.com',
    'gsmktm@gmail.com',
    'gskmtm@gmail.com',
    'gsktm@gmail.com',
    'superadmin@tamrakarcomplex.com',
    'bootstrap-admin@example.invalid',
    'info@tamrakarcomplex.com'
  ];
  v_email text;
  v_user_id uuid;
  v_existing_email text;
  v_target_role public.app_role;
BEGIN
  -- 1. Instance ID Lookup
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  FOREACH v_email IN ARRAY v_emails
  LOOP
    -- Determine role based on email
    IF lower(v_email) = 'bootstrap-admin@example.invalid' THEN
      v_target_role := 'admin'::public.app_role;
    ELSIF lower(v_email) = 'gsmktm@gmail.com' THEN
      v_target_role := 'suadmin'::public.app_role;
    ELSE
      v_target_role := 'suadmin'::public.app_role; -- Default for others in this list
    END IF;

    -- 2. Find or Create User
    SELECT id, email INTO v_user_id, v_existing_email FROM auth.users WHERE lower(email) = lower(v_email);

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();

      INSERT INTO auth.users (
        id, aud, role, email, encrypted_password,
        email_confirmed_at, confirmed_at, last_sign_in_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, instance_id,
        is_sso_user, confirmation_token
      ) VALUES (
        v_user_id, 'authenticated', 'authenticated', lower(v_email), v_new_pw,
        now(), now(), now(),
        '{"provider": "email", "providers": ["email"]}',
        json_build_object('full_name', split_part(v_email, '@', 1), 'email_verified', true),
        now(), now(), v_instance_id,
        false, ''
      );

      RAISE NOTICE 'Created and confirmed user: %', v_email;
    ELSE
      -- 3. FORCE UPDATE Password & Confirmation status
      UPDATE auth.users
      SET encrypted_password = v_new_pw,
          email_confirmed_at = now(),
          confirmed_at = now(),
          last_sign_in_at = now(),
          updated_at = now(),
          instance_id = v_instance_id,
          confirmation_token = '',
          recovery_token = '',
          raw_app_meta_data = jsonb_set(
            COALESCE(raw_app_meta_data, '{"provider": "email", "providers": ["email"]}'::jsonb),
            '{email_verified}',
            'true'::jsonb
          ),
          raw_user_meta_data = jsonb_set(
            COALESCE(raw_user_meta_data, '{}'::jsonb),
            '{email_verified}',
            'true'::jsonb
          )
      WHERE id = v_user_id;

      RAISE NOTICE 'Force-updated password and confirmed existing user: %', v_email;
    END IF;

    -- 4. Identity Management (Crucial for GoTrue lookup)
    -- Standard Supabase identity pattern: provider_id matches email for email provider
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    
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
      v_user_id, -- Using user_id as identity id is common in manual seeding to ensure 1:1
      v_user_id,
      json_build_object(
        'sub', v_user_id::text, 
        'email', lower(v_email), 
        'email_verified', true,
        'full_name', split_part(v_email, '@', 1)
      ),
      'email',
      lower(v_email),
      now(), now(), now()
    );

    -- 5. Profile & Role Linkage
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (v_user_id, lower(v_email), split_part(v_email, '@', 1))
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    -- Clear and set exact requested roles
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, v_target_role);

    -- If suadmin, also grant admin for backward compatibility in some views
    IF v_target_role = 'suadmin' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'admin'::public.app_role)
      ON CONFLICT DO NOTHING;
    END IF;

  END LOOP;
END $$;

-- 5. Security Hardening: Ensure RLS for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'suadmin')
  )
);

DROP POLICY IF EXISTS "Suadmins can manage all roles" ON public.user_roles;
CREATE POLICY "Suadmins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'suadmin'
  )
);


