
-- 1. Fix Packages Table Schema
DO $$
BEGIN
    -- Ensure all required columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'staff_limit') THEN
        ALTER TABLE public.packages ADD COLUMN staff_limit integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'is_featured') THEN
        ALTER TABLE public.packages ADD COLUMN is_featured boolean DEFAULT false;
    END IF;
END $$;

-- 2. Consolidate Package Seeds
-- Clean up existing messy seeds and insert normalized ones
DELETE FROM public.packages;

INSERT INTO public.packages (id, name, slug, description, monthly_price, yearly_price, product_limit, staff_limit, branch_limit, promo_slot_limit, features_json, sort_order, is_featured)
VALUES 
('87654321-4321-4321-4321-pkg_silver', 'Silver Store', 'silver', 'Essential for small shops', 4999, 39999, 200, 2, 1, 0, '["Full profile listing", "Phone, Email & Website display", "Service listing", "Basic priority placement", "Dedicated store page"]', 1, false),
('87654321-Gold-4321-4321-pkg_gold', 'Gold Store', 'gold', 'Perfect for growing businesses', 9999, 99999, 2000, 5, 3, 2, '["Everything in Silver Store", "Verified Merchant badge", "Enhanced priority placement", "Advanced analytics dashboard", "Bulk product import tools", "Social media integration"]', 2, true),
('87654321-Diam-4321-4321-pkg_diamond', 'Diamond Store', 'diamond', 'Ultimate power for large enterprises', 17999, 149000, 20000, 20, 10, 5, '["Everything in Gold Store", "Maximum priority placement", "API access for inventory sync", "Custom branded store theme", "Priority support desk", "Homepage campaign participation"]', 3, false);

-- 3. Fix store_usage Table Schema
DO $$
BEGIN
    -- Ensure columns match the trigger logic
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_usage' AND column_name = 'products_count') THEN
        ALTER TABLE public.store_usage RENAME COLUMN total_products TO products_count;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_usage' AND column_name = 'last_updated') THEN
        ALTER TABLE public.store_usage RENAME COLUMN updated_at TO last_updated;
    END IF;
END $$;

-- 4. Fix RLS Policies for Subscriptions and Usage
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.store_subscriptions;
CREATE POLICY "Admins can manage all subscriptions"
    ON public.store_subscriptions FOR ALL
    TO authenticated
    USING (public.is_staff_admin())
    WITH CHECK (public.is_staff_admin());

DROP POLICY IF EXISTS "Store owners can view their own subscription" ON public.store_subscriptions;
CREATE POLICY "Store owners can view their own subscription"
    ON public.store_subscriptions FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.store_admins
        WHERE store_id = store_subscriptions.store_id
        AND user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage all usage records" ON public.store_usage;
CREATE POLICY "Admins can manage all usage records"
    ON public.store_usage FOR ALL
    TO authenticated
    USING (public.is_staff_admin())
    WITH CHECK (public.is_staff_admin());

DROP POLICY IF EXISTS "Store owners can view their own usage" ON public.store_usage;
CREATE POLICY "Store owners can view their own usage"
    ON public.store_usage FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.store_admins
        WHERE store_id = store_usage.store_id
        AND user_id = auth.uid()
    ));

-- 5. Fix sync_store_product_count trigger
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

    IF v_store_id IS NOT NULL THEN
        INSERT INTO public.store_usage (store_id, products_count, last_updated)
        VALUES (v_store_id, (SELECT count(*) FROM public.products WHERE store_id = v_store_id), now())
        ON CONFLICT (store_id) DO UPDATE SET
            products_count = (SELECT count(*) FROM public.products WHERE store_id = v_store_id),
            last_updated = now();
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Re-create trigger on products table
DROP TRIGGER IF EXISTS tr_sync_store_product_count ON public.products;
CREATE TRIGGER tr_sync_store_product_count
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.sync_store_product_count();

-- 6. Add subscription_payments table if not exists (consolidated)
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id uuid REFERENCES public.store_subscriptions(id) ON DELETE CASCADE,
    store_id uuid REFERENCES public.stores(id),
    amount numeric NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method text,
    transaction_id text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view all payments" ON public.subscription_payments FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "Storeadmins can view own payments" ON public.subscription_payments FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.store_admins WHERE store_id = subscription_payments.store_id AND user_id = auth.uid()
));
