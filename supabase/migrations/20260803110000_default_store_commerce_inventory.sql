-- Default commerce provisioning for every store. Canonical phone prices remain
-- in phone_models/phone_variants/phone_variant_prices; stores receive a small,
-- editable starter inventory without overwriting merchant-managed rows.
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS is_default_inventory boolean NOT NULL DEFAULT false;
ALTER TABLE public.store_accessories ADD COLUMN IF NOT EXISTS is_default_inventory boolean NOT NULL DEFAULT false;
ALTER TABLE public.store_repair_services ADD COLUMN IF NOT EXISTS is_default_service boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_store_default_catalog_variant
  ON public.store_products(store_id, model_id, variant) WHERE is_default_inventory;
CREATE UNIQUE INDEX IF NOT EXISTS uq_store_default_accessory_slug
  ON public.store_accessories(store_id, slug) WHERE is_default_inventory;
CREATE UNIQUE INDEX IF NOT EXISTS uq_store_default_service_name
  ON public.store_repair_services(store_id, service_name) WHERE is_default_service;

CREATE OR REPLACE FUNCTION public.provision_store_default_commerce(p_store_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_products integer:=0; v_accessories integer:=0; v_services integer:=0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id=p_store_id) THEN RAISE EXCEPTION 'store_not_found'; END IF;
  IF auth.uid() IS NOT NULL AND NOT (
    public.is_super_admin() OR public.has_role(auth.uid(),'staffadmin')
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id=p_store_id AND (s.owner_id=auth.uid() OR s.owner_user_id=auth.uid()))
    OR EXISTS (SELECT 1 FROM public.store_admins sa WHERE sa.store_id=p_store_id AND sa.user_id=auth.uid() AND COALESCE(sa.status,'active')='active')
  ) THEN RAISE EXCEPTION 'access_denied'; END IF;

  WITH current_phones AS (
    SELECT pm.id model_id, b.name brand, pm.name model, pv.id variant_id,
      concat_ws(' + ',pv.ram,pv.storage) variant_label, pv.storage,
      COALESCE(pvp.sale_price,pvp.regular_price) current_price,
      pvp.regular_price,
      row_number() OVER (ORDER BY
        CASE b.slug WHEN 'samsung' THEN 1 WHEN 'apple' THEN 2 WHEN 'xiaomi' THEN 3 WHEN 'vivo' THEN 4 ELSE 5 END,
        COALESCE(pvp.sale_price,pvp.regular_price), pm.name, pv.storage) rank
    FROM public.phone_models pm
    JOIN public.brands b ON b.id=pm.brand_id
    JOIN public.phone_variants pv ON pv.model_id=pm.id AND pv.status='active' AND pv.condition_type='new'
    JOIN public.phone_variant_prices pvp ON pvp.variant_id=pv.id AND pvp.is_default=true AND pvp.stock_status='in_stock'
    WHERE pm.status='active' AND COALESCE(pvp.sale_price,pvp.regular_price)>0
  )
  INSERT INTO public.store_products(store_id,product_type,model_id,title,slug,brand,model,variant,condition,storage,
    price,discount_price,price_mrp,price_sale,stock_quantity,stock,images,status,description,is_default_inventory)
  SELECT p_store_id,'new_phone',c.model_id,concat(c.brand,' ',c.model,' (',c.variant_label,')'),
    concat('default-',regexp_replace(lower(c.brand||'-'||c.model||'-'||c.variant_label),'[^a-z0-9]+','-','g')),
    c.brand,c.model,to_jsonb(c.variant_label),'new',c.storage,c.current_price,
    CASE WHEN c.regular_price>c.current_price THEN c.current_price END,c.regular_price,c.current_price,1,1,'[]'::jsonb,'active',
    'Current Nepal buying-price reference. Confirm color, warranty, final price and stock with the store.',true
  FROM current_phones c WHERE c.rank<=5
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_products=ROW_COUNT;

  INSERT INTO public.store_accessories(store_id,title,slug,category,brand,price,stock_quantity,images,description,status,is_default_inventory)
  SELECT p_store_id,x.title,x.slug,x.category,x.brand,x.price,5,'[]'::jsonb,x.description,'active',true FROM (VALUES
    ('20W USB-C Fast Charger','default-20w-usb-c-fast-charger','Chargers','Universal',1999,'Fast charging adapter; confirm cable and device compatibility.'),
    ('USB-C Fast Charging Cable','default-usb-c-fast-charging-cable','Cables','Universal',799,'Durable charging and data cable.'),
    ('Tempered Glass Installation','default-tempered-glass','Protection','Universal',499,'Screen protector with in-store installation.'),
    ('Protective Phone Case','default-protective-phone-case','Cases','Universal',999,'Model-specific case; confirm fit and color with the shop.')
  ) AS x(title,slug,category,brand,price,description) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_accessories=ROW_COUNT;

  INSERT INTO public.store_repair_services(store_id,service_name,device_type,estimated_price,estimated_time,description,status,is_default_service)
  SELECT p_store_id,x.name,x.device_type,x.price,x.duration,x.description,'active',true FROM (VALUES
    ('Device diagnostic assessment','Smartphone Repair',500::numeric,'30–60 minutes','Hardware and software inspection; final quote is confirmed before repair.'),
    ('Screen replacement assessment','Smartphone Repair',NULL::numeric,'Same day estimate','Model, part quality and warranty determine the final price.'),
    ('Battery replacement assessment','Smartphone Repair',NULL::numeric,'Same day estimate','Battery health check and model-specific replacement quote.'),
    ('Charging and audio diagnosis','Smartphone Repair',NULL::numeric,'1–2 hours','Charging port, speaker and microphone inspection.'),
    ('Legal carrier unlock assessment','Network Unlocking',NULL::numeric,'1–3 business days','Eligibility-based carrier unlock only; ownership and carrier requirements apply.'),
    ('Account and activation-lock guidance','Unlocking Guidance',NULL::numeric,'By assessment','Official account-recovery guidance only. No security bypass or unlawful IMEI modification.')
  ) AS x(name,device_type,price,duration,description) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_services=ROW_COUNT;
  RETURN jsonb_build_object('store_id',p_store_id,'products_added',v_products,'accessories_added',v_accessories,'services_added',v_services);
END; $$;

REVOKE ALL ON FUNCTION public.provision_store_default_commerce(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_store_default_commerce(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.provision_new_store_default_commerce()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.provision_store_default_commerce(NEW.id); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_provision_new_store_default_commerce ON public.stores;
CREATE TRIGGER trg_provision_new_store_default_commerce AFTER INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.provision_new_store_default_commerce();

DO $$ DECLARE s record; BEGIN
  FOR s IN SELECT id FROM public.stores WHERE COALESCE(is_active,true) LOOP
    PERFORM public.provision_store_default_commerce(s.id);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.provision_store_default_commerce(uuid) IS
  'Idempotently provisions package-safe default phones, accessories, repair and lawful unlock assessments for a store.';
