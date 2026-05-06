create table if not exists public.sell_listings (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  price numeric not null,
  currency text default 'NPR',
  condition text check (condition in ('new', 'like_new', 'used', 'fair')),
  category text not null,
  brand text,
  model text,
  images text[],
  status text default 'active' check (status in ('draft', 'active', 'sold', 'archived')),
  location text,
  contact_info text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint sell_listings_pkey primary key (id)
);

alter table public.sell_listings enable row level security;

create policy "Public listings are viewable by everyone."
  on public.sell_listings for select
  using ( status = 'active' );

create policy "Users can insert their own listings."
  on public.sell_listings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own listings."
  on public.sell_listings for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own listings."
  on public.sell_listings for delete
  using ( auth.uid() = user_id );

-- Admin policies
create policy "Admins can update any listing."
  on public.sell_listings for update
  using ( public.has_role(auth.uid(), 'admin') );

create policy "Admins can delete any listing."
  on public.sell_listings for delete
  using ( public.has_role(auth.uid(), 'admin') );
