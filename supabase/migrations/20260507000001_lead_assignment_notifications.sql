-- ============================================================
-- LEAD ASSIGNMENT NOTIFICATIONS
-- Notifies store admins when a lead is assigned to them.
-- ============================================================

CREATE OR REPLACE FUNCTION public.on_lead_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify Store Admin on new assignment
  IF (NEW.assigned_store_id IS NOT NULL AND (OLD.assigned_store_id IS NULL OR OLD.assigned_store_id != NEW.assigned_store_id)) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, store_id, role)
    SELECT 
      sa.user_id, 
      'New Lead Assigned', 
      'A new lead for ' || NEW.brand || ' ' || NEW.model || ' has been assigned to your store.',
      'sell_phone_lead',
      '/storeadmin/leads',
      NEW.assigned_store_id,
      'storeadmin'
    FROM public.store_admins sa
    WHERE sa.store_id = NEW.assigned_store_id
      AND COALESCE(sa.status, 'active') = 'active';
  END IF;

  -- Notify User on status change
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Lead Update: ' || NEW.brand || ' ' || NEW.model,
      'Your lead status is now ' || NEW.status,
      'sell_phone_lead',
      '/user/history'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_lead_assignment_notifications ON public.sell_phone_leads;
CREATE TRIGGER trg_lead_assignment_notifications
AFTER UPDATE ON public.sell_phone_leads
FOR EACH ROW EXECUTE FUNCTION public.on_lead_assignment_change();
