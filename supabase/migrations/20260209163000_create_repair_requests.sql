create table if not exists public.repair_requests (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users,
  name text not null,
  phone text not null,
  email text,
  device_brand text not null,
  device_model text not null,
  issue_type text not null check (issue_type in ('screen', 'battery', 'charging', 'camera', 'water_damage', 'software', 'other')),
  description text,
  preferred_date date,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint repair_requests_pkey primary key (id)
);

alter table public.repair_requests enable row level security;

create policy "Users can view their own repair requests."
  on public.repair_requests for select
  using ( auth.uid() = user_id );

create policy "Users can create repair requests."
  on public.repair_requests for insert
  with check ( auth.uid() = user_id );

create policy "Admins can manage all repair requests."
  on public.repair_requests for all
  using ( public.has_role(auth.uid(), 'admin') );
