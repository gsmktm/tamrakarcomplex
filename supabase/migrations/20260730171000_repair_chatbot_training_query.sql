-- Repair an older chatbot core definition that orders its training subquery by
-- updated_at without projecting that column.
DO $$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.chatbot_answer_private_core(text,jsonb,uuid,text)'::regprocedure
  )
  INTO v_definition;

  IF v_definition NOT LIKE '%SELECT id, question, answer, category, keywords, priority, updated_at%' THEN
    v_definition := replace(
      v_definition,
      'SELECT id, question, answer, category, keywords, priority',
      'SELECT id, question, answer, category, keywords, priority, updated_at'
    );
    EXECUTE v_definition;
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.chatbot_answer_private_core(text, jsonb, uuid, text) FROM PUBLIC, anon, authenticated;
