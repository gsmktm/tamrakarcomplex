-- Auth & Role Resolution Stabilization
-- Ensures get_my_roles is robust and consistent

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    roles text[];
BEGIN
    -- 1. Get roles from user_roles table
    SELECT array_agg(role)
    INTO roles
    FROM public.user_roles
    WHERE user_id = auth.uid();

    -- 2. Fallback to app_metadata if no roles in table
    IF roles IS NULL OR array_length(roles, 1) = 0 THEN
        DECLARE
            metadata_role text;
        BEGIN
            metadata_role := (auth.jwt() -> 'app_metadata' ->> 'role');
            IF metadata_role IS NOT NULL THEN
                roles := ARRAY[metadata_role];
            END IF;
        END;
    END IF;

    -- 3. Ensure uniqueness and normalization
    IF roles IS NOT NULL THEN
        RETURN ARRAY(SELECT DISTINCT lower(r) FROM unnest(roles) r WHERE r IS NOT NULL);
    END IF;

    RETURN ARRAY[]::text[];
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO service_role;

-- Ensure RLS on user_roles allows reading own roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage all roles" ON public.user_roles;
CREATE POLICY "Service role can manage all roles"
    ON public.user_roles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
