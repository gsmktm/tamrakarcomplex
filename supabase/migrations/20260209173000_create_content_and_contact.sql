-- Content Pages Table
create table if not exists public.content_pages (
  id uuid not null default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content text,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint content_pages_pkey primary key (id)
);

-- Contact Messages Table
create table if not exists public.contact_messages (
  id uuid not null default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now(),
  constraint contact_messages_pkey primary key (id)
);

-- Chatbot Config Table
create table if not exists public.chatbot_config (
  id uuid not null default gen_random_uuid(),
  welcome_message text default 'Hello! How can I help you today?',
  is_active boolean default true,
  updated_at timestamptz default now(),
  constraint chatbot_config_pkey primary key (id)
);

-- RLS Policies

-- Content Pages: Public read, Admin write
alter table public.content_pages enable row level security;
create policy "Public can view published content pages."
  on public.content_pages for select
  using ( is_published = true );
create policy "Admins can manage content pages."
  on public.content_pages for all
  using ( public.has_role(auth.uid(), 'admin') );

-- Contact Messages: Public insert, Admin read/update
alter table public.contact_messages enable row level security;
create policy "Public can send messages."
  on public.contact_messages for insert
  with check ( true );
create policy "Admins can view messages."
  on public.contact_messages for select
  using ( public.has_role(auth.uid(), 'admin') );
create policy "Admins can update messages."
  on public.contact_messages for update
  using ( public.has_role(auth.uid(), 'admin') );
  
-- Chatbot Config: Public read, Admin write
alter table public.chatbot_config enable row level security;
create policy "Public can view chatbot config."
  on public.chatbot_config for select
  using ( true );
create policy "Admins can manage chatbot config."
  on public.chatbot_config for all
  using ( public.has_role(auth.uid(), 'admin') );

-- Seed Content Pages
INSERT INTO public.content_pages (slug, title, content)
VALUES 
('privacy-policy', 'Privacy Policy', '<h1>Privacy Policy</h1><p>Welcome to Tamrakar Complex. Your privacy is important to us...</p>'),
('terms-of-service', 'Terms of Service', '<h1>Terms of Service</h1><p>By using our services, you agree to the following terms...</p>'),
('about-us', 'About Us', '<h1>About Us</h1><p>Tamrakar Complex is the leading hub for mobile phones and electronics in Nepal...</p>')
ON CONFLICT (slug) DO NOTHING;

-- Seed Chatbot Config
INSERT INTO public.chatbot_config (welcome_message, is_active)
VALUES ('Hello! How can I help you today?', true);
