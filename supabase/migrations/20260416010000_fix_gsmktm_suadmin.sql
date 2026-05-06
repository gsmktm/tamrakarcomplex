-- Fix: Grant suadmin role to gsmktm@gmail.com
-- Run this in Supabase SQL Editor

-- First, find the user_id for gsmktm@gmail.com
SELECT id, email FROM auth.users WHERE email = 'gsmktm@gmail.com';

-- Then insert/update the user_roles table
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'suadmin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;