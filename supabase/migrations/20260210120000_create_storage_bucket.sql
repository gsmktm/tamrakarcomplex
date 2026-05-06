
-- Create a new storage bucket for marketplace images
insert into storage.buckets (id, name, public)
values ('marketplace', 'marketplace', true)
on conflict (id) do nothing;

-- Allow public access to view images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'marketplace' );

-- Allow authenticated users to upload images
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check (
    bucket_id = 'marketplace' 
    and auth.role() = 'authenticated'
  );

-- Allow users to update their own images
create policy "Users can update their own images"
  on storage.objects for update
  using (
    bucket_id = 'marketplace' 
    and auth.uid() = owner
  );

-- Allow users to delete their own images
create policy "Users can delete their own images"
  on storage.objects for delete
  using (
    bucket_id = 'marketplace' 
    and auth.uid() = owner
  );
