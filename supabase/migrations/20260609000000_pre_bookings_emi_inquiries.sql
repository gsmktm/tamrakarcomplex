-- ─── Pre-Bookings Table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pre_bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name     text NOT NULL,
  phone             text NOT NULL,
  email             text,
  model             text NOT NULL,
  storage           text,
  color             text,
  city              text,
  delivery_option   text DEFAULT 'pickup',
  notes             text,
  status            text NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new','contacted','confirmed','payment_pending','completed','cancelled')),
  payment_status    text DEFAULT 'unpaid',
  admin_note        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── EMI Inquiries Table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emi_inquiries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid REFERENCES products(id) ON DELETE SET NULL,
  store_id          uuid REFERENCES stores(id) ON DELETE SET NULL,
  customer_name     text NOT NULL,
  phone             text NOT NULL,
  email             text,
  product_interest  text,
  down_payment      text,
  preferred_plan    text,
  message           text,
  status            text NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new','contacted','approved','rejected','completed')),
  admin_note        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── Click Events Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS click_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid REFERENCES products(id) ON DELETE SET NULL,
  store_id          uuid REFERENCES stores(id) ON DELETE SET NULL,
  event_type        text NOT NULL,
  source_page       text,
  user_ip           text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── Search Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword           text NOT NULL,
  result_count      int,
  user_ip           text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pre_bookings_status ON pre_bookings(status);
CREATE INDEX IF NOT EXISTS idx_pre_bookings_created ON pre_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emi_inquiries_status ON emi_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_emi_inquiries_created ON emi_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_click_events_type ON click_events(event_type);
CREATE INDEX IF NOT EXISTS idx_click_events_product ON click_events(product_id);
CREATE INDEX IF NOT EXISTS idx_click_events_store ON click_events(store_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_keyword ON search_logs(keyword);

-- ─── Updated_at triggers ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'pre_bookings_updated_at') THEN
    CREATE TRIGGER pre_bookings_updated_at
      BEFORE UPDATE ON pre_bookings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'emi_inquiries_updated_at') THEN
    CREATE TRIGGER emi_inquiries_updated_at
      BEFORE UPDATE ON emi_inquiries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE pre_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emi_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- Public insert (form submissions)
CREATE POLICY "public_insert_pre_bookings" ON pre_bookings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "public_insert_emi_inquiries" ON emi_inquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "public_insert_click_events" ON click_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "public_insert_search_logs" ON search_logs
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admin read/update (service role handles admin API)
CREATE POLICY "admin_all_pre_bookings" ON pre_bookings
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('suadmin','staffadmin','admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('suadmin','staffadmin','admin'));

CREATE POLICY "admin_all_emi_inquiries" ON emi_inquiries
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('suadmin','staffadmin','admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('suadmin','staffadmin','admin'));
