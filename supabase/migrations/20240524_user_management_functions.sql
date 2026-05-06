-- Function to manage user roles (Admin only)
create or replace function public.manage_user_role(
  target_user_id uuid,
  new_role text -- accepting text and casting to app_role to be safe
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  -- Check if the current user is an admin
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'admin'
  ) into is_admin;

  if not is_admin then
    raise exception 'Access denied: Only admins can manage roles';
  end if;

  -- Delete existing roles for the user
  delete from public.user_roles where user_id = target_user_id;

  -- Insert new role
  insert into public.user_roles (user_id, role)
  values (target_user_id, new_role::public.app_role);
end;
$$;
