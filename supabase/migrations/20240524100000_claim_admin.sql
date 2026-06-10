-- Function to claim super admin role (for demo/bootstrap purposes)
create or replace function public.claim_super_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
begin
  -- Get current user's email
  select email into current_email from auth.users where id = auth.uid();

  -- Allow only specific email or if system has no admins (bootstrap)
  -- For this demo, we strictly allow 'demo@admin.com'
  if current_email = 'demo@admin.com' then
    -- Remove existing role
    delete from public.user_roles where user_id = auth.uid();
    -- Insert admin role
    insert into public.user_roles (user_id, role) values (auth.uid(), 'admin');
  else
    raise exception 'Access denied: Only demo@admin.com can claim super admin status.';
  end if;
end;
$$;
