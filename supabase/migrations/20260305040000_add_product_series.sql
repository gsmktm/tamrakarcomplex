-- Add series column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS series TEXT;

-- Create index for faster filtering by series
CREATE INDEX IF NOT EXISTS idx_products_series ON public.products(series);
