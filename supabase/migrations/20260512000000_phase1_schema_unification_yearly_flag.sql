-- Phase 1: Schema unification & yearly flag (additive only)
-- Adds billing_cycle to store_subscriptions, new package columns for chatbot/marketplace,
-- free package seed, and year-aware featured logic support.

-- 1) Add billing_cycle to store_subscriptions (monthly/yearly tracking for featured eligibility)
ALTER TABLE public.store_subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly' 
    CHECK (billing_cycle IN ('monthly', 'yearly'));

-- 2) Add new columns to packages table for chatbot tier and marketplace listing limits
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS chatbot_reply_level text DEFAULT 'basic'
    CHECK (chatbot_reply_level IN ('basic', 'standard', 'priority', 'premium'));

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS marketplace_listing_limit integer DEFAULT 0;

-- 3) Seed the 'free' package (currently missing from packages table seed)
INSERT INTO public.packages (
  name, slug, description, monthly_price, yearly_price, 
  product_limit, admin_limit, branch_limit, promo_slot_limit, 
  features_json, is_active, sort_order,
  chatbot_reply_level, marketplace_listing_limit
)
VALUES (
  'Free Store', 
  'free',
  'Free store listing with limited features',
  0, 0,
  5, 1, 1, 0,
  '["Store profile", "Phone display", "Email display"]'::jsonb,
  true,
  0,
  'basic',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  chatbot_reply_level = 'basic',
  marketplace_listing_limit = 0;

-- 4) Update existing package chatbot tiers and marketplace limits (based on spec)
UPDATE public.packages SET chatbot_reply_level = 'standard', marketplace_listing_limit = 20 WHERE slug = 'silver';
UPDATE public.packages SET chatbot_reply_level = 'priority', marketplace_listing_limit = 200 WHERE slug = 'gold';
UPDATE public.packages SET chatbot_reply_level = 'premium', marketplace_listing_limit = 2000 WHERE slug = 'diamond';

-- 5) Create SQL helper function to check if a store subscription is yearly
CREATE OR REPLACE FUNCTION public.is_yearly_subscription(p_store_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE((
    SELECT (billing_cycle = 'yearly')
    FROM public.store_subscriptions
    WHERE store_id = p_store_id
    LIMIT 1
  ), false);
END;
$$ LANGUAGE plpgsql STABLE;

-- 6) Add comment documenting the new yearly featured logic requirement
COMMENT ON COLUMN public.store_subscriptions.billing_cycle 
  IS 'Billing cycle (monthly/yearly) — yearly subscriptions unlock featured placement regardless of package tier';

COMMENT ON COLUMN public.packages.chatbot_reply_level 
  IS 'Chatbot tier: basic (FAQ only), standard (FAQ+products), priority (standard+leads), premium (priority+human handoff)';

COMMENT ON COLUMN public.packages.marketplace_listing_limit 
  IS 'Maximum marketplace listings per store per month; 0 = no marketplace access';
