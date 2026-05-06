-- Console settings + store credits (admin console modules)

-- 1) Private console settings (NOT publicly readable like app_settings)
create table if not exists public.console_settings (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'store', 'user')),
  key text not null,
  store_id uuid references public.stores(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- enforce scope column requirements
  constraint console_settings_scope_global check (
    (scope = 'global' and store_id is null and user_id is null) or
    (scope = 'store' and store_id is not null and user_id is null) or
    (scope = 'user' and user_id is not null and store_id is null)
  )
);

-- ensure we have deterministic upserts per scope
create unique index if not exists console_settings_global_key_unique
  on public.console_settings (key)
  where scope = 'global';

create unique index if not exists console_settings_store_key_unique
  on public.console_settings (key, store_id)
  where scope = 'store';

create unique index if not exists console_settings_user_key_unique
  on public.console_settings (key, user_id)
  where scope = 'user';

alter table public.console_settings enable row level security;

-- Select policies
drop policy if exists "Console Settings: Admins read all" on public.console_settings;
create policy "Console Settings: Admins read all"
  on public.console_settings for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Console Settings: Store owners read store" on public.console_settings;
create policy "Console Settings: Store owners read store"
  on public.console_settings for select
  to authenticated
  using (
    scope = 'store'
    and (
      store_id in (select id from public.stores where owner_id = auth.uid())
      or store_id in (select store_id from public.store_admins where user_id = auth.uid())
    )
  );

drop policy if exists "Console Settings: Users read own" on public.console_settings;
create policy "Console Settings: Users read own"
  on public.console_settings for select
  to authenticated
  using (scope = 'user' and user_id = auth.uid());

-- Write policies
drop policy if exists "Console Settings: Admins write all" on public.console_settings;
create policy "Console Settings: Admins write all"
  on public.console_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Console Settings: Store owners write store" on public.console_settings;
create policy "Console Settings: Store owners write store"
  on public.console_settings for all
  to authenticated
  using (scope = 'store' and store_id in (select id from public.stores where owner_id = auth.uid()))
  with check (scope = 'store' and store_id in (select id from public.stores where owner_id = auth.uid()));

drop policy if exists "Console Settings: Users write own" on public.console_settings;
create policy "Console Settings: Users write own"
  on public.console_settings for all
  to authenticated
  using (scope = 'user' and user_id = auth.uid())
  with check (scope = 'user' and user_id = auth.uid());

-- updated_at trigger
do $$
begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at_column') then
    drop trigger if exists update_console_settings_updated_at on public.console_settings;
    create trigger update_console_settings_updated_at
      before update on public.console_settings
      for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- 2) Store credits ledger
create table if not exists public.store_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  amount numeric not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists store_credit_transactions_user_idx on public.store_credit_transactions (user_id);
create index if not exists store_credit_transactions_store_idx on public.store_credit_transactions (store_id);
create index if not exists store_credit_transactions_created_at_idx on public.store_credit_transactions (created_at desc);

alter table public.store_credit_transactions enable row level security;

-- Users can see their own credit history; store owners can see their store's history; admins can see all.
drop policy if exists "Store credits: Users read own" on public.store_credit_transactions;
create policy "Store credits: Users read own"
  on public.store_credit_transactions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Store credits: Store owners read store" on public.store_credit_transactions;
create policy "Store credits: Store owners read store"
  on public.store_credit_transactions for select
  to authenticated
  using (store_id is not null and store_id in (select id from public.stores where owner_id = auth.uid()));

drop policy if exists "Store credits: Admins manage all" on public.store_credit_transactions;
create policy "Store credits: Admins manage all"
  on public.store_credit_transactions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Convenience view for balances (uses underlying RLS)
create or replace view public.store_credit_balances as
select
  user_id,
  store_id,
  coalesce(sum(amount), 0) as balance
from public.store_credit_transactions
group by user_id, store_id;

