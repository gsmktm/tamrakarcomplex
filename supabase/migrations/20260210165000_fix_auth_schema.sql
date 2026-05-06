
-- Grant usage on auth schema to anon and authenticated
GRANT USAGE ON SCHEMA auth TO anon, authenticated;

-- Ensure auth.users is accessible (though RLS usually handles this, sometimes grants are missing)
GRANT SELECT ON auth.users TO anon, authenticated;

-- Fix potentially broken user record by deleting and letting frontend/script recreate
-- BUT wait, deleting might cascade delete roles and stores.
-- Better to just ensure the password is correct if possible, or update it.

-- Since we can't easily set password hash via SQL without pgcrypto extension and knowing the salt format,
-- we will try to enable the pgcrypto extension first if not enabled.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Removed hardcoded password setting for production safety

-- Also ensure the user exists in public.users if you have a trigger syncing them (optional but good practice)
-- (Your project seems to rely on auth.users mostly, but user_roles links to it)

-- Grant admin role again just in case
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'gskmtm@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Also ensure admin@tamrakarcomplex.com has admin role
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@tamrakarcomplex.com';
    IF v_user_id IS NOT NULL THEN
         INSERT INTO public.user_roles (user_id, role)
         VALUES (v_user_id, 'admin')
         ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
END $$;
