-- Allow guests (anon) to submit repair requests with user_id = NULL.
-- Authenticated users can still submit with user_id = auth.uid().

DROP POLICY IF EXISTS "Users can create repair requests." ON public.repair_requests;
DROP POLICY IF EXISTS "Repair Requests: Anyone can create" ON public.repair_requests;

CREATE POLICY "Repair Requests: Anyone can create"
  ON public.repair_requests
  FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

