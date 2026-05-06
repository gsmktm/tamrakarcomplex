
-- Enable RLS for valuation tables
alter table public.device_catalog enable row level security;
alter table public.valuation_rules enable row level security;
alter table public.price_catalog enable row level security;

-- Policies for device_catalog
drop policy if exists "Public can view device catalog" on public.device_catalog;
create policy "Public can view device catalog"
  on public.device_catalog for select
  using (true);

drop policy if exists "Admins can manage device catalog" on public.device_catalog;
create policy "Admins can manage device catalog"
  on public.device_catalog for all
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Policies for valuation_rules
drop policy if exists "Public can view valuation rules" on public.valuation_rules;
create policy "Public can view valuation rules"
  on public.valuation_rules for select
  using (true);

drop policy if exists "Admins can manage valuation rules" on public.valuation_rules;
create policy "Admins can manage valuation rules"
  on public.valuation_rules for all
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Policies for price_catalog
drop policy if exists "Public can view price catalog" on public.price_catalog;
create policy "Public can view price catalog"
  on public.price_catalog for select
  using (true);

drop policy if exists "Admins can manage price catalog" on public.price_catalog;
create policy "Admins can manage price catalog"
  on public.price_catalog for all
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Add unique constraint to valuation_rules if not exists
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'valuation_rules_device_id_key') then
    alter table public.valuation_rules add constraint valuation_rules_device_id_key unique (device_id);
  end if;
end $$;

-- Seed Data: Device Catalog
insert into public.device_catalog (brand, model, storage, ram, canonical_slug)
values
('Apple', 'iPhone 13', '128GB', '4GB', 'apple-iphone-13'),
('Apple', 'iPhone 14', '128GB', '6GB', 'apple-iphone-14'),
('Apple', 'iPhone 15', '128GB', '6GB', 'apple-iphone-15'),
('Samsung', 'Galaxy S23', '256GB', '8GB', 'samsung-galaxy-s23'),
('Samsung', 'Galaxy S24', '256GB', '8GB', 'samsung-galaxy-s24')
on conflict (canonical_slug) do nothing;

-- Seed Data: Valuation Rules
with devices as (
  select id, canonical_slug from public.device_catalog
),
rules_data (slug, base_price, condition_factors, defect_adjustments, age_depreciation, demand_factor) as (
  values
  ('apple-iphone-13', 60000, '{"new": 1.0, "like_new": 0.9, "used": 0.75, "fair": 0.6}', '{"screen_crack": -15000, "battery_weak": -5000}', '{"year1": 0.85, "year2": 0.7}', 1.1),
  ('apple-iphone-14', 75000, '{"new": 1.0, "like_new": 0.9, "used": 0.8, "fair": 0.65}', '{"screen_crack": -18000, "battery_weak": -6000}', '{"year1": 0.9}', 1.15),
  ('apple-iphone-15', 95000, '{"new": 1.0, "like_new": 0.95, "used": 0.85, "fair": 0.7}', '{"screen_crack": -25000, "battery_weak": -8000}', '{"year1": 0.95}', 1.2),
  ('samsung-galaxy-s23', 55000, '{"new": 1.0, "like_new": 0.85, "used": 0.7, "fair": 0.5}', '{"screen_crack": -12000, "battery_weak": -4000}', '{"year1": 0.8}', 0.9),
  ('samsung-galaxy-s24', 85000, '{"new": 1.0, "like_new": 0.9, "used": 0.8, "fair": 0.6}', '{"screen_crack": -20000, "battery_weak": -6000}', '{"year1": 0.9}', 1.0)
)
insert into public.valuation_rules (device_id, base_price, condition_factors, defect_adjustments, age_depreciation, demand_factor)
select 
  d.id,
  r.base_price,
  r.condition_factors::jsonb,
  r.defect_adjustments::jsonb,
  r.age_depreciation::jsonb,
  r.demand_factor
from devices d
join rules_data r on d.canonical_slug = r.slug
on conflict (device_id) do update set
  base_price = excluded.base_price,
  condition_factors = excluded.condition_factors,
  defect_adjustments = excluded.defect_adjustments,
  age_depreciation = excluded.age_depreciation,
  demand_factor = excluded.demand_factor,
  last_updated = now();
