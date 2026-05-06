-- Create visitor_logs table
CREATE TABLE IF NOT EXISTS public.visitor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT,
    url TEXT,
    referrer TEXT,
    country TEXT,
    city TEXT,
    region TEXT,
    is_unique BOOLEAN DEFAULT false,
    session_id TEXT
);

-- Add indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON public.visitor_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_country ON public.visitor_logs (country);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_is_unique ON public.visitor_logs (is_unique);

-- Enable RLS
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;

-- Allow public to insert visitor logs (we want to track all visitors)
DROP POLICY IF EXISTS "Allow public insert to visitor_logs" ON public.visitor_logs;
CREATE POLICY "Allow public insert to visitor_logs" 
ON public.visitor_logs FOR INSERT 
TO public 
WITH CHECK (true);

-- Only admins/suadmins can view visitor logs
DROP POLICY IF EXISTS "Allow admin view visitor_logs" ON public.visitor_logs;
CREATE POLICY "Allow admin view visitor_logs" 
ON public.visitor_logs FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'suadmin')
    )
);

-- RPC function to log a visit and check for uniqueness
CREATE OR REPLACE FUNCTION public.log_visitor(
    p_ip_address TEXT,
    p_user_agent TEXT,
    p_url TEXT,
    p_referrer TEXT,
    p_country TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_region TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_unique BOOLEAN;
BEGIN
    -- Check if this IP has visited today
    SELECT NOT EXISTS (
        SELECT 1 FROM public.visitor_logs 
        WHERE ip_address = p_ip_address 
        AND created_at >= CURRENT_DATE
    ) INTO v_is_unique;

    INSERT INTO public.visitor_logs (
        ip_address,
        user_agent,
        url,
        referrer,
        country,
        city,
        region,
        is_unique,
        session_id
    ) VALUES (
        p_ip_address,
        p_user_agent,
        p_url,
        p_referrer,
        p_country,
        p_city,
        p_region,
        v_is_unique,
        p_session_id
    );
END;
$$;

-- Function to get visitor stats for admin panel
CREATE OR REPLACE FUNCTION public.get_visitor_stats(p_period TEXT DEFAULT 'daily')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF p_period = 'daily' THEN
        SELECT jsonb_agg(t) INTO v_result FROM (
            SELECT 
                date_trunc('hour', created_at) as label,
                count(*) as total_visits,
                count(*) FILTER (WHERE is_unique) as unique_visits
            FROM public.visitor_logs
            WHERE created_at >= CURRENT_DATE
            GROUP BY 1
            ORDER BY 1
        ) t;
    ELSIF p_period = 'weekly' THEN
        SELECT jsonb_agg(t) INTO v_result FROM (
            SELECT 
                date_trunc('day', created_at) as label,
                count(*) as total_visits,
                count(*) FILTER (WHERE is_unique) as unique_visits
            FROM public.visitor_logs
            WHERE created_at >= date_trunc('week', now())
            GROUP BY 1
            ORDER BY 1
        ) t;
    ELSIF p_period = 'monthly' THEN
        SELECT jsonb_agg(t) INTO v_result FROM (
            SELECT 
                date_trunc('day', created_at) as label,
                count(*) as total_visits,
                count(*) FILTER (WHERE is_unique) as unique_visits
            FROM public.visitor_logs
            WHERE created_at >= date_trunc('month', now())
            GROUP BY 1
            ORDER BY 1
        ) t;
    ELSIF p_period = 'yearly' THEN
        SELECT jsonb_agg(t) INTO v_result FROM (
            SELECT 
                date_trunc('month', created_at) as label,
                count(*) as total_visits,
                count(*) FILTER (WHERE is_unique) as unique_visits
            FROM public.visitor_logs
            WHERE created_at >= date_trunc('year', now())
            GROUP BY 1
            ORDER BY 1
        ) t;
    END IF;

    RETURN v_result;
END;
$$;

-- Function to get top visitor countries
CREATE OR REPLACE FUNCTION public.get_top_visitor_countries(p_limit INT DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_agg(t) INTO v_result FROM (
        SELECT 
            country as name,
            count(*) as value
        FROM public.visitor_logs
        WHERE country IS NOT NULL
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT p_limit
    ) t;

    RETURN v_result;
END;
$$;
