-- Tamrakar Support privacy policy:
-- answer product/service questions without exposing individual shop identity or contact data.

UPDATE public.chatbot_config
SET
  welcome_message = 'Namaste! Tell me what you need help with: product price, availability, exchange, repair, warranty, or order support.',
  require_contact = false,
  auto_create_customer = false,
  show_store_contacts = false,
  fallback_message = 'I could not find an exact answer. Please share the product model or service you need, and Tamrakar Support will guide you to the correct next step.',
  training_prompt = 'Answer customer questions using TamrakarComplex.com product, price, repair, exchange and official content data. Keep answers short, helpful and truthful. Never reveal individual shop names, shop details, phone numbers, WhatsApp numbers, or private contact information.',
  business_info = COALESCE(business_info, '{}'::jsonb) - 'phone',
  updated_at = now();

UPDATE public.chatbot_training_items
SET
  answer = 'For privacy and safety, Tamrakar Support does not show individual shop details or phone numbers in chat. I can still help with products, prices, repair, exchange, warranty, and the correct request flow.',
  updated_at = now()
WHERE
  category ILIKE ANY (ARRAY['%store%', '%contact%', '%shop%'])
  OR question ILIKE ANY (ARRAY['%shop%', '%store%', '%contact%', '%whatsapp%', '%phone number%', '%contact number%']);

UPDATE public.chatbot_training_items
SET
  answer = regexp_replace(
    answer,
    '(?:\+?[[:space:]]*977[-[:space:]]?)?(?:0?1[-[:space:]]?[0-9]{6,8}|9[678][0-9]{8})',
    '[contact hidden]',
    'g'
  ),
  updated_at = now()
WHERE answer ~ '(?:\+?[[:space:]]*977[-[:space:]]?)?(?:0?1[-[:space:]]?[0-9]{6,8}|9[678][0-9]{8})';

DO $$
BEGIN
  IF to_regprocedure('public.chatbot_answer_private_core(text,jsonb,uuid,text)') IS NULL
     AND to_regprocedure('public.chatbot_answer(text,jsonb,uuid,text)') IS NOT NULL THEN
    ALTER FUNCTION public.chatbot_answer(text, jsonb, uuid, text)
      RENAME TO chatbot_answer_private_core;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.chatbot_answer(
  p_question text,
  p_customer jsonb DEFAULT '{}'::jsonb,
  p_session_id uuid DEFAULT NULL,
  p_source_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_payload jsonb;
  v_answer text;
  v_intent text;
  v_safe_offers jsonb;
BEGIN
  -- The private core receives no phone value, even if an older client sends one.
  v_payload := public.chatbot_answer_private_core(
    p_question,
    COALESCE(p_customer, '{}'::jsonb) - 'phone',
    p_session_id,
    p_source_url
  );

  IF NOT COALESCE((v_payload->>'ok')::boolean, false) THEN
    RETURN v_payload;
  END IF;

  v_intent := COALESCE(v_payload->>'intent', 'general');

  SELECT COALESCE(
    jsonb_agg(
      item - ARRAY[
        'store_name', 'store_phone', 'store_location',
        'shop_name', 'shop_phone', 'shop_location',
        'phone', 'location', 'contact', 'whatsapp'
      ]
    ),
    '[]'::jsonb
  )
  INTO v_safe_offers
  FROM jsonb_array_elements(COALESCE(v_payload->'store_offers', '[]'::jsonb)) AS item;

  IF v_intent = 'store_contact' THEN
    v_answer := 'For privacy and safety, Tamrakar Support does not show individual shop details or phone numbers in chat. I can still help with products, prices, repair, exchange, warranty, and the correct request flow.';
  ELSE
    v_answer := regexp_replace(
      COALESCE(v_payload->>'answer', ''),
      '(?:\+?[[:space:]]*977[-[:space:]]?)?(?:0?1[-[:space:]]?[0-9]{6,8}|9[678][0-9]{8})',
      '[contact hidden]',
      'g'
    );
  END IF;

  v_payload := v_payload
    || jsonb_build_object(
      'answer', v_answer,
      'stores', '[]'::jsonb,
      'store_offers', v_safe_offers,
      'training', '[]'::jsonb
    );

  UPDATE public.chatbot_sessions
  SET last_answer = v_answer
  WHERE id = NULLIF(v_payload->>'session_id', '')::uuid;

  UPDATE public.chatbot_messages
  SET message = v_answer, answer_payload = v_payload
  WHERE id = (
    SELECT id
    FROM public.chatbot_messages
    WHERE session_id = NULLIF(v_payload->>'session_id', '')::uuid
      AND sender = 'bot'
    ORDER BY created_at DESC
    LIMIT 1
  );

  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.chatbot_answer_private_core(text, jsonb, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chatbot_answer(text, jsonb, uuid, text) TO anon, authenticated;
