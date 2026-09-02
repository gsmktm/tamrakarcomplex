
-- Add missing fields to content_pages table
ALTER TABLE content_pages 
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS og_image TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create index for order_index
CREATE INDEX IF NOT EXISTS idx_content_pages_order_index ON content_pages(order_index);
