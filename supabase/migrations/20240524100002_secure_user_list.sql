-- SECURE ROOT FUNCTION TO LIST ALL USERS
-- This function bypasses RLS to read from auth.users, but enforces a strict check:
-- The caller MUST be a Super Admin (role='admin') in the public.user_roles table.

create or replace function public.get_admin_users_list_secure()
returns table (
  id uuid,
  email varchar,
  full_name text,
  avatar_url text,
  role text -- return as text for simplicity
)
language plpgsql
security definer -- Run as database owner to access auth.users
set search_path = public
as $$
declare
  caller_id uuid;
  is_super_admin boolean;
begin
  caller_id := auth.uid();

  -- 1. Check if caller is authenticated
  if caller_id is null then
    raise exception 'Access Denied: Not authenticated';
  end if;

  -- 2. Check if caller is a Super Admin
  select exists (
    select 1 from public.user_roles
    where user_id = caller_id
    and role = 'admin'
  ) into is_super_admin;

  if not is_super_admin then
    raise exception 'Access Denied: You must be a Super Admin to view users.';
  end if;

  -- 3. Return the user list
  return query
  select 
    au.id,
    au.email::varchar,
    coalesce(p.display_name, 'Unknown') as full_name,
    p.avatar_url,
    coalesce(ur.role::text, 'user') as role
  from auth.users au
  left join public.profiles p on p.id = au.id
  left join public.user_roles ur on ur.user_id = au.id
  order by au.created_at desc;
end;
$$;
