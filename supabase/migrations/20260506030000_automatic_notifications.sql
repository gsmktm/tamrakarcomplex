-- ============================================================
-- AUTOMATIC NOTIFICATION TRIGGERS
-- Sends notifications on key platform events.
-- ============================================================

-- 1. Order Notifications
CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify User of status change
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Order Update: #' || LEFT(NEW.id::text, 8),
      'Your order status has been updated to ' || NEW.status,
      'order',
      '/user/orders'
    );
  END IF;

  -- Notify Store of new order
  IF (TG_OP = 'INSERT') THEN
    -- Find stores involved in this order
    INSERT INTO public.notifications (user_id, title, message, type, link, store_id, role)
    SELECT 
      sa.user_id, 
      'New Order Received', 
      'A new order #' || LEFT(NEW.id::text, 8) || ' has been placed for your store.',
      'order',
      '/storeadmin/orders',
      p.store_id,
      'storeadmin'
    FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    JOIN public.store_admins sa ON p.store_id = sa.store_id
    WHERE oi.order_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_notifications ON public.orders;
CREATE TRIGGER trg_order_notifications
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_status_change();

-- 2. Repair Notifications
CREATE OR REPLACE FUNCTION public.on_repair_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify User
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Repair Update: ' || NEW.device_model,
      'Your repair request status is now ' || NEW.status,
      'repair',
      '/user/repairs'
    );
  END IF;

  -- Notify Store Admin on new request
  IF (TG_OP = 'INSERT' AND NEW.store_id IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, store_id, role)
    SELECT 
      sa.user_id, 
      'New Repair Request', 
      'New repair request for ' || NEW.device_model,
      'repair',
      '/storeadmin/repairs',
      NEW.store_id,
      'storeadmin'
    FROM public.store_admins sa
    WHERE sa.store_id = NEW.store_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_repair_notifications ON public.repair_requests;
CREATE TRIGGER trg_repair_notifications
AFTER INSERT OR UPDATE ON public.repair_requests
FOR EACH ROW EXECUTE FUNCTION public.on_repair_status_change();

-- 3. Payout Notifications
CREATE OR REPLACE FUNCTION public.on_payout_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed') THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, store_id, role)
    SELECT 
      sa.user_id, 
      'Payout Completed', 
      'Your payout of Rs.' || NEW.amount || ' has been processed.',
      'payout',
      '/storeadmin/payouts',
      NEW.store_id,
      'storeadmin'
    FROM public.store_admins sa
    WHERE sa.store_id = NEW.store_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_payout_notifications ON public.payouts;
CREATE TRIGGER trg_payout_notifications
AFTER UPDATE ON public.payouts
FOR EACH ROW EXECUTE FUNCTION public.on_payout_status_change();

NOTIFY pgrst, 'reload schema';
