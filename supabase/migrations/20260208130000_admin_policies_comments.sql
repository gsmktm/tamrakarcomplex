DROP POLICY IF EXISTS "Admins can manage comments" ON public.comments;
CREATE POLICY "Admins can manage comments"
ON public.comments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

