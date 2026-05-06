
-- 1. Update app_role enum to include all required roles
-- The existing roles might be ('admin', 'moderator', 'user'). We need 'suadmin', 'admin', 'store_owner', 'public_user'.
-- Since we cannot easily alter an enum in a transaction in some Postgres versions, we'll handle it carefully.
-- Note: 'user' in the existing enum likely maps to 'public_user', but let's be explicit.

DO $$
BEGIN
    -- Add new values to the enum if they don't exist
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'suadmin';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_owner';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'public_user';
END $$;

-- 2. Create a permissions table to define granular rights (optional but good for "deep thinking" architecture)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role public.app_role NOT NULL,
    permission text NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (role, permission)
);

-- 3. Seed default permissions (conceptual for now, used by frontend/API)
INSERT INTO public.role_permissions (role, permission) VALUES
    ('suadmin', 'all_access'),
    ('admin', 'manage_content'),
    ('admin', 'manage_products'),
    ('admin', 'manage_news'),
    ('admin', 'view_settings'),
    ('store_owner', 'manage_own_store'),
    ('store_owner', 'manage_own_products'),
    ('store_owner', 'manage_own_blog'),
    ('public_user', 'view_dashboard'),
    ('public_user', 'manage_own_profile'),
    ('public_user', 'view_history')
ON CONFLICT DO NOTHING;

-- 4. Create RLS Helper Functions for the new roles

-- Function to check if user is Super Admin
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
    ) OR (
        -- Hardcoded backup for safety
        lower(auth.jwt() ->> 'email') IN ('gsmktm@gmail.com', 'gskmtm@gmail.com', 'gsktm@gmail.com', 'admin@tamrakarcomplex.com')
    );
$$;

-- Function to check if user is Admin (or Super Admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    );
$$;

-- Function to check if user is Store Owner
CREATE OR REPLACE FUNCTION public.is_store_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'store_owner'
    );
$$;

-- 5. Apply Policies based on the new requirements

-- SUPER ADMIN: Full Access to key tables (overriding previous policies if needed)
-- Note: We'll create a policy that applies to ALL operations for super admins on critical tables.

-- Example: Products Table
DROP POLICY IF EXISTS "Super Admin full access products" ON public.products;
CREATE POLICY "Super Admin full access products"
ON public.products
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- ADMIN: Manage Content, News, Products (but maybe restricted from hard delete if we wanted, for now full edit)
DROP POLICY IF EXISTS "Admin manage products" ON public.products;
CREATE POLICY "Admin manage products"
ON public.products
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- STORE OWNER: Manage OWN products and store
-- Assuming products table has a 'store_id' or 'owner_id' column. 
-- If not, we need to add it or link via a stores table.
-- Let's assume there is a 'stores' table and products are linked to it.

-- 6. User Dashboard Tables (Points, History, etc.)

-- Create table for User Points/Rewards
CREATE TABLE IF NOT EXISTS public.user_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    points integer DEFAULT 0,
    reason text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own points"
ON public.user_points FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage points"
ON public.user_points FOR ALL
TO authenticated
USING (public.is_admin());

-- Create table for Device History (IMEI, Old Phones)
CREATE TABLE IF NOT EXISTS public.user_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name text NOT NULL,
    imei text,
    status text, -- 'current', 'sold', 'exchanged', 'repairing'
    purchase_date date,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own devices"
ON public.user_devices FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all devices"
ON public.user_devices FOR SELECT
TO authenticated
USING (public.is_admin());

-- Create table for Exchange Requests
CREATE TABLE IF NOT EXISTS public.exchange_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    old_device_id uuid REFERENCES public.user_devices(id),
    new_device_interest text,
    status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
    estimated_value decimal,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.exchange_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own exchanges"
ON public.exchange_requests FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage exchanges"
ON public.exchange_requests FOR ALL
TO authenticated
USING (public.is_admin());

-- 7. Store Owner Specific Tables
-- Ensure 'stores' table exists and has owner_id
-- (Assuming table exists from previous migrations, we'll add policy)

-- Policy for Store Owners to manage their OWN store
-- We need to check if the user is the owner of the store
-- This requires the stores table to have an 'owner_id' column

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'owner_id') THEN
        ALTER TABLE public.stores ADD COLUMN owner_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- Enable RLS on stores if not already
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store Owners manage own store" ON public.stores;
CREATE POLICY "Store Owners manage own store"
ON public.stores
FOR ALL
TO authenticated
USING (owner_id = auth.uid() OR public.is_admin())
WITH CHECK (owner_id = auth.uid() OR public.is_admin());

-- 8. Public User Dashboard Access
-- Public users have read access to their own profile, wishlist, etc.
-- (Already largely covered by existing policies, but we ensure consistency)

-- Ensure profile policies allow users to edit their own data
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
