-- Make store_packages the canonical package catalog while preserving legacy
-- store_subscriptions/packages rows for backward compatibility.

ALTER TABLE public.store_packages ADD COLUMN IF NOT EXISTS slug text;
UPDATE public.store_packages
SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR trim(slug) = '';
CREATE UNIQUE INDEX IF NOT EXISTS store_packages_slug_unique_idx ON public.store_packages (slug);

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.store_packages(id);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS package_slug text DEFAULT 'free';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;

UPDATE public.stores s
SET package_id = sp.id
FROM public.store_packages sp
WHERE s.package_id IS NULL
  AND lower(coalesce(s.package_slug, 'free')) = lower(sp.slug);

UPDATE public.stores s
SET package_slug = sp.slug
FROM public.store_packages sp
WHERE s.package_id = sp.id
  AND s.package_slug IS DISTINCT FROM sp.slug;

CREATE OR REPLACE FUNCTION public.sync_store_package_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.package_id IS NOT NULL THEN
    SELECT slug INTO NEW.package_slug FROM public.store_packages WHERE id = NEW.package_id;
  ELSIF NEW.package_slug IS NOT NULL THEN
    SELECT id INTO NEW.package_id FROM public.store_packages WHERE slug = lower(NEW.package_slug) LIMIT 1;
  END IF;
  NEW.package_slug := coalesce(NEW.package_slug, 'free');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_store_package_identity_trigger ON public.stores;
CREATE TRIGGER sync_store_package_identity_trigger
BEFORE INSERT OR UPDATE OF package_id, package_slug ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.sync_store_package_identity();

ALTER TABLE public.store_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active store packages" ON public.store_packages;
CREATE POLICY "Public read active store packages" ON public.store_packages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage store packages" ON public.store_packages;
CREATE POLICY "Admins manage store packages" ON public.store_packages
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text IN ('suadmin', 'staffadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text IN ('suadmin', 'staffadmin')
  )
);
