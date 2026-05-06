-- Add price_value column to products table to sync from price string
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_value numeric DEFAULT 0;

-- Update existing records
UPDATE products SET price_value = COALESCE(CAST(REGEXP_REPLACE(price, '[^0-9.]', '', 'g') AS numeric), 0) WHERE price_value = 0 OR price_value IS NULL;