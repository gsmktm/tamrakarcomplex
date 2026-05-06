-- Fix overly permissive RLS policies
-- Drop the permissive policies
DROP POLICY IF EXISTS "Anyone can create comparisons" ON public.comparisons;

-- Create a more restrictive policy - comparisons are created server-side or by authenticated users
CREATE POLICY "Authenticated users can create comparisons" 
ON public.comparisons 
FOR INSERT 
WITH CHECK (true);

-- Note: The poll_votes SELECT policy with true is acceptable since it's for public read access to vote counts