-- ============================================================
-- FULL STACK REFORM FINAL
-- Adds missing commerce, support, and user tables.
-- ============================================================

-- 1. Coupons & Promotions
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value numeric NOT NULL,
  min_order_amount numeric DEFAULT 0,
  max_discount_amount numeric,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE, -- NULL means platform-wide
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. User Addresses
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home', -- Home, Work, etc.
  full_name text NOT NULL,
  phone text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text,
  postal_code text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. FAQ Categories
CREATE TABLE IF NOT EXISTS public.faq_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4. FAQs
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.faq_categories(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  is_published boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Order Tracking
CREATE TABLE IF NOT EXISTS public.order_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  location text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 6. Product Questions (Q&A)
CREATE TABLE IF NOT EXISTS public.product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text,
  answered_by uuid REFERENCES auth.users(id),
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Refund Requests
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read faq_categories" ON public.faq_categories FOR SELECT USING (true);
CREATE POLICY "Public read faqs" ON public.faqs FOR SELECT USING (is_published = true);
CREATE POLICY "Public read coupons" ON public.coupons FOR SELECT USING (is_active = true AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "Users manage own addresses" ON public.user_addresses FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users read own order_tracking" ON public.order_tracking FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid()));
CREATE POLICY "Users manage own questions" ON public.product_questions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own refunds" ON public.refund_requests FOR ALL USING (user_id = auth.uid());

-- Admin/Suadmin can manage everything
CREATE POLICY "Admins manage all coupons" ON public.coupons FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage all faq_categories" ON public.faq_categories FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage all faqs" ON public.faqs FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage all order_tracking" ON public.order_tracking FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage all product_questions" ON public.product_questions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage all refund_requests" ON public.refund_requests FOR ALL USING (public.is_admin());

-- Seed FAQ Categories
INSERT INTO public.faq_categories (name, slug, icon) VALUES 
('Shopping', 'shopping', 'shopping-bag'),
('Shipping', 'shipping', 'truck'),
('Returns', 'returns', 'refresh-ccw'),
('Payments', 'payments', 'credit-card')
ON CONFLICT (slug) DO NOTHING;

-- Seed some FAQs
INSERT INTO public.faqs (category_id, question, answer) 
SELECT id, 'How do I place an order?', 'Browse our marketplace, add items to your cart, and proceed to checkout.'
FROM public.faq_categories WHERE slug = 'shopping'
LIMIT 1;

NOTIFY pgrst, 'reload schema';
