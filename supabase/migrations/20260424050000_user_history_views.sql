
-- 1. Unified User History View
-- This view consolidates various user activities for the history center
CREATE OR REPLACE VIEW public.user_activity_history AS
SELECT 
    'order' as activity_type,
    id as activity_id,
    user_id,
    status,
    total_amount::text as description,
    created_at
FROM public.orders
UNION ALL
SELECT 
    'repair' as activity_type,
    id as activity_id,
    user_id,
    status,
    device_model || ' - ' || problem_description as description,
    created_at
FROM public.repair_requests
UNION ALL
SELECT 
    'exchange' as activity_type,
    id as activity_id,
    user_id,
    status,
    new_device_interest as description,
    created_at
FROM public.exchange_requests
UNION ALL
SELECT 
    'unlock' as activity_type,
    id as activity_id,
    user_id,
    status,
    device_model || ' - ' || service_type as description,
    created_at
FROM public.unlock_requests;

-- 2. Referral History RPC
CREATE OR REPLACE FUNCTION public.get_user_referral_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral_code text;
    v_referred_count integer;
    v_total_earnings numeric;
    v_history jsonb;
BEGIN
    -- Get referral code
    SELECT referral_code INTO v_referral_code FROM public.profiles WHERE user_id = p_user_id;
    
    -- Get referred count
    SELECT count(*) INTO v_referred_count FROM public.profiles WHERE referred_by = p_user_id;
    
    -- Get total earnings (placeholder logic, adjust if there's an earnings table)
    SELECT COALESCE(sum(points), 0) INTO v_total_earnings FROM public.user_points WHERE user_id = p_user_id AND reason ILIKE '%referral%';
    
    -- Get history
    SELECT jsonb_agg(h) INTO v_history FROM (
        SELECT display_name, created_at 
        FROM public.profiles 
        WHERE referred_by = p_user_id 
        ORDER BY created_at DESC
    ) h;

    RETURN jsonb_build_object(
        'referral_code', v_referral_code,
        'referred_count', v_referred_count,
        'total_earnings', v_total_earnings,
        'history', COALESCE(v_history, '[]'::jsonb)
    );
END;
$$;

-- 3. Reward Balance RPC
CREATE OR REPLACE FUNCTION public.get_user_reward_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(sum(points), 0) FROM public.user_points WHERE user_id = p_user_id;
$$;

-- 4. Ensure RLS on the view (views don't have RLS, but the underlying tables do)
-- However, we can use SECURITY BARRIER if needed. For now, we'll rely on underlying RLS.
-- Or just create a secure function to fetch history.

CREATE OR REPLACE FUNCTION public.get_my_history()
RETURNS SETOF public.user_activity_history
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT * FROM public.user_activity_history WHERE user_id = auth.uid() ORDER BY created_at DESC;
$$;
