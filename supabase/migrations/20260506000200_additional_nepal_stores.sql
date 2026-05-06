-- 9. Seed Additional Nepal Mobile Stores
-- Based on recent market data and Google search results

DO $$
DECLARE
    store_data JSONB[] := ARRAY[
        '{"name": "Suryabinayak Mobile And IT Solutions", "phone": "986-1909398", "address": "Suryabinayak, Bhaktapur", "zone": "outside"}',
        '{"name": "Mobile World Capital Naxal", "phone": "+977-9851151198", "address": "Naxal-01, Kathmandu", "zone": "outside"}',
        '{"name": "Mobile World Capital Dillibazar", "phone": "+977-9841219587", "address": "Dillibazar-29, Kathmandu", "zone": "outside"}',
        '{"name": "Mobile World Capital Boudha", "address": "Boudha-09, Kathmandu", "zone": "outside"}',
        '{"name": "MARSS Mobile", "address": "Kathmandu, 44600", "zone": "outside"}',
        '{"name": "OGN Traders", "address": "People''s Plaza Khichapokhari, Kathmandu", "zone": "outside"}',
        '{"name": "ANEK Gadgets HUB", "address": "Gongabu, Kathmandu", "zone": "outside"}',
        '{"name": "Panchakumari Mobile Hub", "address": "Kathmandu, Nepal", "zone": "outside"}',
        '{"name": "S.K Mobile Hub", "address": "Tamrakar Complex Shop No 47, Kathmandu", "zone": "inside", "shop_no": "47"}',
        '{"name": "Haatemaalo online shopping & classified", "phone": "9779803150150", "address": "New Road, Kathmandu", "zone": "outside"}',
        '{"name": "Digital Accessories Nepal - DAN", "address": "Bhagwan Bahal, Kathmandu", "zone": "outside"}',
        '{"name": "Chhetrapati Mobile Center", "address": "Thamel Chhetrapati, Kathmandu", "zone": "outside"}',
        '{"name": "Tech Fusion Mobile", "address": "Ring Road, Kathmandu", "zone": "outside"}',
        '{"name": "Devi Electronic Center", "address": "Old Baneshwor, Kathmandu", "zone": "outside"}',
        '{"name": "D. S. Mobile Phone Service", "address": "Bishal Bazar, Kathmandu", "zone": "outside"}',
        '{"name": "Oliz Store", "address": "Kathmandu, Nepal", "zone": "outside"}',
        '{"name": "Apple World Mobile Pvt.Ltd", "address": "Mercantile Plaza Durbarmarga, Kathmandu", "zone": "outside"}',
        '{"name": "KL Mobile Hub", "address": "Kathmandu, Nepal", "zone": "outside"}',
        '{"name": "Hope Mobile International", "address": "Kathmandu, Nepal", "zone": "outside"}',
        '{"name": "Samip Mobile House", "address": "Kathmandu, Nepal", "zone": "outside"}',
        '{"name": "Bishalbazar Store Pvt Ltd", "address": "Naya Sadak, Kathmandu", "zone": "outside"}',
        '{"name": "SMS Mobile House", "address": "Amar Hall Park, Madhyapur Thimi, Bhaktapur", "zone": "outside"}',
        '{"name": "Ai Store Ktm Display Service", "address": "Shop No G6, Parking Mathi, New Road, Kathmandu", "zone": "outside"}',
        '{"name": "Laxmi Electronics", "address": "New Road Gate Market, Kathmandu", "zone": "outside"}',
        '{"name": "Bimal Electronics", "address": "New Road Gate Market, Kathmandu", "zone": "outside"}',
        '{"name": "Nature Mobile", "address": "Kathmandu, Nepal", "zone": "outside"}',
        '{"name": "Ctv Care 33", "address": "New Road Tamrakar Complex, Kathmandu", "zone": "inside", "shop_no": "33"}'
    ];
    store_info JSONB;
    package_type text;
    package_expires timestamptz;
BEGIN
    FOREACH store_info IN ARRAY store_data LOOP
        -- Randomly assign Gold or Diamond (mostly Gold)
        IF random() < 0.3 THEN
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
            shop_no,
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
            store_info->>''zone'',
            CASE WHEN store_info->>''zone'' = ''inside'' THEN ''Tamrakar Complex'' ELSE ''Kathmandu'' END,
            store_info->>''address'',
            store_info->>''phone'',
            store_info->>''shop_no'',
            ''active'',
            true
        )
        ON CONFLICT (slug) DO NOTHING;
    END LOOP;
END $$;
