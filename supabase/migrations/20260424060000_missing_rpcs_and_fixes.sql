
-- 0. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Helper function for development: auto-confirm emails for specific domains or test accounts
CREATE OR REPLACE FUNCTION public.dev_ensure_confirmed_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Locate the user first
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NOT NULL THEN
        -- Only allow for the official domain or specific test accounts in dev/admin context
        IF (p_email LIKE '%@tamrakarcomplex.com' OR p_email = 'gsmktm@gmail.com') THEN
            UPDATE auth.users 
            SET email_confirmed_at = now() 
            WHERE id = v_user_id 
            AND email_confirmed_at IS NULL;
            
            RETURN true;
        END IF;
    END IF;

    RETURN false;
END;
$$;

-- 2. Ensure log_visitor RPC exists (referenced in useVisitorTracking.ts)
CREATE OR REPLACE FUNCTION public.log_visitor(
    p_ip_address text,
    p_user_agent text,
    p_url text,
    p_referrer text,
    p_country text,
    p_city text,
    p_region text,
    p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.audit_logs (
        actor_user_id,
        actor_top_role,
        action_key,
        module_key,
        target_table,
        ip_address,
        user_agent,
        new_data
    ) VALUES (
        auth.uid(),
        'visitor',
        'visit',
        'analytics',
        'visitor_logs',
        p_ip_address,
        p_user_agent,
        jsonb_build_object(
            'url', p_url,
            'referrer', p_referrer,
            'country', p_country,
            'city', p_city,
            'region', p_region,
            'session_id', p_session_id
        )
    );
END;
$$;

-- 3. Ensure dev users exist in auth.users (Dev Only helper)
-- Note: This requires pgcrypto for crypt() function
CREATE OR REPLACE FUNCTION public.dev_create_user(p_email text, p_password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Check if user exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        -- Create user
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            p_email,
            crypt(p_password, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        ) RETURNING id INTO v_user_id;
    END IF;
    
    RETURN v_user_id;
END;
$$;

-- 4. Auto-provision dev accounts
DO $$
BEGIN
    PERFORM public.dev_create_user('gsmktm@gmail.com', 'password');
    PERFORM public.dev_create_user('suadmin@tamrakarcomplex.com', 'password');
    PERFORM public.dev_create_user('admin@tamrakarcomplex.com', 'password');
    PERFORM public.dev_create_user('store@tamrakarcomplex.com', 'password');
    PERFORM public.dev_create_user('user@tamrakarcomplex.com', 'password');
END $$;

-- 5. Ensure roles are assigned
DO $$
DECLARE
    v_su_id uuid;
    v_staff_id uuid;
    v_store_id uuid;
    v_user_id uuid;
BEGIN
    SELECT id INTO v_su_id FROM auth.users WHERE email IN ('gsmktm@gmail.com', 'suadmin@tamrakarcomplex.com') LIMIT 1;
    SELECT id INTO v_staff_id FROM auth.users WHERE email = 'admin@tamrakarcomplex.com';
    SELECT id INTO v_store_id FROM auth.users WHERE email = 'store@tamrakarcomplex.com';
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'user@tamrakarcomplex.com';
    
    IF v_su_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (v_su_id, 'suadmin') ON CONFLICT (user_id, role) DO NOTHING;
        UPDATE public.user_roles SET role = 'suadmin' WHERE user_id = v_su_id;
    END IF;
    
    IF v_staff_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (v_staff_id, 'staffadmin') ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    IF v_store_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (v_store_id, 'storeadmin') ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
