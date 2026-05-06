DROP POLICY IF EXISTS "Admins can manage guides" ON public.guides;
CREATE POLICY "Admins can manage guides"
ON public.guides
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all guides" ON public.guides;
CREATE POLICY "Admins can view all guides"
ON public.guides
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage polls" ON public.polls;
CREATE POLICY "Admins can manage polls"
ON public.polls
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all polls" ON public.polls;
CREATE POLICY "Admins can view all polls"
ON public.polls
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage poll votes" ON public.poll_votes;
CREATE POLICY "Admins can manage poll votes"
ON public.poll_votes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

