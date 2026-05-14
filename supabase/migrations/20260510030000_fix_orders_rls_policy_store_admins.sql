-- Fix: RLS Policy for Orders Table - Include store_admins check
-- 
-- Current policy only checks store owner (s.owner_id = auth.uid())
-- but does NOT allow store admins to view orders from their stores.
-- This migration fixes the policy to include both owner AND store_admins.

DROP POLICY IF EXISTS "Store admins can view own store orders" ON public.orders;

CREATE POLICY "Store admins can view own store orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  -- Allow users to see orders from their stores
  -- Either as store owner OR as active store admin
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.stores s ON s.id = oi.store_id
    WHERE oi.order_id = orders.id
      AND (
        -- User is the store owner
        s.owner_id = auth.uid()
        -- OR user is an active store admin for this store
        OR EXISTS (
          SELECT 1 FROM public.store_admins sa
          WHERE sa.store_id = s.id
            AND sa.user_id = auth.uid()
            AND sa.status = 'active'
        )
      )
  )
);

-- Also fix order_items policy if it exists
DROP POLICY IF EXISTS "Store admins can view own order items" ON public.order_items;
CREATE POLICY "Store admins can view own order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = order_items.store_id
      AND (
        -- User is the store owner
        s.owner_id = auth.uid()
        -- OR user is an active store admin for this store
        OR EXISTS (
          SELECT 1 FROM public.store_admins sa
          WHERE sa.store_id = s.id
            AND sa.user_id = auth.uid()
            AND sa.status = 'active'
        )
      )
  )
);

-- Add comment for documentation
COMMENT ON POLICY "Store admins can view own store orders" ON public.orders
IS 'Allows store owners and active store admins to view orders from their stores. Checks both owner_id and store_admins table.';
