-- Fix duplicate slug: suffix second store with -2
UPDATE public.stores
SET slug = 'ezone-mobile-2', seo_slug = 'ezone-mobile-2'
WHERE id = 'afaf2fc1-89cb-4a09-8b97-43cbab816642';

-- store_accessories: add owner manage policy
DROP POLICY IF EXISTS "Store owners manage accessories" ON public.store_accessories;
CREATE POLICY "Store owners manage accessories"
  ON public.store_accessories FOR ALL
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE store_id = store_accessories.store_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

-- store_repair_services: add owner manage policy  
DROP POLICY IF EXISTS "Store owners manage repair services" ON public.store_repair_services;
CREATE POLICY "Store owners manage repair services"
  ON public.store_repair_services FOR ALL
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE store_id = store_repair_services.store_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );
