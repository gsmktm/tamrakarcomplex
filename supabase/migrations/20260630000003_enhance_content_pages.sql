-- Enhance Content Pages Table with SEO and Category Fields

-- Add new columns
alter table public.content_pages
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists og_image text,
  add column if not exists category text default 'other',
  add column if not exists order_index integer default 0;

-- Create an index for ordering
create index if not exists idx_content_pages_order
  on public.content_pages (order_index, title);
