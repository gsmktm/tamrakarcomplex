-- Trigger to sync package_slug with package_id
-- When a store's package_id is updated, automatically update package_slug to match

CREATE OR REPLACE FUNCTION public.sync_package_slug_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If package_id is changed, update package_slug from store_packages
  IF NEW.package_id IS DISTINCT FROM OLD.package_id THEN
    SELECT slug INTO NEW.package_slug
    FROM public.store_packages
    WHERE id = NEW.package_id
    LIMIT 1;
    
    -- If no package found, default to 'free'
    IF NEW.package_slug IS NULL THEN
      NEW.package_slug := 'free';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_sync_package_slug ON public.stores;

-- Create trigger on stores table
CREATE TRIGGER trg_sync_package_slug
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.sync_package_slug_on_update();

-- Initial sync: update all stores where package_id is set but package_slug doesn't match
UPDATE public.stores s
SET package_slug = sp.slug
FROM public.store_packages sp
WHERE s.package_id = sp.id
  AND (s.package_slug IS NULL OR s.package_slug != sp.slug);

-- Also ensure all stores have a default if both package_id and package_slug are NULL
UPDATE public.stores
SET package_slug = 'free'
WHERE package_slug IS NULL;

-- Add comment for documentation
COMMENT ON FUNCTION public.sync_package_slug_on_update()
IS 'Automatically syncs package_slug with package_id to prevent divergence. Uses package_id as source of truth.';
