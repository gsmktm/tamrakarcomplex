-- Create carts table
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cart_id UUID REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
    total_amount NUMERIC NOT NULL,
    payment_method TEXT, -- esewa, cod
    payment_status TEXT DEFAULT 'pending', -- pending, paid, failed
    shipping_address JSONB,
    contact_info JSONB,
    transaction_id TEXT, -- for esewa refId
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    price NUMERIC NOT NULL, -- snapshot of price at time of order
    product_name TEXT, -- snapshot of name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pre-existing installations may have an earlier orders table without a
-- user_id column. CREATE TABLE IF NOT EXISTS above doesn't add columns to
-- existing tables; normalize the ownership key BEFORE indexes and RLS.
-- This additive correction does not change or delete existing orders.
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON public.carts(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- RLS Policies
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Carts policies
DROP POLICY IF EXISTS "Users can view their own cart" ON public.carts;
CREATE POLICY "Users can view their own cart" ON public.carts
    FOR SELECT USING (auth.uid() = user_id OR session_id = current_setting('request.headers')::json->>'x-session-id');

DROP POLICY IF EXISTS "Users can insert their own cart" ON public.carts;
CREATE POLICY "Users can insert their own cart" ON public.carts
    FOR INSERT WITH CHECK (auth.uid() = user_id OR session_id = current_setting('request.headers')::json->>'x-session-id');

DROP POLICY IF EXISTS "Users can update their own cart" ON public.carts;
CREATE POLICY "Users can update their own cart" ON public.carts
    FOR UPDATE USING (auth.uid() = user_id OR session_id = current_setting('request.headers')::json->>'x-session-id');

-- Cart Items policies
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
CREATE POLICY "Users can view their own cart items" ON public.cart_items
    FOR SELECT USING (
        cart_id IN (
            SELECT id FROM public.carts 
            WHERE user_id = auth.uid() OR session_id = current_setting('request.headers')::json->>'x-session-id'
        )
    );

DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
CREATE POLICY "Users can insert their own cart items" ON public.cart_items
    FOR INSERT WITH CHECK (
        cart_id IN (
            SELECT id FROM public.carts 
            WHERE user_id = auth.uid() OR session_id = current_setting('request.headers')::json->>'x-session-id'
        )
    );

DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
CREATE POLICY "Users can update their own cart items" ON public.cart_items
    FOR UPDATE USING (
        cart_id IN (
            SELECT id FROM public.carts 
            WHERE user_id = auth.uid() OR session_id = current_setting('request.headers')::json->>'x-session-id'
        )
    );

DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;
CREATE POLICY "Users can delete their own cart items" ON public.cart_items
    FOR DELETE USING (
        cart_id IN (
            SELECT id FROM public.carts 
            WHERE user_id = auth.uid() OR session_id = current_setting('request.headers')::json->>'x-session-id'
        )
    );

-- Orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
CREATE POLICY "Users can insert their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL); -- Allow guest checkout creation

-- Order Items policies
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items" ON public.order_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM public.orders WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;
CREATE POLICY "Users can insert their own order items" ON public.order_items
    FOR INSERT WITH CHECK (
        order_id IN (
            SELECT id FROM public.orders WHERE user_id = auth.uid() OR user_id IS NULL
        )
    );
