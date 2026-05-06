-- 10. Seed Top Rated Stores Across Nepal
-- Based on map data and market reviews for Pokhara, Narayangarh, Butwal, etc.

DO $$
DECLARE
    store_data JSONB[] := ARRAY[
        '{"name": "Gadget Plus Stores Pokhara", "phone": "9806770677", "address": "Hallan Chowk, Lakeside, Pokhara", "zone": "outside", "city": "Pokhara"}',
        '{"name": "World Vision Mobile Hub", "address": "Open House Complex, Chiple Dhunga Rd, Pokhara", "zone": "outside", "city": "Pokhara"}',
        '{"name": "Fone Decor", "address": "Pokhara Trade Mall, Pokhara", "zone": "outside", "city": "Pokhara"}',
        '{"name": "NGT Mobiles Narayangarh", "phone": "9860129290", "address": "Indradev Marg, Narayangarh, Chitwan", "zone": "outside", "city": "Narayangarh"}',
        '{"name": "Vision World Gaighat", "phone": "+977354202331", "address": "Gaighat-2, Udayapur", "zone": "outside", "city": "Udayapur"}',
        '{"name": "Safal Gadgets and Mobile", "phone": "9816621340", "address": "Jarebar, Lakeside, Pokhara", "zone": "outside", "city": "Pokhara"}',
        '{"name": "Aryan Mobile Gallery", "address": "Medical Line, Pokhara", "zone": "outside", "city": "Pokhara"}',
        '{"name": "CompuTeX IT Solution", "address": "Rambazar, Pokhara", "zone": "outside", "city": "Pokhara"}',
        '{"name": "Best Buy Pokhara", "phone": "9816100465", "address": "Kharae, Lakeside, Pokhara", "zone": "outside", "city": "Pokhara"}',
        '{"name": "Pashupati Impex Damak", "phone": "+977 9803230671", "address": "Damak, Jhapa", "zone": "outside", "city": "Damak"}',
        '{"name": "Rajmarg Chaurah Butwal Mobiles", "phone": "+977 71540842", "address": "Rajmarg Chaurah, Butwal", "zone": "outside", "city": "Butwal"}',
        '{"name": "Mina Mobile Communication", "phone": "+977 9845135668", "address": "Gaur, Rautahat", "zone": "outside", "city": "Gaur"}',
        '{"name": "Dhangadhi Mobile Center", "address": "Dhangadhi, Kailali", "zone": "outside", "city": "Dhangadhi"}',
        '{"name": "Nepalgunj Mobile World", "phone": "+977 9819532440", "address": "Nepalgunj, Banke", "zone": "outside", "city": "Nepalgunj"}',
        '{"name": "Desire Phones Pokhara", "address": "Pokhara-9, Pokhara", "zone": "outside", "city": "Pokhara"}',
        '{"name": "Apple Care Pokhara", "address": "Pokhara", "zone": "outside", "city": "Pokhara"}',
        '{"name": "iFixit Nepal Pokhara", "address": "Nayabazar Rd, Pokhara", "zone": "outside", "city": "Pokhara"}',
        '{"name": "SB''s Apple Care", "address": "Prithvi Chowk Road, Pokhara", "zone": "outside", "city": "Pokhara"}'
    ];
    store_info JSONB;
    package_type text;
    package_expires timestamptz;
BEGIN
    FOREACH store_info IN ARRAY store_data LOOP
        -- High rated stores get Diamond/Gold more frequently
        IF random() < 0.4 THEN
            package_type := ''diamond'';
        ELSE
            package_type := ''gold'';
        END IF;
        
        -- 90 Days Free trial
        package_expires := now() + interval ''90 days'';
        
        INSERT INTO public.stores (
            name, 
            slug, 
            package_slug, 
            plan_slug,
            subscription_status, 
            subscription_end_date, 
            complex_zone, 
            location,
            address,
            phone,
            status,
            is_verified
        )
        VALUES (
            store_info->>''name'',
            lower(regexp_replace(store_info->>''name'', ''[^a-zA-Z0-9]+'', ''-'', ''g'')),
            package_type,
            package_type,
            ''active'',
            package_expires,
            ''outside'',
            COALESCE(store_info->>''city'', ''Nepal''),
            store_info->>''address'',
            store_info->>''phone'',
            ''active'',
            true
        )
        ON CONFLICT (slug) DO NOTHING;
    END LOOP;
END $$;
