-- ============================================================
-- FULL STACK LOGIC & TRIGGERS
-- Automates reviews, stock, analytics, and notifications.
-- ============================================================

-- 1. Product Review Aggregator
-- Updates product.rating and product.reviews_count automatically
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE public.products
    SET 
      rating = (SELECT COALESCE(AVG(rating), 0) FROM public.product_reviews WHERE product_id = NEW.product_id),
      reviews_count = (SELECT COUNT(*) FROM public.product_reviews WHERE product_id = NEW.product_id)
    WHERE id = NEW.product_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.products
    SET 
      rating = (SELECT COALESCE(AVG(rating), 0) FROM public.product_reviews WHERE product_id = OLD.product_id),
      reviews_count = (SELECT COUNT(*) FROM public.product_reviews WHERE product_id = OLD.product_id)
    WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_product_rating ON public.product_reviews;
CREATE TRIGGER trg_update_product_rating
AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

-- 2. Inventory / Stock Management
-- Deducts stock when an order item is created
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct from products table (simple mode)
  UPDATE public.products
  SET in_stock = CASE WHEN (reviews_count - NEW.quantity) <= 0 THEN false ELSE true END
  WHERE id = NEW.product_id;

  -- Deduct from inventory_items if exists (advanced mode)
  -- Note: Using dynamic SQL or check to avoid errors if table doesn't exist yet in some environments
  BEGIN
    UPDATE public.inventory_items
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE variant_id = (SELECT variant_id FROM public.order_items WHERE id = NEW.id LIMIT 1);
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_deduct_stock_on_order ON public.order_items;
CREATE TRIGGER trg_deduct_stock_on_order
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_order();

-- 3. Store Analytics & Revenue Triggers
-- Updates store metrics on key events
CREATE OR REPLACE FUNCTION public.update_store_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_TABLE_NAME = 'orders' AND NEW.status = 'completed') THEN
    -- Update store revenue for each product in the order
    UPDATE public.stores
    SET 
      total_sales = total_sales + 1,
      total_revenue = total_revenue + (SELECT SUM(total) FROM public.order_items WHERE order_id = NEW.id)
    WHERE id IN (SELECT store_id FROM public.products WHERE id IN (SELECT product_id FROM public.order_items WHERE order_id = NEW.id));
  ELSIF (TG_TABLE_NAME = 'leads') THEN
    UPDATE public.stores SET leads_count = COALESCE(leads_count, 0) + 1 WHERE id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Notification Fan-out RPC
-- Unified way to send notifications from SQL
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'system',
  p_link text DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_role text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link, store_id, role)
  VALUES (p_user_id, p_title, p_message, p_type, p_link, p_store_id, p_role)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Global Admin Search RPC
-- Searches users, stores, orders, and products in one go
CREATE OR REPLACE FUNCTION public.admin_global_search(p_query text)
RETURNS TABLE (
  category text,
  id uuid,
  title text,
  subtitle text,
  link text,
  status text
) AS $$
BEGIN
  -- Search Users
  RETURN QUERY
  SELECT 
    'user'::text, 
    user_id as id, 
    display_name as title, 
    bio as subtitle,
    '/suadmin/users/' || user_id as link,
    'active'::text as status
  FROM public.profiles
  WHERE display_name ILIKE '%' || p_query || '%'
  LIMIT 5;

  -- Search Stores
  RETURN QUERY
  SELECT 
    'store'::text, 
    id, 
    name as title, 
    slug as subtitle,
    '/suadmin/stores/' || id as link,
    status
  FROM public.stores
  WHERE name ILIKE '%' || p_query || '%' OR slug ILIKE '%' || p_query || '%'
  LIMIT 5;

  -- Search Products
  RETURN QUERY
  SELECT 
    'product'::text, 
    id, 
    name as title, 
    brand as subtitle,
    '/suadmin/products/' || id as link,
    'published'::text
  FROM public.products
  WHERE name ILIKE '%' || p_query || '%' OR brand ILIKE '%' || p_query || '%'
  LIMIT 5;

  -- Search Orders
  RETURN QUERY
  SELECT 
    'order'::text, 
    id, 
    'Order #' || id::text as title, 
    'Amount: ' || total_amount::text as subtitle,
    '/suadmin/orders/' || id as link,
    status
  FROM public.orders
  WHERE id::text ILIKE '%' || p_query || '%'
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. SEO Automation
-- Auto-create SEO entries for new products and stores
CREATE OR REPLACE FUNCTION public.sync_seo_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_path text;
  v_title text;
  v_desc text;
BEGIN
  IF (TG_TABLE_NAME = 'products') THEN
    v_path := '/product/' || NEW.slug;
    v_title := NEW.name || ' Price in Nepal | Tamrakar Complex';
    v_desc := 'Buy ' || NEW.name || ' at best price in Nepal. ' || COALESCE(NEW.description, '');
  ELSIF (TG_TABLE_NAME = 'stores') THEN
    v_path := '/stores/' || NEW.slug;
    v_title := NEW.name || ' - Authorized Store at Tamrakar Complex';
    v_desc := 'Visit ' || NEW.name || ' at Tamrakar Complex. ' || COALESCE(NEW.description, '');
  END IF;

  INSERT INTO public.seo_pages (path, title, description)
  VALUES (v_path, v_title, LEFT(v_desc, 160))
  ON CONFLICT (path) DO UPDATE
  SET title = EXCLUDED.title, description = EXCLUDED.description;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_product_seo ON public.products;
CREATE TRIGGER trg_sync_product_seo
AFTER INSERT OR UPDATE OF name, slug, description ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_seo_entry();

DROP TRIGGER IF EXISTS trg_sync_store_seo ON public.stores;
CREATE TRIGGER trg_sync_store_seo
AFTER INSERT OR UPDATE OF name, slug, description ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.sync_seo_entry();

-- 7. Maintenance: Cleanup Old Data
CREATE OR REPLACE FUNCTION public.cleanup_maintenance_tasks()
RETURNS void AS $$
BEGIN
  -- Delete empty guest carts older than 7 days
  DELETE FROM public.carts WHERE user_id IS NULL AND updated_at < now() - interval '7 days';
  
  -- Delete unread system notifications older than 30 days
  DELETE FROM public.notifications WHERE read_at IS NULL AND type = 'system' AND created_at < now() - interval '30 days';
  
  -- Archive expired coupons
  UPDATE public.coupons SET is_active = false WHERE ends_at < now() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

NOTIFY pgrst, 'reload schema';
