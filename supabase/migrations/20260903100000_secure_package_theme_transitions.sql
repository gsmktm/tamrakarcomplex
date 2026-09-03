-- Keep package identity, subscription entitlements, and store themes in sync.
--
-- The store profile UPDATE policy intentionally allows owners/store admins to
-- edit presentation fields.  Without a column-level guard that same policy can
-- also be used to self-assign a paid package.  Enforce package transitions in
-- a trigger so every REST/client path has the same authorization boundary.

CREATE OR REPLACE FUNCTION public.authorize_store_package_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_package text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.package_id IS DISTINCT FROM OLD.package_id
       OR NEW.package_slug IS DISTINCT FROM OLD.package_slug)
     AND auth.uid() IS NOT NULL
     AND NOT (public.is_super_admin() OR public.is_staff_admin()) THEN
    RAISE EXCEPTION 'Only platform administrators may change a store package'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.package_id IS NOT NULL THEN
    SELECT sp.slug INTO v_requested_package
    FROM public.store_packages sp
    WHERE sp.id = NEW.package_id;
  END IF;
  v_requested_package := COALESCE(
    v_requested_package,
    NULLIF(lower(trim(NEW.package_slug)), ''),
    'free'
  );

  IF TG_OP = 'INSERT'
     AND v_requested_package <> 'free'
     AND auth.uid() IS NOT NULL
     AND NOT (public.is_super_admin() OR public.is_staff_admin()) THEN
    RAISE EXCEPTION 'Paid store packages must be assigned by an administrator'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS authorize_store_package_transition ON public.stores;
CREATE TRIGGER authorize_store_package_transition
BEFORE INSERT OR UPDATE OF package_id, package_slug ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.authorize_store_package_transition();

-- Resolve the canonical package from package_id inside the theme trigger.
-- This avoids relying on trigger name ordering when clients only update
-- package_id.  Package downgrades are normalized instead of being rejected,
-- while a direct attempt to select a locked theme still fails explicitly.
CREATE OR REPLACE FUNCTION public.enforce_store_theme_package()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_package text;
  v_theme text := COALESCE(NEW.theme_slug, 'default');
  v_package_changed boolean := TG_OP = 'INSERT';
BEGIN
  IF NEW.package_id IS NOT NULL THEN
    SELECT sp.slug INTO v_package
    FROM public.store_packages sp
    WHERE sp.id = NEW.package_id;
  END IF;
  v_package := COALESCE(v_package, NULLIF(lower(trim(NEW.package_slug)), ''), 'free');
  NEW.package_slug := v_package;

  IF TG_OP = 'UPDATE' THEN
    v_package_changed := NEW.package_id IS DISTINCT FROM OLD.package_id
      OR v_package IS DISTINCT FROM COALESCE(OLD.package_slug, 'free');
  END IF;

  IF public.store_theme_rank(v_package) < public.store_theme_min_rank(v_theme) THEN
    IF NOT v_package_changed THEN
      RAISE EXCEPTION 'Theme % is locked for % stores', v_theme, v_package
        USING ERRCODE = '42501';
    END IF;
    NEW.theme_slug := CASE v_package
      WHEN 'silver' THEN 'basic'
      WHEN 'gold' THEN 'modern'
      ELSE 'default'
    END;
  END IF;

  IF v_package = 'free' THEN
    NEW.theme_slug := 'default';
    NEW.theme_color := NULL;
    NEW.banner_json := '{}'::jsonb;
    NEW.custom_design_json := '{}'::jsonb;
    NEW.featured_product_ids := '[]'::jsonb;
  ELSIF v_package = 'silver' THEN
    IF NEW.theme_slug NOT IN ('default', 'basic') THEN
      IF v_package_changed THEN
        NEW.theme_slug := 'basic';
      ELSE
        RAISE EXCEPTION 'Silver stores can only use the basic theme'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    NEW.theme_color := NULL;
    NEW.banner_json := '{}'::jsonb;
    NEW.custom_design_json := '{}'::jsonb;
  ELSIF v_package = 'gold' THEN
    IF NEW.theme_slug IN ('luxury', 'atelier', 'custom') THEN
      IF v_package_changed THEN
        NEW.theme_slug := 'modern';
      ELSE
        RAISE EXCEPTION 'Premium themes are locked to Diamond stores'
          USING ERRCODE = '42501';
      END IF;
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
BEFORE INSERT OR UPDATE OF package_id, package_slug, theme_slug, theme_color,
  banner_json, custom_design_json, featured_product_ids, opening_hours,
  services_json, social_links_json
ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.enforce_store_theme_package();

-- Store owners and active store admins need to see the subscription which
-- determines their effective package.  Keep platform-admin visibility too.
DROP POLICY IF EXISTS "Store members can read store subscriptions" ON public.store_subscriptions;
CREATE POLICY "Store members can read store subscriptions"
ON public.store_subscriptions FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_staff_admin()
  OR EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = store_subscriptions.store_id
      AND (s.owner_id = auth.uid() OR s.owner_user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.store_admins sa
    WHERE sa.store_id = store_subscriptions.store_id
      AND sa.user_id = auth.uid()
      AND COALESCE(sa.status, 'active') = 'active'
  )
);

REVOKE ALL ON FUNCTION public.authorize_store_package_transition() FROM PUBLIC;
