-- Add missing storage buckets and policies

-- 1. avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 4. marketplace (ensure it exists and is public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace', 'marketplace', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Generic policies for all buckets

-- Public read access
DO $$
DECLARE
    bucket_name text;
BEGIN
    FOR bucket_name IN SELECT unnest(ARRAY['avatars', 'logos', 'uploads', 'marketplace'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public Access" ON storage.objects');
        EXECUTE format('CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = %L)', bucket_name);

        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects');
        EXECUTE format('CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = %L AND auth.role() = %L)', bucket_name, 'authenticated');

        EXECUTE format('DROP POLICY IF EXISTS "Users can update own files" ON storage.objects');
        EXECUTE format('CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE USING (bucket_id = %L AND auth.uid() = owner)', bucket_name);

        EXECUTE format('DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects');
        EXECUTE format('CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (bucket_id = %L AND auth.uid() = owner)', bucket_name);
    END LOOP;
END $$;

-- Specific path rules for security
-- avatars: users/{{auth.uid}}/avatar.png
-- logos: stores/{{store_id}}/logo.png
-- marketplace: listings/{{listing_id}}/image.png
