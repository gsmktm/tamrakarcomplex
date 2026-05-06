create table if not exists public.stores (
  id uuid not null default gen_random_uuid(),
  name text not null,
  location text not null,
  description text,
  phone text,
  email text,
  website text,
  map_url text,
  logo_url text,
  services text[],
  owner_id uuid references auth.users,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint stores_pkey primary key (id)
);

alter table public.stores enable row level security;

create policy "Stores are viewable by everyone."
  on public.stores for select
  using ( true );

create policy "Admins can manage stores."
  on public.stores for all
  using ( public.has_role(auth.uid(), 'admin') );
