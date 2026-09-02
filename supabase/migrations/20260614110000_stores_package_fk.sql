-- Link stores to store_packages via FK so PostgREST can join them
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.store_packages(id);

-- Backfill package_id from package_slug
UPDATE public.stores s
SET package_id = sp.id
FROM public.store_packages sp
WHERE LOWER(s.package_slug) = LOWER(sp.slug)
  AND s.package_id IS NULL;

-- GRANT on store_packages already done; ensure stores anon select works
GRANT SELECT ON public.store_packages TO anon, authenticated;
