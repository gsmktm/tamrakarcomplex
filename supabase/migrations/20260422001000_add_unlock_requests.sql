-- Migration: Add Unlocking Service Requests
-- Description: Adds tables for tracking device unlocking requests from users.

CREATE TABLE IF NOT EXISTS public.unlock_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    service_type TEXT NOT NULL, -- 'FRP Bypass', 'IMEI Repair', 'Network Unlock', 'Root Access', etc.
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    assigned_store_id UUID REFERENCES public.stores(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.unlock_requests ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own unlock requests" ON public.unlock_requests;
CREATE POLICY "Users can view their own unlock requests" 
    ON public.unlock_requests FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can create unlock requests" ON public.unlock_requests;
CREATE POLICY "Anyone can create unlock requests" 
    ON public.unlock_requests FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Store owners can view requests assigned to their store" ON public.unlock_requests;
CREATE POLICY "Store owners can view requests assigned to their store" 
    ON public.unlock_requests FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.stores 
            WHERE id = assigned_store_id AND owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Store owners can update requests assigned to their store" ON public.unlock_requests;
CREATE POLICY "Store owners can update requests assigned to their store" 
    ON public.unlock_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.stores 
            WHERE id = assigned_store_id AND owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Suadmins can manage all unlock requests" ON public.unlock_requests;
CREATE POLICY "Suadmins can manage all unlock requests"
    ON public.unlock_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'suadmin'
        )
    );

DROP POLICY IF EXISTS "Staffadmins can manage all unlock requests" ON public.unlock_requests;
CREATE POLICY "Staffadmins can manage all unlock requests"
    ON public.unlock_requests FOR ALL
    USING (public.is_staff_admin());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_unlock_requests_user_id ON public.unlock_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_status ON public.unlock_requests(status);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_store_id ON public.unlock_requests(assigned_store_id);
