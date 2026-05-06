
-- Force update password for gskmtm@gmail.com
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'gskmtm@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Update the password (this sets the encrypted password directly)
    -- Note: We can't easily set a specific password hash via SQL in Supabase without knowing the hashing algorithm specifics or using an extension.
    -- Instead, we will try to confirm the user email so they can login.
    
    UPDATE auth.users
    SET email_confirmed_at = now(),
        confirmation_token = NULL,
        recovery_token = NULL
    WHERE id = v_user_id;
    
  END IF;
END $$;
