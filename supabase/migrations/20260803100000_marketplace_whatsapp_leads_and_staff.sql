-- Product-aware WhatsApp intent tracking and store-staff marketplace access.
CREATE OR REPLACE FUNCTION public.record_marketplace_whatsapp_intent(
  p_store_id uuid,
  p_item_id uuid,
  p_item_title text,
  p_item_price numeric,
  p_source_page text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_name text;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id=p_store_id AND COALESCE(is_active,true)) THEN
    RAISE EXCEPTION 'store_not_available';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.store_products WHERE id=p_item_id AND store_id=p_store_id AND status='active'
    UNION ALL
    SELECT 1 FROM public.sell_listings WHERE id=p_item_id AND store_id=p_store_id AND status='active'
  ) THEN RAISE EXCEPTION 'listing_not_available'; END IF;

  SELECT COALESCE(NULLIF(display_name,''),'Marketplace buyer') INTO v_name
  FROM public.profiles WHERE user_id=auth.uid() OR id=auth.uid() LIMIT 1;
  INSERT INTO public.store_leads(store_id,lead_type,customer_name,customer_email,message,status,source_page)
  VALUES (p_store_id,'marketplace_whatsapp',COALESCE(v_name,'Marketplace buyer'),v_email,
    concat('WhatsApp purchase intent: ',left(p_item_title,180),' · NPR ',p_item_price,' · Listing ',p_item_id),
    'new',left(COALESCE(p_source_page,'/marketplace'),500)) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.record_marketplace_whatsapp_intent(uuid,uuid,text,numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_marketplace_whatsapp_intent(uuid,uuid,text,numeric,text) TO authenticated;

-- Store staff need the same scoped operational visibility as store admins.
DROP POLICY IF EXISTS "Store staff view own store leads" ON public.store_leads;
CREATE POLICY "Store staff view own store leads" ON public.store_leads FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id=store_leads.store_id AND ss.user_id=auth.uid() AND COALESCE(ss.status,'active')='active'));
DROP POLICY IF EXISTS "Store staff update own store leads" ON public.store_leads;
CREATE POLICY "Store staff update own store leads" ON public.store_leads FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id=store_leads.store_id AND ss.user_id=auth.uid() AND COALESCE(ss.status,'active')='active'))
WITH CHECK (EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id=store_leads.store_id AND ss.user_id=auth.uid() AND COALESCE(ss.status,'active')='active'));
