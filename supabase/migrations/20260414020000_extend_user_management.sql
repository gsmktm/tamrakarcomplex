
-- Extend user management to allow deletion and more granular control for super admins.

CREATE OR REPLACE FUNCTION public.manage_user_role(
  target_user_id uuid,
  new_role text,
  action text DEFAULT 'update'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_email text;
  caller_is_suadmin boolean := false;
  caller_is_admin boolean := false;
  target_is_suadmin boolean := false;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email INTO caller_email
  FROM auth.users
  WHERE id = caller_id;

  caller_is_suadmin := public.has_role(caller_id, 'suadmin'::public.app_role)
    OR lower(coalesce(caller_email, '')) IN (
      'gsmktm@gmail.com',
      'gskmtm@gmail.com',
      'gsktm@gmail.com',
      'admin@tamrakarcomplex.com'
    );

  caller_is_admin := caller_is_suadmin OR public.has_role(caller_id, 'admin'::public.app_role);

  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF caller_id = target_user_id THEN
    RAISE EXCEPTION 'cannot_self_manage_role';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = target_user_id
      AND role = 'suadmin'
  ) INTO target_is_suadmin;

  -- Handle deletion
  IF action = 'delete' THEN
    IF NOT caller_is_suadmin THEN
      RAISE EXCEPTION 'not_authorized_super_admin';
    END IF;
    
    -- First delete from profiles and user_roles (handled by CASCADE or manual delete)
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    DELETE FROM public.profiles WHERE user_id = target_user_id;
    
    -- Delete from auth.users (requires service_role usually, but in RPC we can use SECURITY DEFINER)
    -- However, we can't directly delete from auth.users easily without a specific trigger or extension.
    -- For now, we delete public data and let the admin know.
    RETURN;
  END IF;

  -- Handle update
  IF (new_role::public.app_role = 'suadmin'::public.app_role OR target_is_suadmin) AND NOT caller_is_suadmin THEN
    RAISE EXCEPTION 'not_authorized_super_admin';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role::public.app_role);
END;
$$;
