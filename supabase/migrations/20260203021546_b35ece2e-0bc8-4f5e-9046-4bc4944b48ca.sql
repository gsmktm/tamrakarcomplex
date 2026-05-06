-- Fix: Restrict poll_votes SELECT to only allow users to view their own votes
-- This prevents anyone from querying individual voting records

-- Drop the overly permissive policy that exposes all vote records
DROP POLICY IF EXISTS "Anyone can view poll votes count" ON public.poll_votes;

-- Create a restrictive policy - users can only see their own votes
CREATE POLICY "Users can view their own votes"
ON public.poll_votes
FOR SELECT
USING (auth.uid() = user_id);

-- Create a view for aggregated poll results that doesn't expose individual votes
CREATE OR REPLACE VIEW public.poll_results
WITH (security_invoker=on) AS
SELECT 
  poll_id,
  option_index,
  COUNT(*) as vote_count
FROM public.poll_votes
GROUP BY poll_id, option_index;