
-- Fix potential search_path and schema usage issues

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Fix potential trigger issues by dropping unknown triggers on auth.users if possible
-- We can't easily list them dynamically in migration without knowing names.
-- But standard Supabase triggers are usually fine.
-- If you added any custom trigger, it might be the cause.

-- Let's try to ensure the user exists correctly again, maybe recreate it one more time cleanly.
-- But first, let's fix permissions.

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Grant auth schema access
GRANT SELECT ON auth.users TO service_role;
GRANT SELECT ON auth.identities TO service_role;

-- Try to delete the user and create it again with a very simple insert, 
-- avoiding complex logic that might trigger errors.
DELETE FROM auth.users WHERE email = 'gsktm@gmail.com';

-- Re-insert user
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
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
    'gsktm@gmail.com',
    crypt('CHANGE_ME_DO_NOT_USE', gen_salt('bf')),
    now(),
    NULL,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
);

-- Re-assign admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'gsktm@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create identity
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    id,
    json_build_object('sub', id, 'email', 'gsktm@gmail.com'),
    'email',
    id::text,
    now(),
    now(),
    now()
FROM auth.users WHERE email = 'gsktm@gmail.com';
