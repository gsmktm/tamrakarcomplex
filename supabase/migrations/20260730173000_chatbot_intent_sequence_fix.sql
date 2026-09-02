-- Restore the answer sequence for product/price questions. A legacy keyword
-- such as "phone" must not turn "iPhone price" into a shop-contact response.
UPDATE public.chatbot_training_items
SET is_active = false, updated_at = now()
WHERE answer LIKE 'For privacy and safety, Tamrakar Support does not show individual shop details%'
  AND category NOT ILIKE ALL (ARRAY['%store%', '%contact%', '%shop%'])
  AND question NOT ILIKE ANY (
    ARRAY['%shop%', '%store%', '%contact%', '%whatsapp%', '%phone number%', '%contact number%']
  );

DO $$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.chatbot_answer(text,jsonb,uuid,text)'::regprocedure
  )
  INTO v_definition;

  IF v_definition NOT LIKE '%Please share the exact brand, model, storage, and condition%' THEN
    v_definition := replace(
      v_definition,
      E'  ELSE\n    v_answer := regexp_replace(',
      E'  ELSIF COALESCE(v_payload->>''answer'', '''') LIKE ''For privacy and safety, Tamrakar Support does not show individual shop details%'' THEN\n    v_answer := ''Please share the exact brand, model, storage, and condition. I can then check the available price information and guide the next step.'';\n  ELSE\n    v_answer := regexp_replace('
    );
    EXECUTE v_definition;
  END IF;
END
$$;
