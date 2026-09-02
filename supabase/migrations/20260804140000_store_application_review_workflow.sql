-- One transactional review entry point for the super-admin application queue.
-- Approval creates/links the store, provisions owner access, and keeps paid
-- packages private until their payment is verified.

ALTER TABLE public.store_applications
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.review_store_application(
  p_application_id uuid,
  p_status text,
  p_review_notes text DEFAULT NULL,
  p_package_slug text DEFAULT 'free',
  p_billing_cycle text DEFAULT 'monthly'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.store_applications%ROWTYPE;
  v_package public.store_packages%ROWTYPE;
  v_store_id uuid;
  v_owner_id uuid;
  v_exact_store_id uuid;
  v_conflict_count integer;
BEGIN
  IF NOT (public.is_super_admin() OR public.is_staff_admin()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_status NOT IN ('approved','rejected','needs_info') THEN
    RAISE EXCEPTION 'Invalid review status';
  END IF;
  IF p_billing_cycle NOT IN ('monthly','yearly') THEN
    RAISE EXCEPTION 'Invalid billing cycle';
  END IF;
  IF p_status IN ('rejected','needs_info') AND NULLIF(trim(COALESCE(p_review_notes,'')), '') IS NULL THEN
    RAISE EXCEPTION 'Review notes are required for this decision';
  END IF;

  SELECT * INTO v_app FROM public.store_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF v_app.status IN ('approved','rejected') AND v_app.status <> p_status THEN
    RAISE EXCEPTION 'A completed decision cannot be changed from this queue';
  END IF;

  SELECT * INTO v_package FROM public.store_packages WHERE slug = p_package_slug;
  IF NOT FOUND THEN RAISE EXCEPTION 'Selected package not found'; END IF;

  UPDATE public.store_applications SET
    requested_package_slug = v_package.slug,
    requested_package_id = v_package.id,
    billing_cycle = p_billing_cycle,
    review_notes = NULLIF(trim(COALESCE(p_review_notes,'')), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_application_id;

  IF p_status = 'approved' THEN
    IF v_app.linked_store_id IS NULL THEN
      SELECT count(*) INTO v_conflict_count FROM public.stores s
      WHERE lower(COALESCE(s.email,'')) = lower(COALESCE(v_app.email,''))
         OR lower(s.name) = lower(v_app.store_name);

      SELECT s.id INTO v_exact_store_id FROM public.stores s
      WHERE lower(COALESCE(s.email,'')) = lower(COALESCE(v_app.email,''))
        AND lower(s.name) = lower(v_app.store_name)
      ORDER BY s.created_at LIMIT 1;

      IF v_conflict_count > 0 AND v_exact_store_id IS NULL THEN
        RAISE EXCEPTION 'Possible duplicate store: name or email already exists. Resolve the conflict before approval.';
      END IF;
      IF v_exact_store_id IS NOT NULL THEN
        UPDATE public.store_applications SET linked_store_id = v_exact_store_id WHERE id = p_application_id;
      END IF;
    END IF;

    v_store_id := public.approve_store_application(p_application_id);

    SELECT COALESCE(v_app.user_id, au.id) INTO v_owner_id
    FROM auth.users au
    WHERE au.id = v_app.user_id OR lower(au.email) = lower(v_app.email)
    ORDER BY CASE WHEN au.id = v_app.user_id THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_owner_id IS NOT NULL THEN
      UPDATE public.stores SET owner_id = v_owner_id, owner_user_id = v_owner_id, updated_at = now() WHERE id = v_store_id;
      INSERT INTO public.user_roles(user_id, role) VALUES (v_owner_id, 'storeadmin') ON CONFLICT DO NOTHING;
      INSERT INTO public.store_admins(store_id, user_id, role, status)
      VALUES (v_store_id, v_owner_id, 'admin', 'active')
      ON CONFLICT (store_id, user_id) DO UPDATE SET role='admin', status='active';
    END IF;

    IF v_package.price > 0 THEN
      UPDATE public.stores SET
        public_status = 'draft',
        package_slug = 'free',
        subscription_status = 'pending_payment',
        updated_at = now()
      WHERE id = v_store_id;
    END IF;

    UPDATE public.store_applications SET status='approved', linked_store_id=v_store_id,
      review_notes=NULLIF(trim(COALESCE(p_review_notes,'')), ''), reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
    WHERE id=p_application_id;
  ELSE
    UPDATE public.store_applications SET status=p_status WHERE id=p_application_id;
  END IF;

  INSERT INTO public.audit_logs(actor_id, actor_role, action, module, target_id, new_data)
  VALUES (auth.uid(), 'admin', 'store_application.' || p_status, 'stores', COALESCE(v_store_id, p_application_id),
    jsonb_build_object('application_id',p_application_id,'status',p_status,'package',v_package.slug,'billing_cycle',p_billing_cycle,'review_notes',p_review_notes,'owner_linked',v_owner_id IS NOT NULL));

  RETURN jsonb_build_object('application_id',p_application_id,'status',p_status,'store_id',v_store_id,
    'payment_required',v_package.price > 0,'owner_linked',v_owner_id IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.review_store_application(uuid,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_store_application(uuid,text,text,text,text) TO authenticated;
