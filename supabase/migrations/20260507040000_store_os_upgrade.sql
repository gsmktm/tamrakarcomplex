-- Migration: Store OS Upgrade Script
-- This script backfills existing stores with SEO slugs, titles, and default packages.

DO $$
DECLARE
    v_store RECORD;
    v_base_slug TEXT;
    v_final_slug TEXT;
    v_counter INTEGER;
    v_free_package_id UUID;
BEGIN
    -- 1. Get the ID of the 'Free' package
    SELECT id INTO v_free_package_id FROM public.store_packages WHERE slug = 'free';

    -- 2. Loop through all existing stores
    FOR v_store IN SELECT id, name FROM public.stores LOOP
        
        -- Generate base slug
        v_base_slug := lower(regexp_replace(v_store.name, '[^a-zA-Z0-9]+', '-', 'g'));
        v_base_slug := trim(both '-' from v_base_slug);
        
        -- Handle potential empty slug from non-latin names
        IF v_base_slug = '' THEN
            v_base_slug := 'store-' || substr(v_store.id::text, 1, 8);
        END IF;

        v_final_slug := v_base_slug;
        v_counter := 1;

        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM public.stores WHERE seo_slug = v_final_slug AND id <> v_store.id) LOOP
            v_counter := v_counter + 1;
            v_final_slug := v_base_slug || '-' || v_counter;
        END LOOP;

        -- Update the store
        UPDATE public.stores
        SET 
            seo_slug = v_final_slug,
            seo_title = v_store.name || ' - Mobile Phones, Repair, Exchange & Accessories in Tamrakar Complex',
            seo_description = 'Visit ' || v_store.name || ' at Tamrakar Complex for mobile phones, accessories, repair service, and phone exchange offers.',
            package_id = COALESCE(package_id, v_free_package_id),
            package_slug = COALESCE(package_slug, 'free'),
            public_status = 'published'
        WHERE id = v_store.id;

    END LOOP;
END $$;
