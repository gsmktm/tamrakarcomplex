-- Function to get all users with their emails and roles (Admin only)
create or replace function public.get_admin_users_list()
returns table (
  id uuid,
  email varchar,
  full_name text,
  avatar_url text,
  role public.app_role
)
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
    raise exception 'Access denied: Only admins can view user list';
  end if;

  return query
  select 
    au.id,
    au.email::varchar,
    p.display_name as full_name,
    p.avatar_url,
    coalesce(ur.role, 'user'::public.app_role) as role
  from auth.users au
  left join public.profiles p on p.id = au.id
  left join public.user_roles ur on ur.user_id = au.id
  order by au.created_at desc;
end;
$$;
