-- ============================================================
-- UNLOCK REQUEST NOTIFICATIONS
-- Sends notifications on unlock request events.
-- ============================================================

CREATE OR REPLACE FUNCTION public.on_unlock_request_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify User of status change
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Unlock Update: ' || NEW.brand || ' ' || NEW.model,
      'Your unlock request status is now ' || NEW.status,
      'unlock',
      '/user/unlocking'
    );
  END IF;

  -- Notify Store Admin on new request
  IF (TG_OP = 'INSERT' AND NEW.assigned_store_id IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, store_id, role)
    SELECT 
      sa.user_id, 
      'New Unlock Request', 
      'New unlock request for ' || NEW.brand || ' ' || NEW.model,
      'unlock',
      '/storeadmin/unlocking',
      NEW.assigned_store_id,
      'storeadmin'
    FROM public.store_admins sa
    WHERE sa.store_id = NEW.assigned_store_id;
  END IF;

  -- Notify Admins on new unassigned request
  IF (TG_OP = 'INSERT' AND NEW.assigned_store_id IS NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, role)
    SELECT 
      ur.user_id, 
      'Platform: New Unlock Request', 
      'A new unlock request was submitted for ' || NEW.brand || ' ' || NEW.model,
      'unlock',
      '/suadmin/unlocking',
      ur.role::text
    FROM public.user_roles ur
    WHERE ur.role::text IN ('suadmin', 'staffadmin', 'admin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_unlock_request_notifications ON public.unlock_requests;
CREATE TRIGGER trg_unlock_request_notifications
AFTER INSERT OR UPDATE ON public.unlock_requests
FOR EACH ROW EXECUTE FUNCTION public.on_unlock_request_change();
