-- ============================================================
-- FIX USER ACTIVITY HISTORY VIEW
-- Corrects column names for unlock_requests and exchange_requests
-- ============================================================

CREATE OR REPLACE VIEW public.user_activity_history AS
SELECT 
    'order' as activity_type,
    id as activity_id,
    user_id,
    status,
    'Order Total: Rs. ' || total_amount::text as description,
    created_at,
    updated_at
FROM public.orders
UNION ALL
SELECT 
    'repair' as activity_type,
    id as activity_id,
    user_id,
    status,
    device_brand || ' ' || device_model || ' - ' || issue_type as description,
    created_at,
    updated_at
FROM public.repair_requests
UNION ALL
SELECT 
    'exchange' as activity_type,
    id as activity_id,
    user_id,
    status,
    brand || ' ' || model || ' -> ' || interest_model as description,
    created_at,
    updated_at
FROM public.exchange_requests
UNION ALL
SELECT 
    'unlock' as activity_type,
    id as activity_id,
    user_id,
    status,
    brand || ' ' || model || ' - ' || service_type as description,
    created_at,
    updated_at
FROM public.unlock_requests
UNION ALL
SELECT 
    'lead' as activity_type,
    id as activity_id,
    user_id,
    status,
    brand || ' ' || model || ' - Value: Rs. ' || quoted_value::text as description,
    created_at,
    updated_at
FROM public.sell_phone_leads
UNION ALL
SELECT 
    'listing' as activity_type,
    id as activity_id,
    user_id,
    status,
    title || ' - Rs. ' || price::text as description,
    created_at,
    updated_at
FROM public.sell_listings;

-- Update get_my_history to return updated_at too
CREATE OR REPLACE FUNCTION public.get_my_history()
RETURNS SETOF public.user_activity_history
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT * FROM public.user_activity_history WHERE user_id = auth.uid() ORDER BY created_at DESC;
$$;
