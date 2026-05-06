-- Fix remaining permissive RLS policies
DROP POLICY IF EXISTS "Authenticated users can create comparisons" ON public.comparisons;
DROP POLICY IF EXISTS "Authenticated users can vote" ON public.poll_votes;

-- Comparisons - only authenticated users can create, and must specify valid product IDs
CREATE POLICY "Users can create comparisons" 
ON public.comparisons 
FOR INSERT 
WITH CHECK (
  product1_id IS NOT NULL AND 
  product2_id IS NOT NULL AND 
  category IS NOT NULL
);

-- Poll votes - only authenticated users can vote on their own behalf
CREATE POLICY "Users can vote in polls" 
ON public.poll_votes 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);