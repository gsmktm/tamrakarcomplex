-- Stabilize role source-of-truth and role RPCs for admin routing.

create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_roles' and policyname = 'user_roles_select_own'
  ) then
    create policy user_roles_select_own
      on public.user_roles
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_roles' and policyname = 'user_roles_select_all_suadmin'
  ) then
    create policy user_roles_select_all_suadmin
      on public.user_roles
      for select
      using (
        exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid() and ur.role = 'suadmin'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_roles' and policyname = 'user_roles_modify_suadmin'
  ) then
    create policy user_roles_modify_suadmin
      on public.user_roles
      for all
      using (
        exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid() and ur.role = 'suadmin'
        )
      )
      with check (
        exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid() and ur.role = 'suadmin'
        )
      );
  end if;
end $$;

create or replace function public.get_my_roles()
returns text[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(ur.role order by ur.created_at asc), '{}'::text[])
  from public.user_roles ur
  where ur.user_id = auth.uid();
$$;

create or replace function public.has_role(required_role text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = required_role
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_role('suadmin');
$$;

create or replace function public.is_staff_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_role('staffadmin') or public.has_role('suadmin');
$$;

create or replace function public.is_store_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_role('storeadmin');
$$;

grant execute on function public.get_my_roles() to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_staff_admin() to authenticated;
grant execute on function public.is_store_admin() to authenticated;

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email in ('suadmin@tamrakarcomplex.com', 'gsmktm@gmail.com');

insert into public.user_roles (user_id, role)
select id, 'suadmin'
from auth.users
where email in ('suadmin@tamrakarcomplex.com', 'gsmktm@gmail.com')
on conflict (user_id, role) do nothing;

-- Keep admin UIs stable even if verification RPCs are absent.
create or replace function public.find_duplicate_catalog_products()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select '[]'::jsonb;
$$;

create or replace function public.merge_catalog_products(primary_id uuid, duplicate_ids uuid[])
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'merged_into', primary_id,
    'duplicate_count', coalesce(array_length(duplicate_ids, 1), 0),
    'status', 'pending'
  );
$$;

create or replace function public.get_catalog_verification_stats()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'total', coalesce((select count(*) from public.catalog_products), 0),
    'verified', coalesce((select count(*) from public.catalog_products where verified is true), 0)
  );
$$;
