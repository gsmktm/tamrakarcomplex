-- ─────────────────────────────────────────────────────────────────────────────
-- Production Hardening Migration — 2026-05-21
-- Fully defensive: creates tables/columns/indexes only if missing.
-- Safe to run on any DB state — from fresh to fully migrated.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. store_admins table (create if missing, add status if missing) ─────────
CREATE TABLE IF NOT EXISTS public.store_admins (
  store_id uuid NOT NULL,
  user_id  uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role     text NOT NULL DEFAULT 'admin',
  status   text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT store_admins_pkey PRIMARY KEY (store_id, user_id)
);

-- If table already existed, add status column idempotently
ALTER TABLE public.store_admins
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended'));

-- Back-fill any NULL status values
UPDATE public.store_admins SET status = 'active' WHERE status IS NULL;

-- Enable RLS if not already
ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;

-- Index for status filter used by frontend
CREATE INDEX IF NOT EXISTS idx_store_admins_user_status
  ON public.store_admins (user_id, status);

-- ─── 2. stores: ensure owner_user_id exists ───────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stores'
  ) THEN
    -- Add owner_user_id if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stores'
        AND column_name = 'owner_user_id'
    ) THEN
      ALTER TABLE public.stores
        ADD COLUMN owner_user_id uuid REFERENCES auth.users ON DELETE SET NULL;
    END IF;

    -- Back-fill from owner_id if both columns exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stores'
        AND column_name = 'owner_id'
    ) THEN
      UPDATE public.stores
        SET owner_user_id = owner_id
        WHERE owner_user_id IS NULL AND owner_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- ─── 3. Storage buckets ───────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars',     'avatars',     true),
  ('logos',       'logos',       true),
  ('marketplace', 'marketplace', true),
  ('uploads',     'uploads',     true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Per-bucket RLS policies (drop+recreate = idempotent)
DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['avatars','logos','marketplace','uploads']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "public_read_%s" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "public_read_%s" ON storage.objects FOR SELECT USING (bucket_id = %L)',
      b, b
    );

    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "auth_insert_%s" ON storage.objects FOR INSERT WITH CHECK (bucket_id = %L AND auth.role() = ''authenticated'')',
      b, b
    );

    EXECUTE format('DROP POLICY IF EXISTS "owner_update_%s" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "owner_update_%s" ON storage.objects FOR UPDATE USING (bucket_id = %L AND auth.uid() = owner)',
      b, b
    );

    EXECUTE format('DROP POLICY IF EXISTS "owner_delete_%s" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "owner_delete_%s" ON storage.objects FOR DELETE USING (bucket_id = %L AND auth.uid() = owner)',
      b, b
    );
  END LOOP;
END $$;

-- ─── 4. Performance indexes (only if underlying tables exist) ─────────────────
DO $$
BEGIN
  -- stores indexes (guard each column individually)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stores') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stores' AND column_name='owner_user_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stores_owner_user_id ON public.stores (owner_user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stores' AND column_name='slug') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores (slug)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stores' AND column_name='seo_slug') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stores_seo_slug ON public.stores (seo_slug)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stores' AND column_name='status') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores (status)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stores' AND column_name='package_slug') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stores_package ON public.stores (package_slug)';
    END IF;
  END IF;

  -- products indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='store_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products (store_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='status') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='brand_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products (brand_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_created ON public.products (created_at DESC)';
    END IF;
  END IF;

  -- sell_listings indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sell_listings') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sell_listings' AND column_name='store_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sell_listings_store ON public.sell_listings (store_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sell_listings' AND column_name='status') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sell_listings_status ON public.sell_listings (status)';
    END IF;
  END IF;

  -- repair_requests indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='repair_requests') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='repair_requests' AND column_name='store_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_repair_requests_store ON public.repair_requests (store_id)';
    END IF;
  END IF;
END $$;

-- ─── 5. bootstrap_suadmin_by_email RPC ───────────────────────────────────────
-- Creates user_roles table if missing, then creates/updates suadmin role.
-- Call: SELECT bootstrap_suadmin_by_email('your@email.com');
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bootstrap_suadmin_by_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found: ' || p_email);
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'suadmin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update profiles.role if profiles table has a role column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='role'
  ) THEN
    UPDATE public.profiles
    SET role = 'suadmin', updated_at = now()
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email',   p_email,
    'role',    'suadmin'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_suadmin_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_suadmin_by_email(text) TO service_role;

-- ─── 6. cache_invalidations table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cache_invalidations (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text    NOT NULL,
  entity_id   text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.cache_invalidations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_cache_invalidations" ON public.cache_invalidations;
CREATE POLICY "read_cache_invalidations"
  ON public.cache_invalidations FOR SELECT
  USING (auth.role() = 'authenticated');
