
-- Reassign "Tamrakar Official Store" to the new admin user
DO $$
DECLARE
  v_old_admin_id uuid;
  v_new_admin_id uuid;
  v_store_id uuid;
BEGIN
  -- Get IDs
  SELECT id INTO v_old_admin_id FROM auth.users WHERE email = 'admin@tamrakarcomplex.com';
  SELECT id INTO v_new_admin_id FROM auth.users WHERE email = 'admin@tamrakarcomplex.com';
  
  -- Find the official store (owned by old admin or by name)
  SELECT id INTO v_store_id FROM public.stores 
  WHERE owner_id = v_old_admin_id OR name = 'Tamrakar Official Store'
  LIMIT 1;

  IF v_store_id IS NOT NULL AND v_new_admin_id IS NOT NULL THEN
    -- Update owner and email
    UPDATE public.stores 
    SET owner_id = v_new_admin_id, 
        email = 'admin@tamrakarcomplex.com'
    WHERE id = v_store_id;
  ELSIF v_new_admin_id IS NOT NULL THEN
    -- If store doesn't exist, create it for new admin
    INSERT INTO public.stores (name, location, description, phone, email, owner_id, subscription_status, is_verified)
    VALUES (
      'Tamrakar Official Store', 
      'New Road TamrakarComplex , Kathmandu', 
      'The official store for Tamrakar Complex. Find all our latest products and offers here.', 
      '9800000000', 
      'admin@tamrakarcomplex.com', 
      v_new_admin_id, 
      'active', 
      true
    ) RETURNING id INTO v_store_id;

    -- Create pages
    INSERT INTO public.store_pages (store_id, title, slug, content)
    VALUES 
    (v_store_id, 'Our History', 'history', '<p>We have been serving the community since 2000...</p>'),
    (v_store_id, 'Services', 'services', '<ul><li>Mobile Repair</li><li>Software Update</li><li>Exchange</li></ul>')
    ON CONFLICT (store_id, slug) DO NOTHING;
  END IF;

END $$;
