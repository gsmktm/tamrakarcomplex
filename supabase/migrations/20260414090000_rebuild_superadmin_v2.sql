
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

-- The former block deleted and re-created an administrator in auth.users and
-- auth.identities using a hard-coded password. It also deleted role/profile
-- records. This is prohibited in schema migrations. Preserve the harmless
-- role-read function above; administrator provisioning belongs to explicitly
-- authorized Supabase Auth administration, never to migration replay.
-- No privileged account rows are created or changed in this version.
