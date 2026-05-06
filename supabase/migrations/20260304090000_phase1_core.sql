create table if not exists public.device_catalog (
  id uuid not null default gen_random_uuid(),
  brand text not null,
  model text not null,
  variant text,
  storage text,
  ram text,
  release_year int,
  spec_keys jsonb,
  canonical_slug text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint device_catalog_pkey primary key (id)
);

create table if not exists public.valuation_rules (
  id uuid not null default gen_random_uuid(),
  device_id uuid references public.device_catalog(id) on delete cascade,
  base_price numeric not null,
  condition_factors jsonb not null,
  defect_adjustments jsonb not null,
  age_depreciation jsonb,
  demand_factor numeric default 1.0,
  last_updated timestamptz default now(),
  constraint valuation_rules_pkey primary key (id)
);

create table if not exists public.price_catalog (
  id uuid not null default gen_random_uuid(),
  device_id uuid references public.device_catalog(id) on delete cascade,
  source text not null,
  mrp numeric,
  srp numeric,
  updated_at timestamptz default now(),
  constraint price_catalog_pkey primary key (id)
);

create table if not exists public.accessories (
  id uuid not null default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  sku text,
  title text not null,
  category text not null,
  brand text,
  price_mrp numeric,
  price_sale numeric,
  stock int default 0,
  images text[],
  status text default 'active' check (status in ('active','draft','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint accessories_pkey primary key (id)
);

create table if not exists public.store_products (
  id uuid not null default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  sku text,
  title text not null,
  brand text,
  model text,
  variant text,
  condition text check (condition in ('new','used','refurb')),
  price_mrp numeric,
  price_sale numeric,
  stock int default 0,
  images text[],
  attributes jsonb,
  status text default 'active' check (status in ('active','draft','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint store_products_pkey primary key (id)
);

create table if not exists public.orders (
  id uuid not null default gen_random_uuid(),
  buyer_id uuid references auth.users not null,
  items jsonb not null,
  totals jsonb not null,
  status text not null default 'created' check (status in ('created','paid','fulfilled','cancelled')),
  payment jsonb,
  fulfillment jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint orders_pkey primary key (id)
);

create table if not exists public.leads_quotes (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text not null check (type in ('cash','exchange','buyback')),
  device jsonb not null,
  condition text,
  defects jsonb,
  quoted_value numeric,
  partner_store_id uuid references public.stores(id),
  status text default 'new' check (status in ('new','scheduled','completed','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint leads_quotes_pkey primary key (id)
);

create table if not exists public.store_admins (
  store_id uuid references public.stores(id) on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null check (role in ('owner','manager','staff')),
  created_at timestamptz default now(),
  constraint store_admins_pkey primary key (store_id, user_id)
);

create table if not exists public.store_sync_sources (
  id uuid not null default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  type text not null check (type in ('csv','rest','manual')),
  config jsonb not null,
  schedule_cron text,
  last_run_at timestamptz,
  constraint store_sync_sources_pkey primary key (id)
);

alter table public.accessories enable row level security;
alter table public.store_products enable row level security;
alter table public.orders enable row level security;
alter table public.leads_quotes enable row level security;
alter table public.store_admins enable row level security;
alter table public.store_sync_sources enable row level security;

create policy "Public can view active accessories"
  on public.accessories for select
  using (status = 'active');

create policy "Store admins manage accessories"
  on public.accessories for all
  using (exists (select 1 from public.store_admins s where s.store_id = accessories.store_id and s.user_id = auth.uid()));

create policy "Public can view active store products"
  on public.store_products for select
  using (status = 'active');

create policy "Store admins manage products"
  on public.store_products for all
  using (exists (select 1 from public.store_admins s where s.store_id = store_products.store_id and s.user_id = auth.uid()));

create policy "Users view own orders"
  on public.orders for select
  using (buyer_id = auth.uid());

create policy "Users create orders"
  on public.orders for insert
  with check (buyer_id = auth.uid());

create policy "Users view own leads"
  on public.leads_quotes for select
  using (user_id = auth.uid());

create policy "Users create leads"
  on public.leads_quotes for insert
  with check (user_id = auth.uid());

create policy "Store admins view leads assigned"
  on public.leads_quotes for select
  using (partner_store_id in (select store_id from public.store_admins where user_id = auth.uid()));

create policy "Store owners manage store admins"
  on public.store_admins for all
  using (exists (select 1 from public.stores st where st.id = store_admins.store_id and st.owner_id = auth.uid()));

create policy "Store admins manage sync sources"
  on public.store_sync_sources for all
  using (exists (select 1 from public.store_admins s where s.store_id = store_sync_sources.store_id and s.user_id = auth.uid()));
