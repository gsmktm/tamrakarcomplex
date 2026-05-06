-- Create a function to get aggregated poll results (no individual vote data exposed)
CREATE OR REPLACE FUNCTION public.get_poll_results(p_poll_id uuid)
RETURNS TABLE(option_index integer, vote_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    pv.option_index,
    COUNT(*)::bigint as vote_count
  FROM public.poll_votes pv
  WHERE pv.poll_id = p_poll_id
  GROUP BY pv.option_index
  ORDER BY pv.option_index;
$$;