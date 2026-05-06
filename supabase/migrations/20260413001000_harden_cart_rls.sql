-- Migration: Replace session-header-based cart RLS with auth.uid() only.
-- The x-session-id header approach allowed session ID enumeration attacks.
-- The frontend CartContext uses localStorage — DB cart tables are server-side scaffolding.

-- ── Carts table ──────────────────────────────────────────────────────────────

-- Drop existing session-based policies
DROP POLICY IF EXISTS "Users can view their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can insert their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can delete their own cart" ON public.carts;

-- Re-create with auth.uid() only
CREATE POLICY "cart_own_select" ON public.carts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cart_own_insert" ON public.carts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cart_own_update" ON public.carts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "cart_own_delete" ON public.carts
  FOR DELETE USING (auth.uid() = user_id);

-- ── Cart items table ──────────────────────────────────────────────────────────

-- Drop existing session-based policies
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;

-- Re-create via cart ownership subquery
CREATE POLICY "cart_items_select" ON public.cart_items
  FOR SELECT USING (
    cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid())
  );

CREATE POLICY "cart_items_insert" ON public.cart_items
  FOR INSERT WITH CHECK (
    cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid())
  );

CREATE POLICY "cart_items_update" ON public.cart_items
  FOR UPDATE USING (
    cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid())
  );

CREATE POLICY "cart_items_delete" ON public.cart_items
  FOR DELETE USING (
    cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid())
  );
