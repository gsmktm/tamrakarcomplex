-- Security advisor: function search_path mutable. Pin search_path on all flagged functions.
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.log_price_change() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.get_top_visitor_countries(p_limit integer) SET search_path = public;
ALTER FUNCTION public.touch_store_applications_updated_at() SET search_path = public;
ALTER FUNCTION public.log_visitor(p_ip_address text, p_user_agent text, p_url text, p_referrer text, p_country text, p_city text, p_region text, p_session_id text) SET search_path = public;
ALTER FUNCTION public.get_visitor_stats(p_period text) SET search_path = public;
ALTER FUNCTION public.get_repair_tracking(p_tracking_id text) SET search_path = public;
ALTER FUNCTION public.get_model_ecosystem(p_model_id uuid) SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
