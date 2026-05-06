
-- Assign admin role to gskmtm@gmail.com if exists
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'gskmtm@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Check if user already has a role
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'admin');
    ELSE
      UPDATE public.user_roles SET role = 'admin' WHERE user_id = v_user_id;
    END IF;
  END IF;
END $$;
