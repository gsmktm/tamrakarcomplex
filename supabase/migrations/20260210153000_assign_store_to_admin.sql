
-- Assign a store to the admin user for testing
DO $$
DECLARE
  v_user_id uuid;
  v_store_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@tamrakarcomplex.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Check if store already exists for this user, if not create one
    SELECT id INTO v_store_id FROM public.stores WHERE owner_id = v_user_id LIMIT 1;
    
    IF v_store_id IS NULL THEN
      INSERT INTO public.stores (name, location, description, phone, email, owner_id, subscription_status, is_verified)
      VALUES (
        'Tamrakar Official Store', 
        'New Road TamrakarComplex , Kathmandu', 
        'The official store for Tamrakar Complex. Find all our latest products and offers here.', 
        '9800000000', 
        'admin@tamrakarcomplex.com', 
        v_user_id, 
        'active', 
        true
      ) RETURNING id INTO v_store_id;
    ELSE
      -- Ensure it is active
      UPDATE public.stores SET subscription_status = 'active', is_verified = true WHERE id = v_store_id;
    END IF;

    -- Create some dummy pages for this store
    INSERT INTO public.store_pages (store_id, title, slug, content)
    VALUES 
    (v_store_id, 'Our History', 'history', '<p>We have been serving the community since 2000...</p>'),
    (v_store_id, 'Services', 'services', '<ul><li>Mobile Repair</li><li>Software Update</li><li>Exchange</li></ul>')
    ON CONFLICT (store_id, slug) DO NOTHING;
    
  END IF;
END $$;
