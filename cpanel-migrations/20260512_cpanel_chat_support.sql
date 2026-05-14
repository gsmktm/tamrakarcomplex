-- cPanel PostgreSQL compatible chat support schema.
-- Run this inside cPanel Terminal where PostgreSQL is available on /var/run/postgresql:5432.
--
-- This creates the chat support tables/RPC and minimal compatibility objects
-- normally provided by Supabase. It is meant for a plain PostgreSQL database.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULL::uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT true;
$$;

CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT true;
$$;

CREATE TABLE IF NOT EXISTS public.chatbot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  welcome_message text DEFAULT 'Hello! How can I help you today?',
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  brand text,
  price text,
  price_value numeric,
  description text,
  in_stock boolean DEFAULT true,
  featured boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chatbot_config
  ADD COLUMN IF NOT EXISTS support_name text DEFAULT 'Tamrakar Support',
  ADD COLUMN IF NOT EXISTS allow_anonymous boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_contact boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_create_customer boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_store_contacts boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sources_enabled jsonb DEFAULT '{"products":true,"articles":true,"guides":true,"content_pages":true,"device_catalog":true,"official_prices":true,"store_offers":true,"training":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS fallback_message text DEFAULT 'I could not find an exact answer. Please share your phone number and our support team will contact you.',
  ADD COLUMN IF NOT EXISTS training_prompt text DEFAULT 'Answer customer questions using TamrakarComplex.com product, price, store, repair, exchange and official content data. Keep answers short, helpful and truthful. If the answer is not available, collect customer contact and create a support request.',
  ADD COLUMN IF NOT EXISTS business_info jsonb DEFAULT '{"phone":"+9779851091542","email":"support@tamrakarcomplex.com","location":"Tamrakar Complex, New Road, Kathmandu","hours":"10 AM - 7 PM"}'::jsonb;

INSERT INTO public.chatbot_config (
  welcome_message,
  is_active,
  support_name,
  allow_anonymous,
  require_contact,
  auto_create_customer,
  show_store_contacts,
  sources_enabled,
  fallback_message,
  training_prompt,
  business_info
)
SELECT
  'Namaste! Ask me about mobile price, product availability, exchange, repair, store contact or order support.',
  true,
  'Tamrakar Support',
  true,
  true,
  true,
  true,
  '{"products":true,"articles":true,"guides":true,"content_pages":true,"device_catalog":true,"official_prices":true,"store_offers":true,"training":true}'::jsonb,
  'I could not find an exact answer. Please share your phone number and our support team will contact you.',
  'Answer customer questions using TamrakarComplex.com product, price, store, repair, exchange and official content data. Keep answers short, helpful and truthful. If the answer is not available, collect customer contact and create a support request.',
  '{"phone":"+9779851091542","email":"support@tamrakarcomplex.com","location":"Tamrakar Complex, New Road, Kathmandu","hours":"10 AM - 7 PM"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.chatbot_config);

CREATE TABLE IF NOT EXISTS public.chat_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'lead' CHECK (status IN ('lead','registered','blocked')),
  source text DEFAULT 'chatbot',
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS chat_customers_email_unique
  ON public.chat_customers (lower(email))
  WHERE email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS chat_customers_phone_unique
  ON public.chat_customers (phone)
  WHERE phone IS NOT NULL AND phone <> '';

