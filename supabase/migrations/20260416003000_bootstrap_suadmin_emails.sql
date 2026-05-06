-- Migration: Bootstrap super admin roles for known admin emails
-- This ensures the known super admin accounts have the 'suadmin' role
-- in the user_roles table so they can log in after removing hardcoded email bypass.
--
-- These INSERTs are safe to re-run (ON CONFLICT DO NOTHING).
-- Only runs if the email exists in auth.users.

DO $$
DECLARE
  v_user_id uuid;
  v_emails text[] := ARRAY[
    'gsmktm@gmail.com',
    'gskmtm@gmail.com',
    'gsktm@gmail.com',
    'superadmin@tamrakarcomplex.com',
    'admin@tamrakarcomplex.com'
  ];
  v_email text;
BEGIN
  FOREACH v_email IN ARRAY v_emails LOOP
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = lower(v_email)
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'suadmin'::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
      
      RAISE NOTICE 'Granted suadmin to: %', v_email;
    ELSE
      RAISE NOTICE 'User not found (skipped): %', v_email;
    END IF;
  END LOOP;
END;
$$;
