
-- Final hardening for Super Admin roles
-- Ensures gsmktm@gmail.com has the suadmin role

DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- 1. Find the user ID by email
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'gsmktm@gmail.com';

    IF v_user_id IS NOT NULL THEN
        -- 2. Ensure user_roles record exists
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'suadmin')
        ON CONFLICT (user_id, role) DO NOTHING;

        -- 3. Remove other conflicting roles if any
        DELETE FROM public.user_roles 
        WHERE user_id = v_user_id 
        AND role != 'suadmin';

        -- 4. Update profile role column
        UPDATE public.profiles 
        SET role = 'suadmin' 
        WHERE id = v_user_id;

        -- 5. Set app_metadata for Supabase Auth
        UPDATE auth.users 
        SET app_metadata = jsonb_set(
            COALESCE(app_metadata, '{}'::jsonb),
            '{role}',
            '"suadmin"'
        )
        WHERE id = v_user_id;
    END IF;
END $$;
