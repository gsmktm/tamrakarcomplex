
-- Create packages table
create table if not exists public.packages (
  id uuid not null default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  monthly_price numeric not null,
  yearly_price numeric not null,
  product_limit int not null,
  admin_limit int not null,
  branch_limit int not null,
  promo_slot_limit int not null default 0,
  features_json jsonb not null default '[]',
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint packages_pkey primary key (id)
);

-- Create store_subscriptions table
create table if not exists public.store_subscriptions (
  id uuid not null default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  status text not null check (status in ('active', 'pending', 'expired', 'suspended', 'cancelled')),
  is_enabled boolean default true,
  start_date timestamptz not null,
  end_date timestamptz not null,
  next_billing_date timestamptz,
  auto_renew boolean default true,
  scheduled_package_id uuid references public.packages(id),
  scheduled_change_date timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint store_subscriptions_pkey primary key (id),
  constraint store_subscriptions_store_id_key unique (store_id) -- One active subscription per store
);

-- Create subscription_payments table
create table if not exists public.subscription_payments (
  id uuid not null default gen_random_uuid(),
  subscription_id uuid not null references public.store_subscriptions(id) on delete cascade,
  invoice_no text not null,
  amount numeric not null,
  payment_method text not null,
  payment_status text not null check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  transaction_ref text,
  meta_json jsonb,
  created_at timestamptz default now(),
  constraint subscription_payments_pkey primary key (id)
);

-- Create store_usage table
create table if not exists public.store_usage (
  id uuid not null default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  total_products int default 0,
  total_admins int default 0,
  total_branches int default 0,
  total_promo_slots int default 0,
  updated_at timestamptz default now(),
  constraint store_usage_pkey primary key (id),
  constraint store_usage_store_id_key unique (store_id)
);

-- Create subscription_logs table
create table if not exists public.subscription_logs (
  id uuid not null default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  actor_id uuid references auth.users,
  action text not null,
  old_value_json jsonb,
  new_value_json jsonb,
  created_at timestamptz default now(),
  constraint subscription_logs_pkey primary key (id)
);

-- Enable RLS
alter table public.packages enable row level security;
alter table public.store_subscriptions enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.store_usage enable row level security;
alter table public.subscription_logs enable row level security;

-- Policies for packages
create policy "Public can view active packages"
  on public.packages for select
  using (is_active = true);

create policy "Admins can manage packages"
  on public.packages for all
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Policies for store_subscriptions
create policy "Store owners view own subscription"
  on public.store_subscriptions for select
  using (exists (select 1 from public.stores where id = store_subscriptions.store_id and owner_id = auth.uid()));

create policy "Admins view all subscriptions"
  on public.store_subscriptions for select
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "Admins manage subscriptions"
  on public.store_subscriptions for all
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Policies for subscription_payments
create policy "Store owners view own payments"
  on public.subscription_payments for select
  using (exists (select 1 from public.store_subscriptions s join public.stores st on s.store_id = st.id where s.id = subscription_payments.subscription_id and st.owner_id = auth.uid()));

create policy "Admins view all payments"
  on public.subscription_payments for select
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Policies for store_usage
create policy "Store owners view own usage"
  on public.store_usage for select
  using (exists (select 1 from public.stores where id = store_usage.store_id and owner_id = auth.uid()));

create policy "Admins view all usage"
  on public.store_usage for select
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Policies for subscription_logs
create policy "Store owners view own logs"
  on public.subscription_logs for select
  using (exists (select 1 from public.stores where id = subscription_logs.store_id and owner_id = auth.uid()));

create policy "Admins view all logs"
  on public.subscription_logs for select
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Insert Default Packages
insert into public.packages (name, slug, monthly_price, yearly_price, product_limit, admin_limit, branch_limit, promo_slot_limit, features_json, sort_order)
values
('Silver', 'silver', 1000, 10000, 150, 2, 1, 0, '["basic_profile", "order_management", "basic_reports"]', 1),
('Gold', 'gold', 2500, 25000, 1500, 5, 3, 2, '["advanced_analytics", "bulk_import", "low_stock_alerts", "campaign_participation"]', 2),
('Diamond', 'diamond', 5000, 50000, 10000, 20, 10, 5, '["api_access", "branded_page", "priority_support", "homepage_campaign"]', 3);
