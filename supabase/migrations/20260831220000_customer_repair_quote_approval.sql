-- Customer quote approval for repairs.
-- quote_pending -> quote_approved (or -> cancelled) has so far only been
-- settable by store/platform admins (transition_repair_status). Customers
-- saw "Your repair quote is awaiting approval" with no way to consent.
-- This RPC lets the repair OWNER respond to their own quote:
--   * authenticated customers: must own the row (user_id = auth.uid())
--   * anonymous bookings: must present the exact tracking_id
-- Enforces the same state machine as every other transition and logs a
-- status-history note with the customer's decision.

CREATE OR REPLACE FUNCTION public.respond_to_repair_quote(
  p_repair_id   uuid DEFAULT NULL,
  p_tracking_id text  DEFAULT NULL,
  p_approve     boolean,
  p_note        text  DEFAULT NULL
)
RETURNS public.repair_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_repair public.repair_requests%ROWTYPE;
  v_to     text;
BEGIN
  IF p_approve IS NULL THEN
    RAISE EXCEPTION 'decision_required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_repair FROM public.repair_requests WHERE id = p_repair_id FOR UPDATE;

  -- Anonymous bookings can be addressed by tracking id instead.
  IF NOT FOUND AND p_tracking_id IS NOT NULL THEN
    SELECT * INTO v_repair FROM public.repair_requests
    WHERE upper(tracking_id) = upper(p_tracking_id) FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'repair_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_repair.status <> 'quote_pending' THEN
    RAISE EXCEPTION 'quote_not_pending' USING ERRCODE = '22023';
  END IF;

  -- Authorization: authenticated callers must own the repair row.
  IF auth.uid() IS NOT NULL THEN
    IF v_repair.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'quote_response_forbidden' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Anonymous callers must have supplied the tracking id (not the uuid).
    IF p_tracking_id IS NULL OR v_repair.user_id IS NOT NULL THEN
      RAISE EXCEPTION 'quote_response_forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  v_to := CASE WHEN p_approve THEN 'quote_approved' ELSE 'cancelled' END;

  IF NOT public.is_valid_repair_transition(v_repair.status, v_to) THEN
    RAISE EXCEPTION 'invalid_repair_status_transition:%->%', v_repair.status, v_to
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.repair_requests
  SET status = v_to, updated_at = now()
  WHERE id = v_repair.id
  RETURNING * INTO v_repair;

  -- Attach the customer's decision to the status history entry (same pattern
  -- as transition_repair_status).
  UPDATE public.repair_status_history
  SET note = left(
    coalesce(nullif(trim(p_note), '') || ' — ', '') ||
    CASE WHEN p_approve THEN 'Quote approved by customer' ELSE 'Quote declined by customer' END,
    1000)
  WHERE id = (
    SELECT id FROM public.repair_status_history
    WHERE repair_request_id = v_repair.id
    ORDER BY changed_at DESC LIMIT 1
  );

  PERFORM public.log_privileged_action(
    CASE WHEN p_approve THEN 'CUSTOMER_APPROVED_QUOTE' ELSE 'CUSTOMER_DECLINED_QUOTE' END,
    'repair_management', 'repair_requests',
    v_repair.id, v_repair.assigned_store_id, NULL,
    jsonb_build_object('decision', CASE WHEN p_approve THEN 'approved' ELSE 'declined' END)
  );

  RETURN v_repair;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_repair_quote(uuid, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_repair_quote(uuid, text, boolean, text) TO anon, authenticated;
