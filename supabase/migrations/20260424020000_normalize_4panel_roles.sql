
-- 1. Normalize Roles in app_role enum
DO $$
BEGIN
    -- Add new roles to the enum
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staffadmin';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'storeadmin';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Migrate existing data to the new role structure
-- Map legacy roles to new roles
UPDATE public.user_roles SET role = 'staffadmin' WHERE role = 'admin';
UPDATE public.user_roles SET role = 'storeadmin' WHERE role = 'store_owner';
UPDATE public.user_roles SET role = 'user' WHERE role IN ('public_user', 'user');
-- moderator: move to storeadmin temporarily if needed, but per instructions we map carefully.
-- For now, let's map moderator to storeadmin to avoid breaking access.
UPDATE public.user_roles SET role = 'storeadmin' WHERE role = 'moderator';

-- 3. Update RLS Helper Functions
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'suadmin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'staffadmin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_store_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'storeadmin'
    );
$$;

-- Backward compatibility functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT public.is_super_admin() OR public.is_staff_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_store_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT public.is_store_admin();
$$;

-- 4. Create store_admins table for local store memberships
CREATE TABLE IF NOT EXISTS public.store_admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
    permissions_json jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(store_id, user_id)
);

-- Enable RLS on store_admins
ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;

-- Policies for store_admins
DROP POLICY IF EXISTS "Superadmins can manage all store admins" ON public.store_admins;
CREATE POLICY "Superadmins can manage all store admins"
ON public.store_admins FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Store owners can manage their own store staff" ON public.store_admins;
CREATE POLICY "Store owners can manage their own store staff"
ON public.store_admins FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.store_admins
        WHERE store_id = public.store_admins.store_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.store_admins
        WHERE store_id = public.store_admins.store_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
);

DROP POLICY IF EXISTS "Users can view their own store memberships" ON public.store_admins;
CREATE POLICY "Users can view their own store memberships"
ON public.store_admins FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. Seed store_admins from existing store owners if necessary
-- Assuming 'stores' table has an 'owner_id' column from previous migrations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'owner_id') THEN
        INSERT INTO public.store_admins (store_id, user_id, role)
        SELECT id, owner_id, 'owner'
        FROM public.stores
        WHERE owner_id IS NOT NULL
        ON CONFLICT (store_id, user_id) DO NOTHING;
    END IF;
END $$;
