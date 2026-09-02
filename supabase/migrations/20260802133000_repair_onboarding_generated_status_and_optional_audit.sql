-- Adapt lifecycle functions to the linked schema where stores.status is generated
-- and audit_logs is optional.
DO $$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.approve_store_application(uuid)'::regprocedure) INTO v_definition;
  v_definition := replace(v_definition,
    'description, logo_url, is_verified, status, public_status, package_id,',
    'description, logo_url, is_verified, public_status, package_id,');
  v_definition := replace(v_definition,
    'true, ''active'', ''published'', v_package.id,',
    'true, ''published'', v_package.id,');
  v_definition := replace(v_definition,
    E'INSERT INTO public.audit_logs(actor_id, actor_role, action, module, target_id, new_data)\n  VALUES (auth.uid(), ''admin'', ''store_application.approved'', ''stores'', v_store_id,\n    jsonb_build_object(''application_id'', p_application_id, ''package'', v_package.slug,\n      ''billing_cycle'', v_app.billing_cycle, ''payment_required'', v_package.price > 0));',
    E'IF to_regclass(''public.audit_logs'') IS NOT NULL THEN\n    EXECUTE ''INSERT INTO public.audit_logs(actor_id, actor_role, action, module, target_id, new_data) VALUES ($1,$2,$3,$4,$5,$6)'' USING auth.uid(), ''admin'', ''store_application.approved'', ''stores'', v_store_id, jsonb_build_object(''application_id'', p_application_id, ''package'', v_package.slug, ''billing_cycle'', v_app.billing_cycle, ''payment_required'', v_package.price > 0);\n  END IF;');
  EXECUTE v_definition;

  SELECT pg_get_functiondef('public.verify_store_subscription_payment(uuid)'::regprocedure) INTO v_definition;
  v_definition := replace(v_definition,
    E'INSERT INTO public.audit_logs(actor_id, actor_role, action, module, target_id, new_data)\n  VALUES(auth.uid(),''admin'',''subscription.payment_verified'',''subscriptions'',v_payment.store_id,\n    jsonb_build_object(''payment_id'',p_payment_id,''amount'',v_payment.amount,''days'',v_days));',
    E'IF to_regclass(''public.audit_logs'') IS NOT NULL THEN\n    EXECUTE ''INSERT INTO public.audit_logs(actor_id, actor_role, action, module, target_id, new_data) VALUES ($1,$2,$3,$4,$5,$6)'' USING auth.uid(), ''admin'', ''subscription.payment_verified'', ''subscriptions'', v_payment.store_id, jsonb_build_object(''payment_id'',p_payment_id,''amount'',v_payment.amount,''days'',v_days);\n  END IF;');
  EXECUTE v_definition;
END;
$$;
