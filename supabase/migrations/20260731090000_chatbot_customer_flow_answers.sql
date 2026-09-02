-- High-priority intent answers prevent broad legacy keywords from selecting an
-- unrelated device/service answer.
DELETE FROM public.chatbot_training_items
WHERE question IN (
  'exchange my device',
  'repair cracked screen',
  'warranty inquiry'
);

INSERT INTO public.chatbot_training_items
  (question, answer, category, keywords, priority, is_active)
VALUES
  (
    'exchange my device',
    'For exchange, share the brand, exact model, storage, age, physical condition, screen and battery condition, warranty status, and available accessories. Tamrakar Support will use these details to guide the valuation and next step.',
    'exchange',
    ARRAY['exchange my', 'trade in', 'old device exchange'],
    1,
    true
  ),
  (
    'repair cracked screen',
    'For a cracked screen, share the device brand, exact model, whether touch and display still work, and whether the frame or back is also damaged. Tamrakar Support will guide the repair-request and diagnosis flow without exposing individual shop details.',
    'repair',
    ARRAY['cracked screen', 'screen repair', 'broken display'],
    1,
    true
  ),
  (
    'warranty inquiry',
    'Please share the product brand, exact model, purchase date, invoice availability, and the problem. Warranty eligibility depends on the seller or manufacturer terms and inspection; Tamrakar Support will guide the correct claim or repair-request flow.',
    'warranty',
    ARRAY['warranty', 'guarantee', 'warranty claim'],
    1,
    true
  );
