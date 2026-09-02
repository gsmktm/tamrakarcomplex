-- Public store applications need a returned reference without granting public
-- SELECT access to applicant data. The SECURITY DEFINER function exposes only
-- the newly generated UUID and fixes the insert-then-select RLS failure mode.

ALTER TABLE public.store_applications
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS viber text;

CREATE OR REPLACE FUNCTION public.submit_store_application(
  p_owner_name text,
  p_store_name text,
  p_phone text,
  p_email text,
  p_location text,
  p_shop_number text DEFAULT NULL,
  p_business_type text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_license_url text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL,
  p_viber text DEFAULT NULL,
  p_requested_package_slug text DEFAULT 'free',
  p_billing_cycle text DEFAULT 'monthly'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF length(trim(COALESCE(p_owner_name, ''))) < 2 OR length(p_owner_name) > 120 THEN
    RAISE EXCEPTION 'A valid owner name is required';
  END IF;
  IF length(trim(COALESCE(p_store_name, ''))) < 2 OR length(p_store_name) > 120 THEN
    RAISE EXCEPTION 'A valid store name is required';
  END IF;
  IF p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'A valid email address is required';
  END IF;
  IF regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g') !~ '^(977)?9[678][0-9]{8}$' THEN
    RAISE EXCEPTION 'A valid Nepal mobile number is required';
  END IF;
  IF p_billing_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid billing cycle';
  END IF;

  INSERT INTO public.store_applications (
    user_id, owner_name, store_name, phone, email, location, shop_number,
    business_type, message, logo_url, license_url, whatsapp, viber,
    requested_package_slug, billing_cycle, status
  ) VALUES (
    auth.uid(), trim(p_owner_name), trim(p_store_name), trim(p_phone), lower(trim(p_email)),
    left(trim(COALESCE(p_location, '')), 200), NULLIF(left(trim(COALESCE(p_shop_number, '')), 80), ''),
    NULLIF(left(trim(COALESCE(p_business_type, '')), 120), ''), NULLIF(left(trim(COALESCE(p_message, '')), 3000), ''),
    NULLIF(left(trim(COALESCE(p_logo_url, '')), 500), ''), NULLIF(left(trim(COALESCE(p_license_url, '')), 500), ''),
    NULLIF(left(trim(COALESCE(p_whatsapp, '')), 32), ''), NULLIF(left(trim(COALESCE(p_viber, '')), 32), ''),
    left(COALESCE(NULLIF(trim(p_requested_package_slug), ''), 'free'), 80), p_billing_cycle, 'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_store_application(text,text,text,text,text,text,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_store_application(text,text,text,text,text,text,text,text,text,text,text,text,text,text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Return only safe booking identifiers. This avoids granting anonymous users
-- SELECT access to repair rows merely so the UI can display a tracking code.
CREATE OR REPLACE FUNCTION public.submit_repair_request(
  p_name text,
  p_phone text,
  p_email text,
  p_device_brand text,
  p_device_model text,
  p_issue_type text,
  p_description text DEFAULT NULL,
  p_assigned_store_id uuid DEFAULT NULL,
  p_images jsonb DEFAULT '[]'::jsonb,
  p_preferred_date date DEFAULT NULL,
  p_guide_id uuid DEFAULT NULL,
  p_device_id uuid DEFAULT NULL,
  p_repair_pricing_id uuid DEFAULT NULL,
  p_part_quality text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_request public.repair_requests%ROWTYPE;
BEGIN
  IF length(trim(COALESCE(p_name, ''))) < 2 OR length(p_name) > 120 THEN
    RAISE EXCEPTION 'A valid customer name is required';
  END IF;
  IF regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g') !~ '^(977)?9[678][0-9]{8}$' THEN
    RAISE EXCEPTION 'A valid Nepal mobile number is required';
  END IF;
  IF NULLIF(trim(COALESCE(p_email, '')), '') IS NOT NULL
     AND p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'A valid email address is required';
  END IF;

  INSERT INTO public.repair_requests (
    user_id, assigned_store_id, name, phone, email, device_brand,
    device_model, issue_type, description, images, preferred_date,
    guide_id, device_id, repair_pricing_id, part_quality, status
  ) VALUES (
    auth.uid(), p_assigned_store_id, left(trim(p_name), 120), trim(p_phone),
    NULLIF(lower(trim(COALESCE(p_email, ''))), ''), left(trim(p_device_brand), 80),
    left(trim(p_device_model), 120), left(trim(p_issue_type), 80),
    NULLIF(left(trim(COALESCE(p_description, '')), 3000), ''), COALESCE(p_images, '[]'::jsonb),
    p_preferred_date, p_guide_id, p_device_id, p_repair_pricing_id, p_part_quality, 'new'
  ) RETURNING * INTO v_request;

  RETURN jsonb_build_object(
    'id', v_request.id,
    'tracking_id', v_request.tracking_id,
    'status', v_request.status,
    'created_at', v_request.created_at,
    'updated_at', v_request.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_repair_request(text,text,text,text,text,text,text,uuid,jsonb,date,uuid,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_repair_request(text,text,text,text,text,text,text,uuid,jsonb,date,uuid,uuid,uuid,text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
