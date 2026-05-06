-- Add a function to safely delete users from auth.users
-- This requires SECURITY DEFINER to bypass the restriction that users can't delete other users
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Check if the caller is a super admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only Super Admins can delete users.';
  END IF;

  -- 2. Prevent self-deletion
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Cannot delete yourself. Use the account settings or contact another super admin.';
  END IF;

  -- 3. Delete from user_roles (cleanup)
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- 4. Delete from profiles (cleanup)
  DELETE FROM public.profiles WHERE user_id = target_user_id;

  -- 5. Delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

COMMENT ON FUNCTION public.delete_user(uuid) IS 'Permanently deletes a user from auth.users and all related profile/role data. Restricted to Super Admins.';
