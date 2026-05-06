CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
    OR (
      (_role = 'admin'::public.app_role OR _role = 'suadmin'::public.app_role)
      AND lower(coalesce(auth.jwt() ->> 'email', '')) IN ('gsmktm@gmail.com', 'gskmtm@gmail.com', 'gsktm@gmail.com', 'admin@tamrakarcomplex.com')
    );
$$;

