
-- Add SEO fields to articles table
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS og_image TEXT;

-- Create article_products junction table
CREATE TABLE IF NOT EXISTS article_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article_id, product_id)
);

-- Enable RLS
ALTER TABLE article_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Allow admins full access to article_products" ON article_products;
CREATE POLICY "Allow admins full access to article_products"
    ON article_products
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email IN (
                SELECT email FROM app_settings WHERE key = 'super_admin_emails'
            ) OR EXISTS (
                SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('suadmin', 'staffadmin', 'admin')
            )
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email IN (
                SELECT email FROM app_settings WHERE key = 'super_admin_emails'
            ) OR EXISTS (
                SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('suadmin', 'staffadmin', 'admin')
            )
        )
    );
