-- ============================================================
-- LEAD & EXCHANGE NOTIFICATION TRIGGERS
-- Sends notifications when a customer submits a lead or request.
-- ============================================================

-- 1. Lead/Quote Notifications (Sell/Exchange)
CREATE OR REPLACE FUNCTION public.on_lead_quote_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify Store Admin if a specific store is selected
  IF (NEW.store_id IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, store_id, role)
    SELECT 
      sa.user_id, 
      'New ' || INITCAP(NEW.type) || ' Lead', 
      'A customer requested a ' || NEW.type || ' for ' || (NEW.device->>'brand') || ' ' || (NEW.device->>'model'),
      'lead',
      '/storeadmin/sell-leads',
      NEW.store_id,
      'storeadmin'
    FROM public.store_admins sa
    WHERE sa.store_id = NEW.store_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lead_quote_notifications ON public.leads_quotes;
CREATE TRIGGER trg_lead_quote_notifications
AFTER INSERT ON public.leads_quotes
FOR EACH ROW EXECUTE FUNCTION public.on_lead_quote_insert();

-- 2. Used Listing Notifications (When a customer expresses interest)
-- Note: This requires a 'listing_inquiries' table or similar. 
-- For now, let's just ensure store admins are notified when a new USED listing is assigned to them (if applicable)

-- 3. Inventory Low Stock Notifications
CREATE OR REPLACE FUNCTION public.on_inventory_stock_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.stock_quantity <= 3 AND OLD.stock_quantity > 3) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, store_id, role)
    SELECT 
      sa.user_id, 
      'Low Stock Alert', 
      'Your stock for ' || m.name || ' is low (' || NEW.stock_quantity || ' left).',
      'inventory',
      '/storeadmin/inventory',
      NEW.store_id,
      'storeadmin'
    FROM public.store_admins sa
    JOIN public.phone_models m ON NEW.model_id = m.id
    WHERE sa.store_id = NEW.store_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_inventory_stock_notifications ON public.inventory_items;
CREATE TRIGGER trg_inventory_stock_notifications
AFTER UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.on_inventory_stock_change();

NOTIFY pgrst, 'reload schema';
