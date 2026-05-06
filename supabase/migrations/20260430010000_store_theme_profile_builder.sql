-- Store Theme and Profile Builder
-- Adds mini-site profile fields, package locks, and store-scoped edit security.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS opening_hours jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS services_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS featured_product_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS theme_slug text DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS theme_color text,
  ADD COLUMN IF NOT EXISTS banner_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_design_json jsonb DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS stores_slug_unique
  ON public.stores(slug)
  WHERE slug IS NOT NULL AND slug <> '';

CREATE INDEX IF NOT EXISTS idx_stores_theme_slug ON public.stores(theme_slug);

CREATE OR REPLACE FUNCTION public.store_theme_rank(p_package_slug text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_package_slug
    WHEN 'diamond' THEN 3
    WHEN 'gold' THEN 2
    WHEN 'silver' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.store_theme_min_rank(p_theme_slug text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_theme_slug
    WHEN 'default' THEN 0
    WHEN 'basic' THEN 1
    WHEN 'modern' THEN 2
    WHEN 'editorial' THEN 2
    WHEN 'premium' THEN 2
    WHEN 'luxury' THEN 3
    WHEN 'atelier' THEN 3
    WHEN 'custom' THEN 3
    ELSE 99
  END;
$$;

CREATE OR REPLACE FUNCTION public.store_can_edit_profile(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_super_admin()
    OR (public.is_staff_admin() AND public.has_staff_permission('stores', 'edit'))
    OR EXISTS (
      SELECT 1
      FROM public.stores s
      WHERE s.id = p_store_id
        AND s.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.store_admins sa
      WHERE sa.store_id = p_store_id
        AND sa.user_id = auth.uid()
        AND COALESCE(sa.status, 'active') = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.enforce_store_theme_package()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_package text := COALESCE(NEW.package_slug, 'free');
  v_theme text := COALESCE(NEW.theme_slug, 'default');
BEGIN
  IF public.store_theme_rank(v_package) < public.store_theme_min_rank(v_theme) THEN
    RAISE EXCEPTION 'Theme % is locked for % stores', v_theme, v_package
      USING ERRCODE = '42501';
  END IF;

  IF v_package = 'free' THEN
    NEW.theme_slug := 'default';
    NEW.theme_color := NULL;
    NEW.banner_json := '{}'::jsonb;
    NEW.custom_design_json := '{}'::jsonb;
    NEW.featured_product_ids := '[]'::jsonb;
  ELSIF v_package = 'silver' THEN
    IF NEW.theme_slug IS DISTINCT FROM 'basic' AND NEW.theme_slug IS DISTINCT FROM 'default' THEN
      RAISE EXCEPTION 'Silver stores can only use the basic theme'
        USING ERRCODE = '42501';
    END IF;
    NEW.theme_color := NULL;
    NEW.banner_json := '{}'::jsonb;
    NEW.custom_design_json := '{}'::jsonb;
  ELSIF v_package = 'gold' THEN
    IF NEW.theme_slug IN ('luxury', 'atelier', 'custom') THEN
      RAISE EXCEPTION 'Premium themes are locked to Diamond stores'
        USING ERRCODE = '42501';
    END IF;
    NEW.theme_color := NULL;
    NEW.custom_design_json := '{}'::jsonb;
  END IF;

  NEW.opening_hours := COALESCE(NEW.opening_hours, '{}'::jsonb);
  NEW.services_json := COALESCE(NEW.services_json, '[]'::jsonb);
  NEW.social_links_json := COALESCE(NEW.social_links_json, '{}'::jsonb);
  NEW.featured_product_ids := COALESCE(NEW.featured_product_ids, '[]'::jsonb);
  NEW.banner_json := COALESCE(NEW.banner_json, '{}'::jsonb);
  NEW.custom_design_json := COALESCE(NEW.custom_design_json, '{}'::jsonb);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_store_theme_package ON public.stores;
CREATE TRIGGER enforce_store_theme_package
BEFORE INSERT OR UPDATE OF package_slug, theme_slug, theme_color, banner_json, custom_design_json, featured_product_ids, opening_hours, services_json, social_links_json
ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.enforce_store_theme_package();

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store profile builders can view editable stores" ON public.stores;
CREATE POLICY "Store profile builders can view editable stores"
ON public.stores FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (public.is_staff_admin() AND public.has_staff_permission('stores', 'view'))
  OR owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.store_admins sa
    WHERE sa.store_id = stores.id
      AND sa.user_id = auth.uid()
      AND COALESCE(sa.status, 'active') = 'active'
  )
);

DROP POLICY IF EXISTS "Store profile builders can update stores" ON public.stores;
CREATE POLICY "Store profile builders can update stores"
ON public.stores FOR UPDATE
TO authenticated
USING (public.store_can_edit_profile(id))
WITH CHECK (public.store_can_edit_profile(id));

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated users can upload store profile assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload store profile assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = 'stores'
);

DROP POLICY IF EXISTS "Public can view store profile assets" ON storage.objects;
CREATE POLICY "Public can view store profile assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

GRANT EXECUTE ON FUNCTION public.store_can_edit_profile(uuid) TO authenticated;
