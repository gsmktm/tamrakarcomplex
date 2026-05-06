
-- Update subscription packages with new pricing and detailed features
-- Pricing: Silver (4999/mo, 39999/yr), Gold (9999/mo, 99999/yr), Diamond (17999/mo, 149000/yr)

-- 1. Update Silver Package
UPDATE public.packages
SET 
  monthly_price = 4999,
  yearly_price = 39999,
  features_json = '[
    "Full Profile Listing",
    "Phone & Email Display",
    "Website Link",
    "Service Listing",
    "Basic Priority Placement",
    "Dedicated Store Page"
  ]'::jsonb,
  product_limit = 200,
  admin_limit = 2,
  branch_limit = 1
WHERE slug = 'silver';

-- 2. Update Gold Package
UPDATE public.packages
SET 
  monthly_price = 9999,
  yearly_price = 99999,
  features_json = '[
    "All Silver Features",
    "Verified Badge",
    "Enhanced Priority Placement",
    "Advanced Analytics",
    "Bulk Product Import",
    "Social Media Integration"
  ]'::jsonb,
  product_limit = 2000,
  admin_limit = 5,
  branch_limit = 3,
  promo_slot_limit = 2
WHERE slug = 'gold';

-- 3. Update Diamond Package
UPDATE public.packages
SET 
  monthly_price = 17999,
  yearly_price = 149000,
  features_json = '[
    "All Gold Features",
    "Maximum Priority Placement",
    "API Access for Inventory",
    "Branded Store Theme",
    "Priority Support",
    "Homepage Campaign Participation"
  ]'::jsonb,
  product_limit = 20000,
  admin_limit = 20,
  branch_limit = 10,
  promo_slot_limit = 5
WHERE slug = 'diamond';

-- 4. Ensure RLS is still correct (using the new helper functions if possible)
DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;
CREATE POLICY "Admins can manage packages"
  ON public.packages FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
