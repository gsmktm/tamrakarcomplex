-- Repair/store application intake table for environments that missed older migrations.
-- Keeps both legacy and current column names so StoreApply and admin review stay compatible.

CREATE OR REPLACE FUNCTION public.has_role(target_user_id uuid, target_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF target_user_id IS NULL OR to_regclass('public.user_roles') IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = target_user_id
      AND ur.role::text = target_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'suadmin') OR public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin');
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_admin() TO authenticated, anon;

CREATE TABLE IF NOT EXISTS public.store_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_name text,
  store_name text,
  business_name text,
  contact_name text,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  location text,
  shop_number text,
  business_type text,
  description text,
  message text,
  logo_url text,
  license_url text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_applications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS store_name text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS shop_number text,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS license_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_applications_status_check'
      AND conrelid = 'public.store_applications'::regclass
  ) THEN
    ALTER TABLE public.store_applications
      ADD CONSTRAINT store_applications_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'needs_info'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_store_applications_status_created_at
  ON public.store_applications(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_applications_email
  ON public.store_applications(email);

CREATE OR REPLACE FUNCTION public.touch_store_applications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.owner_name = COALESCE(NULLIF(NEW.owner_name, ''), NEW.contact_name);
  NEW.contact_name = COALESCE(NULLIF(NEW.contact_name, ''), NEW.owner_name);
  NEW.store_name = COALESCE(NULLIF(NEW.store_name, ''), NEW.business_name);
  NEW.business_name = COALESCE(NULLIF(NEW.business_name, ''), NEW.store_name);
  NEW.message = COALESCE(NULLIF(NEW.message, ''), NEW.description);
  NEW.description = COALESCE(NULLIF(NEW.description, ''), NEW.message);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_store_applications_updated_at ON public.store_applications;
CREATE TRIGGER trg_touch_store_applications_updated_at
BEFORE INSERT OR UPDATE ON public.store_applications
FOR EACH ROW
EXECUTE FUNCTION public.touch_store_applications_updated_at();

ALTER TABLE public.store_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert store applications" ON public.store_applications;
CREATE POLICY "Anyone can insert store applications"
ON public.store_applications
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Applicants can read own store applications" ON public.store_applications;
CREATE POLICY "Applicants can read own store applications"
ON public.store_applications
FOR SELECT
USING (user_id = auth.uid() OR email = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Staff can read store applications" ON public.store_applications;
CREATE POLICY "Staff can read store applications"
ON public.store_applications
FOR SELECT
USING (public.is_super_admin() OR public.is_staff_admin());

DROP POLICY IF EXISTS "Staff can update store applications" ON public.store_applications;
CREATE POLICY "Staff can update store applications"
ON public.store_applications
FOR UPDATE
USING (public.is_super_admin() OR public.is_staff_admin())
WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

DROP POLICY IF EXISTS "Staff can delete store applications" ON public.store_applications;
CREATE POLICY "Staff can delete store applications"
ON public.store_applications
FOR DELETE
USING (public.is_super_admin() OR public.is_staff_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_applications TO authenticated;
GRANT INSERT ON public.store_applications TO anon;

-- Make PostgREST/Supabase refresh schema cache after creating the table.
NOTIFY pgrst, 'reload schema';
