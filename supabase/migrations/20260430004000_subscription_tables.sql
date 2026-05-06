
-- Create packages table
CREATE TABLE IF NOT EXISTS public.packages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    monthly_price numeric NOT NULL DEFAULT 0,
    yearly_price numeric NOT NULL DEFAULT 0,
    product_limit integer NOT NULL DEFAULT 0,
    admin_limit integer NOT NULL DEFAULT 0,
    branch_limit integer NOT NULL DEFAULT 0,
    promo_slot_limit integer NOT NULL DEFAULT 0,
    features_json jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT packages_pkey PRIMARY KEY (id)
);

-- Seed initial packages from storePackages.ts metadata
INSERT INTO public.packages (id, name, slug, monthly_price, yearly_price, product_limit, admin_limit, branch_limit, promo_slot_limit, features_json, sort_order)
VALUES 
('87654321-4321-4321-4321-pkg_silver', 'Silver Store', 'silver', 4999, 39999, 200, 2, 1, 0, '["Full profile listing", "Phone, Email & Website display", "Service listing", "Basic priority placement", "Dedicated store page"]', 1),
('87654321-4321-4321-4321-pkg_gold', 'Gold Store', 'gold', 9999, 99999, 2000, 5, 3, 2, '["Everything in Silver Store", "Verified Merchant badge", "Enhanced priority placement", "Advanced analytics dashboard", "Bulk product import tools", "Social media integration"]', 2),
('87654321-4321-4321-4321-pkg_diamond', 'Diamond Store', 'diamond', 17999, 149000, 20000, 20, 10, 5, '["Everything in Gold Store", "Maximum priority placement", "API access for inventory sync", "Custom branded store theme", "Priority support desk", "Homepage campaign participation"]', 3)
ON CONFLICT (slug) DO UPDATE SET
    monthly_price = EXCLUDED.monthly_price,
    yearly_price = EXCLUDED.yearly_price,
    product_limit = EXCLUDED.product_limit,
    admin_limit = EXCLUDED.admin_limit,
    branch_limit = EXCLUDED.branch_limit,
    promo_slot_limit = EXCLUDED.promo_slot_limit,
    features_json = EXCLUDED.features_json;

-- Create store_subscriptions table
CREATE TABLE IF NOT EXISTS public.store_subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    package_id uuid NOT NULL REFERENCES public.packages(id),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'expired', 'suspended', 'cancelled')),
    is_enabled boolean DEFAULT true,
    start_date timestamptz NOT NULL DEFAULT now(),
    end_date timestamptz NOT NULL,
    next_billing_date timestamptz,
    auto_renew boolean DEFAULT true,
    scheduled_package_id uuid REFERENCES public.packages(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT store_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT store_subscriptions_store_id_key UNIQUE (store_id)
);

-- Create store_usage table for real-time tracking
CREATE TABLE IF NOT EXISTS public.store_usage (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    total_products integer DEFAULT 0,
    total_admins integer DEFAULT 0,
    total_branches integer DEFAULT 0,
    total_promo_slots integer DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT store_usage_pkey PRIMARY KEY (id),
    CONSTRAINT store_usage_store_id_key UNIQUE (store_id)
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_usage ENABLE ROW LEVEL SECURITY;

-- Policies for packages (publicly viewable)
DROP POLICY IF EXISTS "Packages are viewable by everyone" ON public.packages;
CREATE POLICY "Packages are viewable by everyone" ON public.packages FOR SELECT USING (true);

-- Policies for store_subscriptions
DROP POLICY IF EXISTS "Store owners can view their own subscription" ON public.store_subscriptions;
CREATE POLICY "Store owners can view their own subscription"
    ON public.store_subscriptions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = store_subscriptions.store_id AND stores.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.store_subscriptions;
CREATE POLICY "Admins can manage all subscriptions"
    ON public.store_subscriptions FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Policies for store_usage
DROP POLICY IF EXISTS "Store owners can view their own usage" ON public.store_usage;
CREATE POLICY "Store owners can view their own usage"
    ON public.store_usage FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = store_usage.store_id AND stores.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all usage records" ON public.store_usage;
CREATE POLICY "Admins can manage all usage records"
    ON public.store_usage FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Seed initial packages
INSERT INTO public.packages (name, slug, description, monthly_price, yearly_price, product_limit, staff_limit, branch_limit, is_featured, sort_order)
VALUES 
('Silver', 'silver', 'Essential for small shops', 999, 9999, 100, 2, 1, false, 1),
('Gold', 'gold', 'Perfect for growing businesses', 2499, 24999, 500, 5, 3, true, 2),
('Diamond', 'diamond', 'Ultimate power for large enterprises', 4999, 49999, 10000, 20, 10, false, 3)
ON CONFLICT (slug) DO NOTHING;

-- Trigger to create store_usage record on store creation
CREATE OR REPLACE FUNCTION public.handle_new_store_usage()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.store_usage (store_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_store_created_usage
    AFTER INSERT ON public.stores
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_store_usage();

-- Trigger to keep store_usage in sync with real counts
CREATE OR REPLACE FUNCTION public.sync_store_product_count()
RETURNS trigger AS $$
DECLARE
    v_store_id uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_store_id := OLD.store_id;
    ELSE
        v_store_id := NEW.store_id;
    END IF;

    UPDATE public.store_usage
    SET products_count = (SELECT count(*) FROM public.products WHERE store_id = v_store_id),
        last_updated = now()
    WHERE store_id = v_store_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Assuming products table has a store_id or similar. 
-- In this project, it seems products are global? 
-- The user request mentioned "store subscription".
-- If products aren't linked to stores yet, we'll just track global counts for now or placeholder logic.
