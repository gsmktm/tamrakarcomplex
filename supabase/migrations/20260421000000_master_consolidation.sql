-- ============================================================================== 
-- MASTER CONSOLIDATION MIGRATION
-- This migration aligns the database with the user's "Master Script" vision.
-- It ensures the circle is closed: Auth -> Profiles -> Roles -> Stores -> Marketplace.
-- ============================================================================== 

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure all roles exist in the enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('suadmin', 'admin', 'store_owner', 'moderator', 'public_user');
    ELSE
        -- Add missing values to existing enum
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'suadmin';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_owner';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'public_user';
    END IF;
END $$;

-- 2. PROFILES ENHANCEMENT
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS referral_points INTEGER DEFAULT 0;

-- 3. USER ROLES 
-- Table already exists from previous migrations, but let's ensure it has the correct constraints.
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role DEFAULT 'public_user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- 4. CRITICAL: MASTER AUTH TRIGGER
-- This ensures every new user gets a profile AND a default role.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, display_name, email, phone, referral_code) 
  VALUES ( 
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 
    NEW.email, 
    NEW.raw_user_meta_data->>'phone', 
    SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 8) -- Auto-generate a referral code 
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    phone = COALESCE(profiles.phone, EXCLUDED.phone);
  
  -- 2. Give them a default role 
  -- 🚀 BOOTSTRAP: If this is one of the known admin emails, give them suadmin instead of public_user
  IF lower(NEW.email) IN (
    'suadmin@tamrakarcomplex.com',
    'admin@tamrakarcomplex.com', 
    'gsmktm@gmail.com', 
    'gskmtm@gmail.com', 
    'gsktm@gmail.com', 
    'superadmin@tamrakarcomplex.com',
    'bootstrap-admin@example.invalid'
  ) THEN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, 'suadmin')
    ON CONFLICT (user_id, role) DO UPDATE SET role = 'suadmin';
  ELSE
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, 'public_user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-apply trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. STORES ENHANCEMENT
ALTER TABLE public.stores
    ADD COLUMN IF NOT EXISTS services TEXT[], -- ['Repair', 'Exchange', 'Sales']
    ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS map_url TEXT;

-- 6. PRODUCTS ENHANCEMENT
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS specs JSONB;

-- 7. EXCHANGE & VALUATION (Consolidated)
CREATE TABLE IF NOT EXISTS public.device_catalog ( 
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, 
    brand TEXT NOT NULL, 
    model TEXT NOT NULL, 
    canonical_slug TEXT UNIQUE NOT NULL, 
    storage TEXT, 
    ram TEXT, 
    release_year INTEGER, 
    image TEXT 
); 

CREATE TABLE IF NOT EXISTS public.valuation_rules ( 
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, 
    device_id UUID REFERENCES public.device_catalog(id) ON DELETE CASCADE UNIQUE, 
    base_price NUMERIC NOT NULL, 
    condition_factors JSONB DEFAULT '{"new": 1.0, "like_new": 0.85, "used": 0.7, "fair": 0.5}', 
    defect_adjustments JSONB, 
    age_depreciation JSONB DEFAULT '{"perMonth": 0.01, "capMonths": 48}', 
    demand_factor NUMERIC DEFAULT 1.0 
); 

CREATE TABLE IF NOT EXISTS public.leads_quotes ( 
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, 
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, 
    partner_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL, 
    type TEXT NOT NULL, -- 'exchange' or 'sell'
    device JSONB NOT NULL, 
    condition TEXT NOT NULL, 
    defects TEXT[], 
    quoted_value NUMERIC NOT NULL, 
    status TEXT DEFAULT 'new', 
    created_at TIMESTAMPTZ DEFAULT NOW() 
); 

-- 8. ORDERS & REPAIRS (Ensuring alignment)
-- Orders table usually already exists, but let's ensure store_id linkage.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.repair_requests ( 
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, 
    tracking_id TEXT UNIQUE NOT NULL, 
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, 
    assigned_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL, 
    name TEXT NOT NULL, 
    phone TEXT NOT NULL, 
    email TEXT, 
    device_brand TEXT NOT NULL, 
    device_model TEXT NOT NULL, 
    issue_type TEXT NOT NULL, 
    description TEXT, 
    estimated_cost NUMERIC, 
    internal_notes TEXT, 
    status public.repair_status DEFAULT 'pending', 
    preferred_date TIMESTAMPTZ, 
    created_at TIMESTAMPTZ DEFAULT NOW(), 
    updated_at TIMESTAMPTZ DEFAULT NOW() 
); 

-- Enable RLS on new tables
ALTER TABLE public.device_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;

-- Basic Policies
DROP POLICY IF EXISTS "Allow public read device_catalog" ON public.device_catalog;
CREATE POLICY "Allow public read device_catalog" ON public.device_catalog FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated read valuation_rules" ON public.valuation_rules;
CREATE POLICY "Allow authenticated read valuation_rules" ON public.valuation_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads_quotes;
CREATE POLICY "Users can view their own leads" ON public.leads_quotes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own leads" ON public.leads_quotes;
CREATE POLICY "Users can insert their own leads" ON public.leads_quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view their own repairs" ON public.repair_requests;
CREATE POLICY "Users can view their own repairs" ON public.repair_requests FOR SELECT USING (auth.uid() = user_id OR phone = (SELECT phone FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Public can insert repair requests" ON public.repair_requests;
CREATE POLICY "Public can insert repair requests" ON public.repair_requests FOR INSERT WITH CHECK (true);
