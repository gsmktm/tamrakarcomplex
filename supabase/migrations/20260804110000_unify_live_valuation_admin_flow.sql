-- Align the super-admin pricing screen with the catalog_products IDs used by
-- /sell-your-phone and close legacy valuation policy drift.

ALTER TABLE public.valuation_rules
  ADD COLUMN IF NOT EXISTS catalog_product_id uuid REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS valuation_rules_catalog_product_id_unique
  ON public.valuation_rules (catalog_product_id);

ALTER TABLE public.valuation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view valuation rules" ON public.valuation_rules;
DROP POLICY IF EXISTS "Admins can manage valuation rules" ON public.valuation_rules;
DROP POLICY IF EXISTS "Staff and super admin manage valuation rules" ON public.valuation_rules;
DROP POLICY IF EXISTS "Public read valuation_rules" ON public.valuation_rules;
DROP POLICY IF EXISTS "Suadmin write valuation_rules" ON public.valuation_rules;

CREATE POLICY "Valuation rules readable"
  ON public.valuation_rules FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "Platform admins manage valuation rules"
  ON public.valuation_rules FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.is_staff_admin())
  WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

GRANT SELECT ON public.valuation_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.valuation_rules TO authenticated;

ALTER TABLE public.sell_phone_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff and super admin manage all leads" ON public.sell_phone_leads;
CREATE POLICY "Platform admins manage all valuation leads"
  ON public.sell_phone_leads FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.is_staff_admin())
  WITH CHECK (public.is_super_admin() OR public.is_staff_admin());

DROP POLICY IF EXISTS "Store admins view assigned leads" ON public.sell_phone_leads;
CREATE POLICY "Store teams manage assigned valuation leads"
  ON public.sell_phone_leads FOR ALL TO authenticated
  USING (
    assigned_store_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.stores s WHERE s.id = assigned_store_id AND (s.owner_id = auth.uid() OR s.owner_user_id = auth.uid()))
      OR EXISTS (SELECT 1 FROM public.store_admins sa WHERE sa.store_id = assigned_store_id AND sa.user_id = auth.uid() AND sa.status = 'active')
      OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = assigned_store_id AND ss.user_id = auth.uid() AND ss.status = 'active')
    )
  )
  WITH CHECK (
    assigned_store_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.stores s WHERE s.id = assigned_store_id AND (s.owner_id = auth.uid() OR s.owner_user_id = auth.uid()))
      OR EXISTS (SELECT 1 FROM public.store_admins sa WHERE sa.store_id = assigned_store_id AND sa.user_id = auth.uid() AND sa.status = 'active')
      OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = assigned_store_id AND ss.user_id = auth.uid() AND ss.status = 'active')
    )
  );
