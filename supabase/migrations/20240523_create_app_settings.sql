create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert default settings
insert into public.app_settings (key, value)
values 
  ('site_info', '{"name": "Tamrakar Complex", "description": "The best place for mobile phones and gadgets.", "maintenance_mode": false}'::jsonb),
  ('contact_info', '{"email": "info@tamrakarcomplex.com", "phone": "+977-015351731", "address": "New Road TamrakarComplex , Kathmandu", "whatsapp": "+9779851091542"}'::jsonb),
  ('features', '{"enable_blog": true, "enable_reviews": true, "enable_shop": true, "enable_whatsapp": true}'::jsonb)
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

create policy "Allow public read access" on public.app_settings for select using (true);
create policy "Allow admin write access" on public.app_settings for all using (
  exists (
    select 1 from public.user_roles 
    where user_id = auth.uid() and role = 'admin'
  )
);
