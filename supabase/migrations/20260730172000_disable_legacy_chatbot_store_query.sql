-- The hosted store_products schema predates optional offer columns used by the
-- legacy chatbot core. Product and official-price sources remain enabled.
UPDATE public.chatbot_config
SET
  sources_enabled = jsonb_set(
    COALESCE(sources_enabled, '{}'::jsonb),
    '{store_offers}',
    'false'::jsonb,
    true
  ),
  updated_at = now();
