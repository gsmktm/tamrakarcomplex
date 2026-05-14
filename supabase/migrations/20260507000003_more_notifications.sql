-- ============================================================
-- REPAIR REQUEST NOTIFICATIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.on_repair_request_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify User of status change
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Repair Update: ' || NEW.device_brand || ' ' || NEW.device_model,
      'Your repair request status is now ' || NEW.status,
      'repair',
      '/user/repairs'
    );
  END IF;

  -- Notify Store Admin on new assignment
  IF (NEW.assigned_store_id IS NOT NULL AND (OLD.assigned_store_id IS NULL OR OLD.assigned_store_id != NEW.assigned_store_id)) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, store_id, role)
    SELECT 
      sa.user_id, 
      'New Repair Assigned', 
      'A new repair for ' || NEW.device_brand || ' ' || NEW.device_model || ' has been assigned to your store.',
      'repair',
      '/storeadmin/repairs',
      NEW.assigned_store_id,
      'storeadmin'
    FROM public.store_admins sa
    WHERE sa.store_id = NEW.assigned_store_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_repair_request_notifications ON public.repair_requests;
CREATE TRIGGER trg_repair_request_notifications
AFTER INSERT OR UPDATE ON public.repair_requests
FOR EACH ROW EXECUTE FUNCTION public.on_repair_request_change();

-- ============================================================
-- ORDER NOTIFICATIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.on_order_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify User of status change
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Order Update: #' || NEW.id,
      'Your order status is now ' || NEW.status,
      'order',
      '/user/orders'
    );
  END IF;

  -- Notify Store Admin on new order (if applicable)
  -- Assuming orders have a store_id or we notify based on items
  -- For now, simple notification for platform admins
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, role)
    SELECT 
      ur.user_id, 
      'New Order Received', 
      'Order #' || NEW.id || ' has been placed for Rs. ' || NEW.total_amount,
      'order',
      '/suadmin/orders',
      ur.role::text
    FROM public.user_roles ur
    WHERE ur.role::text IN ('suadmin', 'admin', 'staffadmin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_order_notifications ON public.orders;
CREATE TRIGGER trg_order_notifications
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_change();
