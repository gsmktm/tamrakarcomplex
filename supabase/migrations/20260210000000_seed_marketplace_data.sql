
-- Seed data for marketplace listings
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Create a dummy user if none exists
  IF NOT EXISTS (SELECT 1 FROM auth.users) THEN
     INSERT INTO auth.users (id, email)
     VALUES (gen_random_uuid(), 'dummy@example.com')
     RETURNING id INTO v_user_id;
  ELSE
     SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    -- Clean up existing data to ensure we can see new data
    DELETE FROM public.sell_listings WHERE title IN (
      'iPhone 15 Pro Max - 256GB Natural Titanium',
      'Samsung Galaxy S24 Ultra',
      'iPhone 13 - 128GB Blue',
      'OnePlus 12 - 16/512GB',
      'Xiaomi 14 Ultra',
      'iPhone 11 - 64GB Black',
      'Google Pixel 8 Pro',
      'Samsung Galaxy A55 5G',
      'iPhone 14 Pro - Deep Purple',
      'Redmi Note 13 Pro+ 5G',
      'iPhone 12 - 64GB White',
      'iPad Air 5 (M1)',
      'MacBook Air M1',
      'Samsung S23 Ultra',
      'Nothing Phone (2)'
    );

    INSERT INTO public.sell_listings (user_id, title, description, price, condition, category, brand, model, status, location, contact_info, images)
    VALUES
    (v_user_id, 'iPhone X - 64GB', 'Used iPhone X, good condition. Battery health 85%. Face ID working.', 14000, 'used', 'Mobile', 'Apple', 'iPhone X', 'active', 'Sabko Phone, Kathmandu', '9851224784', ARRAY['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80']),
    (v_user_id, 'iPhone 8 - 64GB', 'Used iPhone 8. Home button works perfectly. Minor scratches on back.', 14000, 'used', 'Mobile', 'Apple', 'iPhone 8', 'active', 'Sabko Phone, Kathmandu', '9851224784', ARRAY['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80']),
    (v_user_id, 'iPhone 15 Pro Max', 'Refurbished iPhone 15 Pro Max. 6 months warranty. Like new.', 149999, 'like_new', 'Mobile', 'Apple', 'iPhone 15 Pro Max', 'active', 'Sabko Phone, Kathmandu', '9851224784', ARRAY['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80']),
    (v_user_id, 'iPhone 16 Pro Max', 'Refurbished iPhone 16 Pro Max. 6 months warranty. Like new.', 149999, 'like_new', 'Mobile', 'Apple', 'iPhone 16 Pro Max', 'active', 'Sabko Phone, Kathmandu', '9851224784', ARRAY['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80']),
    (v_user_id, 'OnePlus 12R', 'Used OnePlus 12R. Good condition. Full box.', 49000, 'used', 'Mobile', 'OnePlus', 'OnePlus 12R', 'active', 'Sabko Phone, Kathmandu', '9851224784', ARRAY['https://images.unsplash.com/photo-1669046603348-735997235286?w=800&q=80']),
    (v_user_id, 'OnePlus 5T', 'Used OnePlus 5T. Good for secondary phone.', 12000, 'used', 'Mobile', 'OnePlus', 'OnePlus 5T', 'active', 'Sabko Phone, Kathmandu', '9851224784', ARRAY['https://images.unsplash.com/photo-1669046603348-735997235286?w=800&q=80']),
    (v_user_id, 'Xiaomi 13 Lite', 'Refurbished Xiaomi 13 Lite. 6 months warranty.', 30500, 'like_new', 'Mobile', 'Xiaomi', '13 Lite', 'active', 'Sabko Phone, Kathmandu', '9851224784', ARRAY['https://images.unsplash.com/photo-1598327105666-5b89351aff23?w=800&q=80']),
    (v_user_id, 'Samsung Galaxy S24 Ultra', 'Refurbished Galaxy S24 Ultra. 6 months warranty.', 104999, 'like_new', 'Mobile', 'Samsung', 'Galaxy S24 Ultra', 'active', 'Sabko Phone, Kathmandu', '9851224784', ARRAY['https://images.unsplash.com/photo-1706606992636-c035b530519b?w=800&q=80']),
    (v_user_id, 'iPhone 15 Pro Max - 256GB Natural Titanium', 'Brand new sealed pack. 1 year warranty. Exchange available.', 185000, 'new', 'Mobile', 'Apple', 'iPhone 15 Pro Max', 'active', 'New Road TamrakarComplex , Kathmandu', '9851000001', ARRAY['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80']),
    (v_user_id, 'iPhone 13 - 128GB Blue', '2 years old, battery health 85%. No scratches on screen. Face ID working perfectly.', 55000, 'used', 'Mobile', 'Apple', 'iPhone 13', 'active', 'Lalitpur', '9801000003', ARRAY['https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=800&q=80']),
    (v_user_id, 'OnePlus 12 - 16/512GB', 'Fresh piece, box open only for checking. Green color.', 95000, 'new', 'Mobile', 'OnePlus', 'OnePlus 12', 'active', 'Tamrakar Complex', '9818000004', ARRAY['https://images.unsplash.com/photo-1669046603348-735997235286?w=800&q=80']),
    (v_user_id, 'Xiaomi 14 Ultra', 'Photography kit included. 1 month used. Bill and warranty available.', 120000, 'like_new', 'Mobile', 'Xiaomi', '14 Ultra', 'active', 'Bhaktapur', '9860000005', ARRAY['https://images.unsplash.com/photo-1678911820864-e2c567c655d7?w=800&q=80']),
    (v_user_id, 'iPhone 11 - 64GB Black', 'Display changed (True Tone not working). Battery changed. Good for secondary phone.', 25000, 'fair', 'Mobile', 'Apple', 'iPhone 11', 'active', 'Koteshwor', '9741000006', ARRAY['https://images.unsplash.com/photo-1573148195900-7845dcb9b858?w=800&q=80']),
    (v_user_id, 'Google Pixel 8 Pro', 'Obsidian Black. 128GB. Best camera phone. Imported from US.', 85000, 'used', 'Mobile', 'Google', 'Pixel 8 Pro', 'active', 'Pokhara', '9823000007', ARRAY['https://images.unsplash.com/photo-1696446702347-16008892410a?w=800&q=80']),
    (v_user_id, 'Samsung Galaxy A55 5G', 'Sealed pack. Navy Blue. 8/256GB.', 45000, 'new', 'Mobile', 'Samsung', 'Galaxy A55', 'active', 'Butwal', '9800000008', ARRAY['https://images.unsplash.com/photo-1610945699354-d3353e9f291e?w=800&q=80']),
    (v_user_id, 'iPhone 14 Pro - Deep Purple', '128GB. Battery 92%. Scratchless condition.', 98000, 'used', 'Mobile', 'Apple', 'iPhone 14 Pro', 'active', 'Dharan', '9810000009', ARRAY['https://images.unsplash.com/photo-1663408466313-2d4589969633?w=800&q=80']),
    (v_user_id, 'Redmi Note 13 Pro+ 5G', '200MP Camera. 120W Charging. 3 months old.', 32000, 'used', 'Mobile', 'Xiaomi', 'Redmi Note 13 Pro+', 'active', 'Biratnagar', '9842000010', ARRAY['https://images.unsplash.com/photo-1598327105666-5b89351aff23?w=800&q=80']),
    (v_user_id, 'iPhone 12 - 64GB White', 'Face ID issue. Rest all working fine.', 30000, 'fair', 'Mobile', 'Apple', 'iPhone 12', 'active', 'Kalanki', '9861000011', ARRAY['https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800&q=80']),
    (v_user_id, 'iPad Air 5 (M1)', '64GB WiFi. Space Grey. With Apple Pencil 2.', 65000, 'used', 'Tablet', 'Apple', 'iPad Air 5', 'active', 'Jhamsikhel', '9851000012', ARRAY['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80']),
    (v_user_id, 'MacBook Air M1', '8/256GB. Gold. Cycle count 150. Mint condition.', 82000, 'used', 'Laptop', 'Apple', 'MacBook Air M1', 'active', 'Putalisadak', '9841000013', ARRAY['https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80']),
    (v_user_id, 'Samsung S23 Ultra', 'Green. 12/512GB. Minor dent on bezel.', 95000, 'used', 'Mobile', 'Samsung', 'S23 Ultra', 'active', 'Hetauda', '9800000014', ARRAY['https://images.unsplash.com/photo-1675276326757-c035b530519b?w=800&q=80']),
    (v_user_id, 'Nothing Phone (2)', 'White. 12/256GB. Unique glyph interface.', 55000, 'used', 'Mobile', 'Nothing', 'Phone (2)', 'active', 'Chabahil', '9840000015', ARRAY['https://images.unsplash.com/photo-1690226343548-8e65825d1052?w=800&q=80']);
  END IF;
END $$;
