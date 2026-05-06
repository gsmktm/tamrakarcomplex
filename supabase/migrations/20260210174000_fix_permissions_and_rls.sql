
-- Fix permissions for auth schema and public schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Grant access to auth tables (be careful with this in production, but for fixing login issues in dev)
GRANT SELECT ON auth.users TO service_role;
-- Authenticated users usually don't need direct access to auth.users, they use auth.uid()

-- Ensure user_roles is accessible
GRANT ALL ON public.user_roles TO postgres, service_role;
GRANT SELECT ON public.user_roles TO anon, authenticated;

-- Fix potential RLS issues on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them safely
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;

-- Create policies
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Also allow reading roles if you are a super admin (hardcoded emails in frontend, but need DB access too)
-- We can't easily hardcode emails in SQL policies without joining auth.users which might be slow or restricted.
-- But we can rely on the fact that we assigned 'admin' role to them.

-- Double check gsktm@gmail.com exists and has admin role
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'gsktm@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Ensure role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Ensure email is confirmed
    UPDATE auth.users SET email_confirmed_at = now() WHERE id = v_user_id;
  END IF;
END $$;