CREATE TABLE IF NOT EXISTS public.chatbot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.chat_customers(id) ON DELETE SET NULL,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','answered','assigned','closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  intent text DEFAULT 'general',
  source_url text,
  tracking_code text UNIQUE DEFAULT ('CHAT-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  last_question text,
  last_answer text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_customer ON public.chatbot_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_status ON public.chatbot_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_created_at ON public.chatbot_sessions(created_at DESC);

CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.chatbot_sessions(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.chat_customers(id) ON DELETE SET NULL,
  sender text NOT NULL CHECK (sender IN ('user','bot','staff','system')),
  message text NOT NULL,
  answer_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_session ON public.chatbot_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS public.chatbot_training_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'general',
  keywords text[] DEFAULT '{}',
  priority integer DEFAULT 100,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_training_active ON public.chatbot_training_items(is_active, priority);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_chat_customers_updated_at ON public.chat_customers;
CREATE TRIGGER touch_chat_customers_updated_at
BEFORE UPDATE ON public.chat_customers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_chatbot_sessions_updated_at ON public.chatbot_sessions;
CREATE TRIGGER touch_chatbot_sessions_updated_at
BEFORE UPDATE ON public.chatbot_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_chatbot_training_updated_at ON public.chatbot_training_items;
CREATE TRIGGER touch_chatbot_training_updated_at
BEFORE UPDATE ON public.chatbot_training_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.chatbot_answer(
  p_question text,
  p_customer jsonb DEFAULT '{}'::jsonb,
  p_session_id uuid DEFAULT NULL,
  p_source_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_config public.chatbot_config%ROWTYPE;
  v_customer_id uuid;
  v_session_id uuid;
  v_name text := NULLIF(trim(COALESCE(p_customer->>'name', '')), '');
  v_email text := lower(NULLIF(trim(COALESCE(p_customer->>'email', '')), ''));
  v_phone text := NULLIF(trim(COALESCE(p_customer->>'phone', '')), '');
  v_question text := trim(COALESCE(p_question, ''));
  v_intent text := 'general';
  v_training jsonb := '[]'::jsonb;
  v_products jsonb := '[]'::jsonb;
  v_official_prices jsonb := '[]'::jsonb;
  v_store_offers jsonb := '[]'::jsonb;
  v_stores jsonb := '[]'::jsonb;
  v_answer text;
  v_tracking text;
  v_payload jsonb;
BEGIN
  IF v_question = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Question is required');
  END IF;

  SELECT * INTO v_config
  FROM public.chatbot_config
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF NOT COALESCE(v_config.is_active, true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Chat support is currently disabled');
  END IF;

  IF v_question ILIKE ANY (ARRAY['%price%','%cost%','%rate%','%कति%','%मूल्य%','%rs%']) THEN
    v_intent := 'price';
  ELSIF v_question ILIKE ANY (ARRAY['%repair%','%screen%','%battery%','%unlock%','%बनाउन%','%मर्मत%']) THEN
    v_intent := 'repair';
  ELSIF v_question ILIKE ANY (ARRAY['%exchange%','%sell%','%trade%','%बेच%','%साट%']) THEN
    v_intent := 'exchange';
  ELSIF v_question ILIKE ANY (ARRAY['%store%','%shop%','%contact%','%phone%','%location%','%पसल%']) THEN
    v_intent := 'store_contact';
  END IF;

  IF COALESCE(v_config.auto_create_customer, true) THEN
    SELECT id INTO v_customer_id
    FROM public.chat_customers
    WHERE (v_email IS NOT NULL AND lower(email) = v_email)
       OR (v_phone IS NOT NULL AND phone = v_phone)
    ORDER BY last_seen_at DESC
    LIMIT 1;

    IF v_customer_id IS NULL THEN
      INSERT INTO public.chat_customers (auth_user_id, name, email, phone, source, metadata)
      VALUES (auth.uid(), v_name, v_email, v_phone, 'chatbot', jsonb_build_object('source_url', p_source_url))
      RETURNING id INTO v_customer_id;
    ELSE
      UPDATE public.chat_customers
      SET
        auth_user_id = COALESCE(auth_user_id, auth.uid()),
        name = COALESCE(v_name, name),
        email = COALESCE(v_email, email),
        phone = COALESCE(v_phone, phone),
        last_seen_at = now(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('last_source_url', p_source_url)
      WHERE id = v_customer_id;
    END IF;
  END IF;

  IF p_session_id IS NOT NULL THEN
    SELECT id INTO v_session_id FROM public.chatbot_sessions WHERE id = p_session_id LIMIT 1;
  END IF;

  IF v_session_id IS NULL THEN
    INSERT INTO public.chatbot_sessions (customer_id, auth_user_id, status, intent, source_url, last_question)
    VALUES (v_customer_id, auth.uid(), 'open', v_intent, p_source_url, v_question)
    RETURNING id INTO v_session_id;
  ELSE
    UPDATE public.chatbot_sessions
    SET
      customer_id = COALESCE(customer_id, v_customer_id),
      auth_user_id = COALESCE(auth_user_id, auth.uid()),
      status = CASE WHEN status = 'closed' THEN 'open' ELSE status END,
      intent = v_intent,
      source_url = COALESCE(p_source_url, source_url),
      last_question = v_question
    WHERE id = v_session_id;
  END IF;

  INSERT INTO public.chatbot_messages (session_id, customer_id, sender, message)
  VALUES (v_session_id, v_customer_id, 'user', v_question);

  IF COALESCE((v_config.sources_enabled->>'training')::boolean, true) THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.priority ASC, t.updated_at DESC), '[]'::jsonb)
    INTO v_training
    FROM (
      SELECT id, question, answer, category, keywords, priority
      FROM public.chatbot_training_items
      WHERE is_active = true
        AND (
          lower(v_question) LIKE '%' || lower(question) || '%'
          OR lower(question) LIKE '%' || lower(v_question) || '%'
          OR EXISTS (
            SELECT 1 FROM unnest(keywords) k
            WHERE k IS NOT NULL AND lower(v_question) LIKE '%' || lower(k) || '%'
          )
        )
      ORDER BY priority ASC, updated_at DESC
      LIMIT 3
    ) t;
  END IF;

  IF COALESCE((v_config.sources_enabled->>'products')::boolean, true) THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
    INTO v_products
    FROM (
      SELECT id, name AS title, slug, brand, price, price_value, description, in_stock, '/product/' || slug AS href
      FROM public.products
      WHERE name ILIKE '%' || v_question || '%'
         OR COALESCE(brand, '') ILIKE '%' || v_question || '%'
         OR COALESCE(description, '') ILIKE '%' || v_question || '%'
      ORDER BY featured DESC NULLS LAST, updated_at DESC NULLS LAST
      LIMIT 5
    ) p;
  END IF;

  IF COALESCE((v_config.sources_enabled->>'official_prices')::boolean, true)
     AND to_regclass('public.catalog_products') IS NOT NULL THEN
    EXECUTE $sql$
      SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
      FROM (
        SELECT id, name AS title, slug, price_text, price_npr, verified, is_price_list_item, '/mobile-price/' || slug AS href
        FROM public.catalog_products
        WHERE name ILIKE '%' || $1 || '%'
           OR COALESCE(price_text, '') ILIKE '%' || $1 || '%'
        ORDER BY is_price_list_item DESC NULLS LAST, verified DESC NULLS LAST, updated_at DESC NULLS LAST
        LIMIT 5
      ) c
    $sql$ INTO v_official_prices USING v_question;
  END IF;

  IF COALESCE((v_config.sources_enabled->>'store_offers')::boolean, true)
     AND to_regclass('public.store_products') IS NOT NULL THEN
    EXECUTE $sql$
      SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      FROM (
        SELECT sp.id, sp.title, sp.brand, sp.model, sp.variant, sp.condition, sp.price_sale, sp.stock, st.name AS store_name, st.phone AS store_phone, st.location AS store_location
        FROM public.store_products sp
        LEFT JOIN public.stores st ON st.id = sp.store_id
        WHERE COALESCE(sp.status, 'active') = 'active'
          AND (
            sp.title ILIKE '%' || $1 || '%'
            OR COALESCE(sp.brand, '') ILIKE '%' || $1 || '%'
            OR COALESCE(sp.model, '') ILIKE '%' || $1 || '%'
          )
        ORDER BY sp.updated_at DESC NULLS LAST
        LIMIT 5
      ) s
    $sql$ INTO v_store_offers USING v_question;
  END IF;

  IF COALESCE(v_config.show_store_contacts, true) THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(st)), '[]'::jsonb)
    INTO v_stores
    FROM (
      SELECT name, phone, location, '/stores' AS href
      FROM public.stores
      ORDER BY created_at DESC NULLS LAST
      LIMIT 3
    ) st;
  END IF;

  IF jsonb_array_length(v_training) > 0 THEN
    v_answer := v_training->0->>'answer';
  ELSIF jsonb_array_length(v_official_prices) > 0 THEN
    v_answer := 'Official price list मा भेटिएको data तल छ। Final stock/price confirm गर्न store लाई message/call गर्नु राम्रो हुन्छ।';
  ELSIF jsonb_array_length(v_products) > 0 THEN
    v_answer := 'Product भेटियो। तल price, detail र link छ।';
  ELSIF jsonb_array_length(v_store_offers) > 0 THEN
    v_answer := 'Store offer भेटियो। तल store price/contact details छन्।';
  ELSIF jsonb_array_length(v_stores) > 0 AND v_intent = 'store_contact' THEN
    v_answer := 'Tamrakar Complex का केही store contact तल छन्।';
  ELSE
    v_answer := COALESCE(v_config.fallback_message, 'I could not find an exact answer. Our team will contact you soon.');
  END IF;

  UPDATE public.chatbot_sessions
  SET last_answer = v_answer,
      status = CASE WHEN v_answer = COALESCE(v_config.fallback_message, '') THEN 'pending' ELSE 'answered' END
  WHERE id = v_session_id
  RETURNING tracking_code INTO v_tracking;

  v_payload := jsonb_build_object(
    'ok', true,
    'session_id', v_session_id,
    'customer_id', v_customer_id,
    'tracking_code', v_tracking,
    'intent', v_intent,
    'answer', v_answer,
    'training', v_training,
    'products', v_products,
    'official_prices', v_official_prices,
    'store_offers', v_store_offers,
    'stores', v_stores
  );

  INSERT INTO public.chatbot_messages (session_id, customer_id, sender, message, answer_payload)
  VALUES (v_session_id, v_customer_id, 'bot', v_answer, v_payload);

  INSERT INTO public.contact_messages (name, email, subject, message)
  VALUES (
    COALESCE(v_name, 'Chat Customer'),
    COALESCE(v_email, 'chatbot@tamrakarcomplex.com'),
    'chatbot: ' || v_intent,
    jsonb_build_object('question', v_question, 'phone', v_phone, 'session_id', v_session_id, 'tracking_code', v_tracking, 'answer', v_answer)::text
  );

  RETURN v_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_chatbot_admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_customers', (SELECT count(*) FROM public.chat_customers),
    'open_sessions', (SELECT count(*) FROM public.chatbot_sessions WHERE status IN ('open','pending','assigned')),
    'answered_sessions', (SELECT count(*) FROM public.chatbot_sessions WHERE status = 'answered'),
    'training_items', (SELECT count(*) FROM public.chatbot_training_items WHERE is_active = true),
    'today_messages', (SELECT count(*) FROM public.chatbot_messages WHERE created_at >= date_trunc('day', now())),
    'latest_sessions', COALESCE((
      SELECT jsonb_agg(to_jsonb(x))
      FROM (
        SELECT s.id, s.tracking_code, s.status, s.intent, s.last_question, s.last_answer, s.created_at, c.name, c.email, c.phone
        FROM public.chatbot_sessions s
        LEFT JOIN public.chat_customers c ON c.id = s.customer_id
        ORDER BY s.created_at DESC
        LIMIT 20
      ) x
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

INSERT INTO public.chatbot_training_items (question, answer, category, keywords, priority, is_active)
VALUES
('store location', 'Tamrakar Complex is located in New Road, Kathmandu. You can ask for product price, repair, exchange, seller form, store contact and booking support here.', 'store', ARRAY['location','address','new road','tamrakar'], 10, true),
('exchange phone', 'For phone exchange, please share brand, model, storage, battery health, condition, warranty and accessories. Our team will estimate value and staff will confirm the final approved value.', 'exchange', ARRAY['exchange','trade in','sell phone','valuation'], 20, true),
('repair support', 'For repair, please share device brand/model and problem such as screen, battery, charging, software, unlock or water damage. Support will create a request and connect you with the right store.', 'repair', ARRAY['repair','screen','battery','unlock','software'], 30, true),
('official price', 'Official price list is platform-managed data. Store marketplace prices may be different depending on stock, warranty and offer. Ask the model name to check available price data.', 'price', ARRAY['price','cost','rate','official price'], 40, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.stores (name, phone, location)
SELECT 'Tamrakar Official Store', '9800000000', 'New Road, Kathmandu'
WHERE NOT EXISTS (SELECT 1 FROM public.stores);

