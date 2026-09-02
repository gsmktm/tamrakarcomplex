-- Stores uses is_active but frontend queries use status=eq.active
-- Add status column that mirrors is_active for compatibility
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS status text
  GENERATED ALWAYS AS (CASE WHEN is_active THEN 'active' ELSE 'inactive' END) STORED;

-- Also add public_status default for existing rows queried with public_status=eq.published
UPDATE public.stores SET public_status = 'published' WHERE public_status IS NULL OR public_status = '';
